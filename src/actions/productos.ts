"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  EstadoProducto,
  ProductoInsert,
  ProductoUpdate,
} from "@/lib/supabase/types";

const LISTADO = "/admin/productos";
const FORMULARIO_NUEVO = "/admin/productos/nuevo";

const BUCKET = "productos";
const MAX_BYTES_IMAGEN = 5 * 1024 * 1024; // Igual que el limite del bucket.

/** Extension por MIME. Sirve tambien de lista blanca de formatos aceptados. */
const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const ESTADOS_VALIDOS: readonly EstadoProducto[] = [
  "activo",
  "borrador",
  "agotado",
];

/** Devuelve el texto de un campo del formulario, o "" si no vino. */
function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Convierte "S, M, L" en ["S", "M", "L"].
 *
 * El `filter(Boolean)` no es opcional: sin el, un campo vacio produce [""] y
 * el producto quedaria con una talla fantasma en la base de datos. Tambien
 * limpia las comas de mas ("S, , L") y la coma final.
 */
function listaDeTexto(valor: string): string[] {
  return valor
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function volverConError(destino: string, mensaje: string): never {
  redirect(`${destino}?error=${encodeURIComponent(mensaje)}`);
}

// -----------------------------------------------------------------------------
// Subida de imagenes a Supabase Storage
// -----------------------------------------------------------------------------

type ResultadoSubida = {
  urls: string[];
  errores: string[];
};

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Sube a Storage cada archivo de `imagenes_upload` como un objeto independiente
 * y devuelve sus URLs publicas.
 *
 * Deduplicacion: se calcula el SHA-256 del contenido y se usa como nombre del
 * objeto. Eso descarta los duplicados de la misma peticion aunque lleguen con
 * nombres de archivo distintos (comparar por `name` no lo detectaria), y hace
 * la operacion idempotente entre peticiones: volver a subir la misma imagen
 * apunta al mismo objeto en vez de crear una copia huerfana.
 */
async function subirImagenes(
  supabase: ClienteSupabase,
  formData: FormData,
): Promise<ResultadoSubida> {
  const archivos = formData
    .getAll("imagenes_upload")
    // Un `<input type="file">` sin seleccion envia un File vacio, no nada.
    .filter((valor): valor is File => valor instanceof File && valor.size > 0);

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
        `"${archivo.name}": pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el maximo es 5 MB.`,
      );
      continue;
    }

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");

    if (hashesVistos.has(hash)) {
      // Duplicado exacto dentro de esta misma peticion: se ignora en silencio.
      continue;
    }
    hashesVistos.add(hash);

    const ruta = `${hash}.${extension}`;

    // Una llamada por archivo: cada imagen es un objeto separado en el bucket.
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, bytes, {
      contentType: archivo.type,
      cacheControl: "31536000",
      // El nombre es el hash del contenido, asi que sobrescribir es escribir
      // exactamente los mismos bytes.
      upsert: true,
    });

    if (error) {
      console.error("[productos] Error al subir imagen:", archivo.name, error);
      errores.push(`"${archivo.name}": ${error.message}`);
      continue;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
    urls.push(data.publicUrl);
  }

  return { urls, errores };
}

// -----------------------------------------------------------------------------
// Lectura y validacion de campos
// -----------------------------------------------------------------------------

type CamposProducto = {
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  stock: number;
  tallas: string[];
  estado: EstadoProducto;
};

/**
 * Lee y valida los campos comunes al alta y la edicion.
 * Ante un valor invalido no retorna: redirige a `destinoError`.
 */
function leerCampos(formData: FormData, destinoError: string): CamposProducto {
  const titulo = texto(formData, "titulo");
  const descripcion = texto(formData, "descripcion");
  const categoria = texto(formData, "categoria");
  const precio = Number(texto(formData, "precio"));
  const stock = Number(texto(formData, "stock"));
  const estado = texto(formData, "estado") || "activo";

  if (!titulo) {
    volverConError(destinoError, "El título es obligatorio.");
  }
  if (!Number.isFinite(precio) || precio < 0) {
    volverConError(
      destinoError,
      "El precio debe ser un número mayor o igual a 0.",
    );
  }
  if (!Number.isInteger(stock) || stock < 0) {
    volverConError(
      destinoError,
      "El stock debe ser un número entero mayor o igual a 0.",
    );
  }
  if (!ESTADOS_VALIDOS.includes(estado as EstadoProducto)) {
    volverConError(
      destinoError,
      `Estado inválido: debe ser ${ESTADOS_VALIDOS.join(", ")}.`,
    );
  }

  return {
    titulo,
    descripcion: descripcion || null,
    categoria: categoria || null,
    // La columna es numeric(10,2): se redondea aqui para que lo guardado
    // coincida con lo que el listado muestra.
    precio: Math.round(precio * 100) / 100,
    stock,
    tallas: listaDeTexto(texto(formData, "tallas")),
    estado: estado as EstadoProducto,
  };
}

