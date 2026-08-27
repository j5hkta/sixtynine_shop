import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase/types";

export const BUCKET = "productos";
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024; // Igual que el límite del bucket.

/** Extensión por MIME. Sirve también de lista blanca de formatos aceptados. */
export const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export type ResultadoSubida = {
  urls: string[];
  errores: string[];
};

/**
 * Extrae los archivos reales de un campo `<input type="file">`.
 *
 * Un input sin selección envía un File vacío, no nada, así que hay que
 * filtrarlo o se intentaría subir un archivo de 0 bytes.
 */
export function archivosDeFormData(formData: FormData, campo: string): File[] {
  return formData
    .getAll(campo)
    .filter((valor): valor is File => valor instanceof File && valor.size > 0);
}

/**
 * Sube cada archivo a Storage como un objeto independiente y devuelve sus URLs
 * públicas.
 *
 * Deduplicación: se calcula el SHA-256 del contenido y se usa como nombre del
 * objeto. Eso descarta los duplicados de la misma petición aunque lleguen con
 * nombres de archivo distintos (comparar por `name` no lo detectaría), y hace
 * la operación idempotente entre peticiones: volver a subir la misma imagen
 * apunta al mismo objeto en vez de crear una copia huérfana.
 *
 * Compartida por el alta/edición de productos y por la gestión del banner.
 */
export async function subirImagenes(
  supabase: SupabaseClient<Database>,
  archivos: File[],
): Promise<ResultadoSubida> {
  const urls: string[] = [];
  const errores: string[] = [];
  const hashesVistos = new Set<string>();

  for (const archivo of archivos) {
    const extension = EXTENSION_POR_MIME[archivo.type];

    if (!extension) {
      errores.push(
        `"${archivo.name}": formato no admitido (${archivo.type || "desconocido"}).`,
      );
      continue;
    }

    if (archivo.size > MAX_BYTES_IMAGEN) {
      errores.push(
        `"${archivo.name}": pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo es 5 MB.`,
      );
      continue;
    }

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");

    if (hashesVistos.has(hash)) {
      // Duplicado exacto dentro de esta misma petición: se ignora en silencio.
      continue;
    }
    hashesVistos.add(hash);

    const ruta = `${hash}.${extension}`;

    // Una llamada por archivo: cada imagen es un objeto separado en el bucket.
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, bytes, {
      contentType: archivo.type,
      cacheControl: "31536000",
      // El nombre es el hash del contenido, así que sobrescribir es escribir
      // exactamente los mismos bytes.
      upsert: true,
    });

    if (error) {
      console.error("[storage] Error al subir imagen:", archivo.name, error);
      errores.push(`"${archivo.name}": ${error.message}`);
      continue;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
    urls.push(data.publicUrl);
  }

  return { urls, errores };
}
