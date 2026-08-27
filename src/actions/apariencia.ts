"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archivosDeFormData, subirImagenes } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const PANEL = "/admin/apariencia";

/** La tabla `configuracion_tienda` tiene una sola fila, siempre con id = 1. */
const FILA_CONFIG = 1;

type ConfigUpdate =
  Database["public"]["Tables"]["configuracion_tienda"]["Update"];

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function volverConError(mensaje: string): never {
  redirect(`${PANEL}?error=${encodeURIComponent(mensaje)}`);
}

/**
 * Sólo se aceptan rutas internas. Un `banner_link` con `https://otro-sitio.com`
 * convertiría el banner de la portada en un enlace saliente que cualquiera con
 * acceso al panel podría apuntar donde quisiera.
 */
function validarLink(valor: string): string | null {
  if (!valor) return "/productos";
  if (!valor.startsWith("/") || valor.startsWith("//")) {
    return null;
  }
  return valor;
}

/**
 * Guarda la configuración del banner de la portada.
 *
 * La imagen es opcional: si no se sube ninguna, se conserva la que ya estaba.
 * Se reutiliza el bucket `productos` y el mismo `subirImagenes` que el alta de
 * productos, así que hereda su validación de tipo/tamaño y su deduplicación
 * por hash de contenido.
 */
export async function actualizarApariencia(formData: FormData) {
  const link = validarLink(texto(formData, "banner_link"));

  if (link === null) {
    volverConError(
      "El enlace debe ser una ruta interna que empiece por «/», por ejemplo /productos?categoria=Tablas.",
    );
  }

  const supabase = await createClient();

  const cambios: ConfigUpdate = { banner_link: link };

  const archivos = archivosDeFormData(formData, "banner_upload");

  if (archivos.length > 0) {
    // Sólo se usa el primero: el banner es una única imagen.
    const { urls, errores } = await subirImagenes(supabase, [archivos[0]]);

    if (errores.length > 0) {
      volverConError(`No se pudo subir la imagen. ${errores.join(" ")}`);
    }

    if (urls[0]) {
      cambios.banner_imagen = urls[0];
    }
  }

  // Igual que en productos y pedidos: si la política RLS filtra la fila, el
  // UPDATE no lanza error, simplemente no encuentra nada. El `.select()` es la
  // única forma de distinguir "guardado" de "no tenías permiso".
  const { data, error } = await supabase
    .from("configuracion_tienda")
    .update(cambios)
    .eq("id", FILA_CONFIG)
    .select("id");

  if (error) {
    console.error("[apariencia] Error al guardar:", error);
    volverConError(`No se pudo guardar: ${error.message}`);
  }

  if (!data || data.length === 0) {
    volverConError(
      "No se guardaron los cambios: tu cuenta no tiene permisos o falta ejecutar apariencia_schema.sql.",
    );
  }

  // La portada es estática con ISR: sin esto, el banner nuevo no aparecería
  // hasta que expirara la revalidación de 60 s.
  revalidatePath("/", "page");
  revalidatePath(PANEL);

  redirect(`${PANEL}?guardado=1`);
}
