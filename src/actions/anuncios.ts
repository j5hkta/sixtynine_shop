"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { entero, primerError, sinEtiquetas } from "@/lib/validacion";

/** Posicion maxima en la barra. */
const ORDEN_MAXIMO = 999;

/**
 * Esquema del alta de anuncio.
 *
 * `texto` usa `sinEtiquetas`: la barra es una frase corta de marketing y no
 * tiene ninguna razon legitima para llevar marcado. Rechazarlo aqui mantiene
 * el dato limpio aunque React ya lo escaparia al pintarlo.
 *
 * `url_destino` solo admite rutas internas. Sin esa regla, quien entre al panel
 * podria convertir la barra que corona TODAS las paginas en un enlace a un
 * dominio ajeno. `//evil.com` es protocolo-relativo y sale del sitio igual que
 * `https://`, por eso se descarta aparte.
 */
const esquemaAnuncio = z.object({
  texto: sinEtiquetas(120).pipe(
    z.string().min(3, "escribe el texto del anuncio"),
  ),
  url_destino: sinEtiquetas(300)
    .optional()
    .default("")
    .refine(
      (valor) =>
        valor === "" || (valor.startsWith("/") && !valor.startsWith("//")),
      {
        message:
          "debe ser una ruta interna que empiece por una barra, por ejemplo /productos, o quedar vacio",
      },
    )
    .transform((valor) => (valor === "" ? null : valor)),
  orden: z
    .union([z.literal(""), entero(ORDEN_MAXIMO)])
    .optional()
    .default(0)
    .transform((valor) => (valor === "" ? 0 : valor)),
});

/** Solo el orden; el id viaja por `bind`, fuera del formulario. */
const esquemaOrden = z.object({ orden: entero(ORDEN_MAXIMO) });

const PANEL = "/admin/apariencia";

export type Anuncio = Database["public"]["Tables"]["anuncios"]["Row"];

export type ResultadoAnuncios =
  { ok: true; anuncios: Anuncio[] } | { ok: false; error: string };

export type ResultadoAnuncio =
  { exito: true } | { exito: false; error: string };

function volverConError(mensaje: string): never {
  redirect(`${PANEL}?error=${encodeURIComponent(mensaje)}`);
}

/**
 * La barra vive en el layout de la tienda, así que corona TODAS las rutas
 * públicas, no sólo la portada: hay que invalidar el layout entero y no una
 * página suelta.
 */
function refrescarTienda() {
  revalidatePath("/", "layout");
  revalidatePath(PANEL);
}

export async function obtenerAnuncios(): Promise<ResultadoAnuncios> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });

  if (error) {
    console.error("[anuncios] Error al listar:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, anuncios: data ?? [] };
}

export async function crearAnuncio(formData: FormData) {
  const validado = esquemaAnuncio.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!validado.success) {
    volverConError(primerError(validado.error));
  }

  const { texto: mensaje, url_destino: url, orden } = validado.data;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anuncios")
    .insert({ texto: mensaje, url_destino: url, orden, activo: true })
    .select("id");

  if (error) {
    console.error("[anuncios] Error al crear:", error);
    volverConError(`No se pudo crear el anuncio: ${error.message}`);
  }

  if (!data || data.length === 0) {
    volverConError(
      "No se creó el anuncio: tu cuenta no tiene permisos o falta ejecutar marketing_descuentos.sql.",
    );
  }

  refrescarTienda();
  redirect(`${PANEL}?guardado=1`);
}

/** Se usa con `.bind(null, id)`: el identificador no viaja en el formulario. */
export async function actualizarOrdenAnuncio(id: string, formData: FormData) {
  if (!z.uuid().safeParse(id).success) {
    volverConError("Falta el identificador del anuncio.");
  }

  const validado = esquemaOrden.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!validado.success) {
    volverConError(`El orden ${primerError(validado.error)}.`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anuncios")
    .update({ orden: validado.data.orden })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[anuncios] Error al reordenar:", error);
    volverConError(`No se pudo guardar el orden: ${error.message}`);
  }

  if (!data || data.length === 0) {
    volverConError(
      "No se guardó el orden: el anuncio no existe o tu cuenta no tiene permisos.",
    );
  }

  refrescarTienda();
  redirect(`${PANEL}?guardado=1`);
}

/**
 * Publica u oculta un anuncio. Ver la nota sobre `estadoActual` en
 * `alternarEstadoBanner`: puede llegar obsoleto si hay dos pestañas abiertas.
 */
export async function alternarEstadoAnuncio(
  id: string,
  estadoActual: boolean,
): Promise<ResultadoAnuncio> {
  if (!z.uuid().safeParse(id).success) {
    return { exito: false, error: "Falta el identificador del anuncio." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anuncios")
    .update({ activo: !estadoActual })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[anuncios] Error al cambiar el estado:", error);
    return {
      exito: false,
      error: `No se pudo cambiar el estado: ${error.message}`,
    };
  }

  if (!data || data.length === 0) {
    return {
      exito: false,
      error:
        "No se guardó: el anuncio no existe o tu cuenta no tiene permisos.",
    };
  }

  refrescarTienda();
  return { exito: true };
}

/**
 * Baja de anuncio. Devuelve el fallo como dato: un `throw` desde una Server
 * Action llega al navegador como el error genérico #441 de React.
 */
export async function eliminarAnuncio(id: string): Promise<ResultadoAnuncio> {
  if (!z.uuid().safeParse(id).success) {
    return { exito: false, error: "Falta el identificador del anuncio." };
  }

  const supabase = await createClient();

  // Un DELETE filtrado por RLS no da error, sólo devuelve cero filas.
  const { data, error } = await supabase
    .from("anuncios")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[anuncios] Error al eliminar:", error);
    return {
      exito: false,
      error: `No se pudo eliminar el anuncio: ${error.message}`,
    };
  }

  if (!data || data.length === 0) {
    return {
      exito: false,
      error:
        "No se eliminó: el anuncio no existe o tu cuenta no tiene permisos.",
    };
  }

  refrescarTienda();
  return { exito: true };
}
