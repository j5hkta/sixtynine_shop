"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProductoInsert, ProductoUpdate } from "@/lib/supabase/types";

const LISTADO = "/admin/productos";
const FORMULARIO_NUEVO = "/admin/productos/nuevo";

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

type CamposProducto = {
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  stock: number;
  tallas: string[];
  imagenes: string[];
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

  return {
    titulo,
    descripcion: descripcion || null,
    categoria: categoria || null,
    // La columna es numeric(10,2): se redondea aqui para que lo guardado
    // coincida con lo que el listado muestra.
    precio: Math.round(precio * 100) / 100,
    stock,
    tallas: listaDeTexto(texto(formData, "tallas")),
    imagenes: listaDeTexto(texto(formData, "imagenes")),
  };
}

function mensajeDeErrorSupabase(code: string, message: string, verbo: string) {
  return code === "42501"
    ? `No tienes permisos para ${verbo} productos.`
    : `No se pudo ${verbo} el producto: ${message}`;
}

/**
 * Alta de producto desde `<form action={crearProducto}>`.
 *
 * `redirect()` funciona lanzando una excepcion interna de Next, asi que tanto
 * el camino feliz como el de error salen por la misma via y nada de lo que
 * haya despues se ejecuta.
 */
export async function crearProducto(formData: FormData) {
  const campos = leerCampos(formData, FORMULARIO_NUEVO);

  const nuevo: ProductoInsert = campos;

  const supabase = await createClient();
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
 */
export async function actualizarProducto(formData: FormData) {
  const id = texto(formData, "id");

  if (!id) {
    volverConError(LISTADO, "Falta el identificador del producto a editar.");
  }

  const destinoError = `${LISTADO}/${id}`;
  const cambios: ProductoUpdate = leerCampos(formData, destinoError);

  const supabase = await createClient();

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
