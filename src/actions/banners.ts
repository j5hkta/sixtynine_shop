"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { DESTINO_TODO, esDestinoValido } from "@/lib/banners";
import { archivosDeFormData, subirImagenes } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { entero, primerError, textoCorto } from "@/lib/validacion";

/** Posición máxima. Las franjas se ordenan por este número. */
const ORDEN_MAXIMO = 999;

/**
 * Esquema del alta de banner.
 *
 * `categoria` se valida contra `CATEGORIAS` mediante `esDestinoValido`, no con
 * un `z.enum` escrito aquí: la lista viva está en `src/lib/categorias.ts` y
 * duplicarla sería la clase de lista doble que acaba desincronizada.
 */
const esquemaBanner = z.object({
  categoria: textoCorto(60)
    .default(DESTINO_TODO)
    .refine(esDestinoValido, { message: "destino no válido" }),
  orden: z
    .union([z.literal(""), entero(ORDEN_MAXIMO)])
    .optional()
    .default(0)
    .transform((valor) => (valor === "" ? 0 : valor)),
});

/** Sólo el orden; el id viaja por `bind`, fuera del formulario. */
const esquemaOrden = z.object({ orden: entero(ORDEN_MAXIMO) });

const PANEL = "/admin/apariencia";

export type Banner = Database["public"]["Tables"]["banners"]["Row"];

export type ResultadoBanners =
  | { ok: true; banners: Banner[] }
  | { ok: false; error: string };

export type ResultadoBorrado = { ok: true } | { ok: false; error: string };

export type ResultadoEstado =
  | { exito: true }
  | { exito: false; error: string };

function volverConError(mensaje: string): never {
  redirect(`${PANEL}?error=${encodeURIComponent(mensaje)}`);
}

/**
 * La portada es estática con ISR (`revalidate = 60`). Sin esto, un banner
 * nuevo tardaría hasta un minuto en aparecer y daría la sensación de que el
 * panel no ha guardado nada.
 */
function refrescarPortada() {
  revalidatePath("/", "page");
  revalidatePath(PANEL);
}

/**
 * Lista de banners para el panel.
 *
 * Devuelve TODOS los que la sesión pueda ver, no sólo los activos: la política
 * "Admins ven todos los banners" de `supabase/banners.sql` se suma a la de
 * lectura pública, así que un administrador recibe también los desactivados.
 * Un visitante anónimo que llamara a esta acción sólo obtendría los activos,
 * que es exactamente lo que ya se ve en la portada.
 *
 * La portada NO usa esta función: usa el cliente anónimo directamente para no
 * leer cookies, que la volverían dinámica y le harían perder el ISR.
 */
export async function obtenerBanners(): Promise<ResultadoBanners> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });

  if (error) {
    console.error("[banners] Error al listar:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, banners: data ?? [] };
}

/**
 * Alta de banner: sube la imagen y crea la fila.
 *
 * La imagen es obligatoria — un banner sin imagen no pinta nada— y se sube con
 * el mismo `subirImagenes` que los productos, así que hereda su lista blanca de
 * formatos, el límite de 5 MB y la deduplicación por hash de contenido.
 */
export async function crearBanner(formData: FormData) {
  const validado = esquemaBanner.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!validado.success) {
    volverConError(primerError(validado.error));
  }

  const { categoria, orden } = validado.data;

  const archivos = archivosDeFormData(formData, "imagen_upload");

  if (archivos.length === 0) {
    volverConError("Selecciona la imagen del banner.");
  }

  const supabase = await createClient();

  // Sólo el primero: cada banner es una imagen.
  const { urls, errores } = await subirImagenes(supabase, [archivos[0]]);

  if (errores.length > 0) {
    volverConError(`No se pudo subir la imagen. ${errores.join(" ")}`);
  }

  if (!urls[0]) {
    volverConError("No se pudo subir la imagen. Inténtalo de nuevo.");
  }

  // El `.select()` distingue "insertado" de "RLS lo descartó". En un INSERT la
  // violación de `with check` sí lanza (42501), pero se comprueba igual por
  // coherencia con el resto de acciones del panel.
  const { data, error } = await supabase
    .from("banners")
    .insert({ imagen_url: urls[0], categoria, orden, activo: true })
    .select("id");

  if (error) {
    console.error("[banners] Error al crear:", error);
    volverConError(`No se pudo crear el banner: ${error.message}`);
  }

  if (!data || data.length === 0) {
    volverConError(
      "No se creó el banner: tu cuenta no tiene permisos o falta ejecutar banners.sql.",
    );
  }

  refrescarPortada();
  redirect(`${PANEL}?guardado=1`);
}