function mensajeDeErrorSupabase(code: string, message: string, verbo: string) {
  return code === "42501"
    ? `No tienes permisos para ${verbo} productos.`
    : `No se pudo ${verbo} el producto: ${message}`;
}

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

/**
 * Alta de producto desde `<form action={crearProducto}>`.
 *
 * `redirect()` funciona lanzando una excepcion interna de Next, asi que tanto
 * el camino feliz como el de error salen por la misma via y nada de lo que
 * haya despues se ejecuta.
 */
export async function crearProducto(formData: FormData) {
  const campos = leerCampos(formData, FORMULARIO_NUEVO);

  const supabase = await createClient();
  const { urls, errores } = await subirImagenes(supabase, formData);

  // Si alguna imagen falla no se guarda nada: es preferible a crear el producto
  // con la galeria incompleta y que nadie se entere.
  if (errores.length > 0) {
    volverConError(
      FORMULARIO_NUEVO,
      `No se pudieron subir algunas imágenes y el producto no se guardó. ${errores.join(" ")}`,
    );
  }

  const nuevo: ProductoInsert = { ...campos, imagenes: urls };
  const { error } = await supabase.from("productos").insert(nuevo);

  if (error) {
    console.error("[productos] Error al crear:", error);
    volverConError(
      FORMULARIO_NUEVO,
      mensajeDeErrorSupabase(error.code ?? "", error.message, "crear"),
    );
  }

  revalidatePath(LISTADO);
  redirect(LISTADO);
}

/**
 * Edicion de producto. El `id` viaja en un input oculto del formulario.
 *
 * La galeria final son las imagenes que siguieron marcadas en el formulario
 * (`imagenes_actuales`) mas las recien subidas. Desmarcar una imagen la quita
 * del producto, pero el objeto permanece en el bucket.
 */
export async function actualizarProducto(formData: FormData) {
  const id = texto(formData, "id");

  if (!id) {
    volverConError(LISTADO, "Falta el identificador del producto a editar.");
  }

  const destinoError = `${LISTADO}/${id}`;
  const campos = leerCampos(formData, destinoError);

  const supabase = await createClient();
  const { urls, errores } = await subirImagenes(supabase, formData);

  if (errores.length > 0) {
    volverConError(
      destinoError,
      `No se pudieron subir algunas imágenes y no se guardaron los cambios. ${errores.join(" ")}`,
    );
  }

  const conservadas = formData
    .getAll("imagenes_actuales")
    .filter((valor): valor is string => typeof valor === "string" && valor !== "");

  // `Set` evita repetir una URL si la imagen ya estaba y se vuelve a subir:
  // como el nombre del objeto es el hash del contenido, la URL es la misma.
  const imagenes = [...new Set([...conservadas, ...urls])];

  const cambios: ProductoUpdate = { ...campos, imagenes };

  // Igual que en el borrado: un UPDATE bloqueado por la clausula `using` de
  // RLS no lanza error, simplemente no encuentra la fila. El `.select()`
  // devuelve lo realmente escrito, que es la unica forma de distinguir
  // "actualizado" de "no tenias permiso".
  const { data, error } = await supabase
    .from("productos")
    .update(cambios)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[productos] Error al actualizar:", error);
    volverConError(
      destinoError,
      mensajeDeErrorSupabase(error.code ?? "", error.message, "editar"),
    );
  }

  if (!data || data.length === 0) {
    volverConError(
      destinoError,
      "No se guardaron los cambios: el producto no existe o tu cuenta no tiene permisos.",
    );
  }

  revalidatePath(LISTADO);
  revalidatePath(destinoError);
  redirect(LISTADO);
}

/**
 * Baja de producto. Se invoca desde el listado con `bind`, de modo que el `id`
 * viaja en el closure del servidor y no en un campo manipulable del formulario.
 */
export async function eliminarProducto(id: string) {
  if (!id) return;

  const supabase = await createClient();

  // El `.select()` es imprescindible: a diferencia del INSERT (que lanza 42501
  // al violar `with check`), un DELETE bloqueado por la clausula `using` de RLS
  // simplemente no encuentra la fila y devuelve 0 filas sin error. Sin
  // comprobar lo devuelto, un usuario sin permisos veria un borrado "exitoso".
  const { data, error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[productos] Error al eliminar:", error);
    throw new Error(`No se pudo eliminar el producto: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      "No se eliminó el producto: no existe o tu cuenta no tiene permisos.",
    );
  }

  revalidatePath(LISTADO);
}
