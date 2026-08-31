"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archivosDeFormData, subirImagenes } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type {
  EstadoProducto,
  ProductoInsert,
  ProductoUpdate,
} from "@/lib/supabase/types";

const LISTADO = "/admin/productos";
const FORMULARIO_NUEVO = "/admin/productos/nuevo";

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
// Lectura y validacion de campos
// -----------------------------------------------------------------------------

type CamposProducto = {
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  precio_original: number | null;
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

  // Campo opcional: vacio significa "sin descuento", no cero. Se distingue
  // antes de convertir, porque `Number("")` es 0 y guardaria un producto
  // rebajado desde S/ 0.00.
  const precioOriginalTexto = texto(formData, "precio_original");
  const precioOriginal =
    precioOriginalTexto === "" ? null : Number(precioOriginalTexto);

  if (!titulo) {
    volverConError(destinoError, "El título es obligatorio.");
  }
  if (!Number.isFinite(precio) || precio < 0) {
    volverConError(
      destinoError,
      "El precio debe ser un número mayor o igual a 0.",
    );
  }
  // Ambas columnas son numeric(10,2). Se redondea ANTES de comparar: dos
  // valores que sólo se distinguen en el tercer decimal pasarian la validacion
  // y luego chocarian contra la restriccion de la base ya redondeados a lo
  // mismo.
  const precioRedondeado = Math.round(precio * 100) / 100;
  const precioOriginalRedondeado =
    precioOriginal === null ? null : Math.round(precioOriginal * 100) / 100;

  if (precioOriginalRedondeado !== null) {
    if (
      !Number.isFinite(precioOriginalRedondeado) ||
      precioOriginalRedondeado <= 0
    ) {
      volverConError(
        destinoError,
        "El precio original debe ser un número mayor que 0, o quedar vacío.",
      );
    }
    // La restriccion `productos_precio_original_coherente` rechazaria esto en
    // la base, pero con un mensaje de Postgres que no ayuda a nadie.
    if (precioOriginalRedondeado <= precioRedondeado) {
      volverConError(
        destinoError,
        "El precio original debe ser mayor que el precio actual. Si el producto no está rebajado, deja el campo vacío.",
      );
    }
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
    precio: precioRedondeado,
    precio_original: precioOriginalRedondeado,
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
  const { urls, errores } = await subirImagenes(
    supabase,
    archivosDeFormData(formData, "imagenes_upload"),
  );

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
  const { urls, errores } = await subirImagenes(
    supabase,
    archivosDeFormData(formData, "imagenes_upload"),
  );

  if (errores.length > 0) {
    volverConError(
      destinoError,
      `No se pudieron subir algunas imágenes y no se guardaron los cambios. ${errores.join(" ")}`,
    );
  }

  const conservadas = formData
    .getAll("imagenes_actuales")
    .filter(
      (valor): valor is string => typeof valor === "string" && valor !== "",
    );

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
export type ResultadoBorrado = { ok: true } | { ok: false; error: string };

/**
 * Baja de producto. Se invoca desde el listado con `bind`, de modo que el `id`
 * viaja en el closure del servidor y no en un campo manipulable del formulario.
 *
 * Devuelve el fallo como DATO en vez de lanzarlo. Un `throw` desde una Server
 * Action llega al navegador convertido en el error generico #441 de React: en
 * produccion React borra el mensaje para no filtrar detalles del servidor, asi
 * que el texto cuidadosamente escrito aqui nunca se veia. Como valor de
 * retorno viaja intacto.
 */
export async function eliminarProducto(id: string): Promise<ResultadoBorrado> {
  if (!id) {
    return { ok: false, error: "Falta el identificador del producto." };
  }

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

    // 23503 = violacion de clave foranea. `pedidos_items.producto_id` usa
    // `on delete restrict` para no destruir el historial de pedidos.
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "No se puede eliminar: el producto aparece en pedidos ya registrados. " +
          "Cambialo a estado 'borrador' para retirarlo de la tienda.",
      };
    }

    return {
      ok: false,
      error: `No se pudo eliminar el producto: ${error.message}`,
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "No se elimino el producto: no existe o tu cuenta no tiene permisos.",
    };
  }

  revalidatePath(LISTADO);
  return { ok: true };
}