/**
 * Cambia la posición de un banner en el carrusel.
 *
 * Se usa con `.bind(null, id)` desde el panel, de modo que el identificador
 * viaja en el closure del servidor y no en un campo del formulario que
 * cualquiera podría reescribir.
 */
export async function actualizarOrden(id: string, formData: FormData) {
  if (!z.uuid().safeParse(id).success) {
    volverConError("Falta el identificador del banner.");
  }

  const validado = esquemaOrden.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!validado.success) {
    volverConError(`El orden ${primerError(validado.error)}.`);
  }

  const { orden } = validado.data;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("banners")
    .update({ orden })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[banners] Error al reordenar:", error);
    volverConError(`No se pudo guardar el orden: ${error.message}`);
  }

  // Un UPDATE bloqueado por la cláusula `using` de RLS no lanza: devuelve cero
  // filas. Sin esta comprobación, una cuenta sin permisos vería "guardado".
  if (!data || data.length === 0) {
    volverConError(
      "No se guardó el orden: el banner no existe o tu cuenta no tiene permisos.",
    );
  }

  refrescarPortada();
  redirect(`${PANEL}?guardado=1`);
}

/**
 * Baja de banner.
 *
 * Devuelve el fallo como DATO en lugar de lanzarlo: un `throw` desde una Server
 * Action llega al navegador como el error genérico #441 de React, que en
 * producción borra el mensaje.
 *
 * No se borra el objeto de Storage. Los nombres son el hash del contenido, así
 * que la misma imagen subida como banner y como foto de producto es UN solo
 * objeto: borrarlo aquí dejaría la ficha del producto sin foto.
 */
export async function eliminarBanner(id: string): Promise<ResultadoBorrado> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Falta el identificador del banner." };
  }

  const supabase = await createClient();

  // Igual que en productos: un DELETE filtrado por RLS no da error, sólo
  // devuelve cero filas.
  const { data, error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[banners] Error al eliminar:", error);
    return { ok: false, error: `No se pudo eliminar el banner: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "No se eliminó: el banner no existe o tu cuenta no tiene permisos.",
    };
  }

  refrescarPortada();
  return { ok: true };
}

/**
 * Publica u oculta un banner sin borrarlo.
 *
 * Un banner oculto sigue en la tabla y en Storage, pero la política de lectura
 * pública de `supabase/banners.sql` filtra por `activo`, así que desaparece de
 * la portada para todo el mundo salvo para el panel. Es la vía para preparar
 * una promoción con antelación o retirar una campaña que quizá vuelva.
 *
 * `estadoActual` llega desde el navegador, así que puede venir obsoleto si hay
 * dos pestañas abiertas: en ese caso el clic escribe el valor contrario al que
 * el administrador ve. No se corrige leyendo primero la fila porque haría falta
 * un bloqueo para que sirviera de algo, y la lista se refresca al terminar.
 */
export async function alternarEstadoBanner(
  id: string,
  estadoActual: boolean,
): Promise<ResultadoEstado> {
  if (!z.uuid().safeParse(id).success) {
    return { exito: false, error: "Falta el identificador del banner." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("banners")
    .update({ activo: !estadoActual })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[banners] Error al cambiar el estado:", error);
    return {
      exito: false,
      error: `No se pudo cambiar el estado: ${error.message}`,
    };
  }

  // Igual que en el resto del panel: un UPDATE que RLS descarta no da error,
  // devuelve cero filas. Sin esto, una cuenta sin permisos vería el cambio
  // aplicado en pantalla y nada guardado.
  if (!data || data.length === 0) {
    return {
      exito: false,
      error: "No se guardó: el banner no existe o tu cuenta no tiene permisos.",
    };
  }

  refrescarPortada();
  return { exito: true };
}
