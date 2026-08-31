"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const PANEL = "/admin/apariencia";

export type Anuncio = Database["public"]["Tables"]["anuncios"]["Row"];

export type ResultadoAnuncios =
  { ok: true; anuncios: Anuncio[] } | { ok: false; error: string };

export type ResultadoAnuncio =
  { exito: true } | { exito: false; error: string };

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

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

/**
 * Sólo rutas internas.
 *
 * Sin esta comprobación, quien entre al panel podría convertir la barra que
 * corona todas las páginas en un enlace a un dominio ajeno. `//evil.com` es un
 * enlace protocolo-relativo y sale de la web igual que `https://`, por eso se
 * descarta aparte. La restricción `anuncios_url_interna` repite la regla en la
 * base, para las ediciones hechas desde el dashboard de Supabase.
 */
function normalizarUrl(valor: string): string | null | undefined {
  if (valor === "") return null;
  if (!valor.startsWith("/") || valor.startsWith("//")) return undefined;
  return valor;
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
  const mensaje = texto(formData, "texto");

  if (mensaje.length < 3) {
    volverConError("Escribe el texto del anuncio.");
  }

  // La barra es una sola línea y no hace scroll: un texto largo se corta o
  // parte el diseño en móvil. Se limita aquí antes de guardarlo.
  if (mensaje.length > 120) {
    volverConError(
      "El anuncio es demasiado largo. Máximo 120 caracteres para que quepa en la barra.",
    );
  }

  const url = normalizarUrl(texto(formData, "url_destino"));

  if (url === undefined) {
    volverConError(
      "El enlace debe ser una ruta interna que empiece por «/», por ejemplo /productos. Déjalo vacío si el anuncio no lleva a ningún sitio.",
    );
  }

  const ordenCrudo = Number.parseInt(texto(formData, "orden"), 10);
  const orden = Number.isFinite(ordenCrudo)
    ? Math.min(Math.max(ordenCrudo, 0), 999)
    : 0;

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
  if (!id) {
    volverConError("Falta el identificador del anuncio.");
  }

  const ordenCrudo = Number.parseInt(texto(formData, "orden"), 10);

  if (!Number.isFinite(ordenCrudo)) {
    volverConError("El orden debe ser un número.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("anuncios")
    .update({ orden: Math.min(Math.max(ordenCrudo, 0), 999) })
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
  if (!id) {
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
  if (!id) {
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
