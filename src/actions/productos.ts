"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProductoInsert } from "@/lib/supabase/types";

const LISTADO = "/admin/productos";
const FORMULARIO = "/admin/productos/nuevo";

/** Devuelve el texto de un campo del formulario, o "" si no vino. */
function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function volverConError(destino: string, mensaje: string): never {
  redirect(`${destino}?error=${encodeURIComponent(mensaje)}`);
}

/**
 * Alta de producto desde `<form action={crearProducto}>`.
 *
 * `redirect()` funciona lanzando una excepcion interna de Next, asi que tanto
 * el camino feliz como el de error salen por la misma via y nada de lo que
 * haya despues se ejecuta.
 */
export async function crearProducto(formData: FormData) {
  const titulo = texto(formData, "titulo");
  const descripcion = texto(formData, "descripcion");
  const categoria = texto(formData, "categoria");
  const precio = Number(texto(formData, "precio"));
  const stock = Number(texto(formData, "stock"));

  if (!titulo) {
    volverConError(FORMULARIO, "El título es obligatorio.");
  }
  if (!Number.isFinite(precio) || precio < 0) {
    volverConError(FORMULARIO, "El precio debe ser un número mayor o igual a 0.");
  }
  if (!Number.isInteger(stock) || stock < 0) {
    volverConError(FORMULARIO, "El stock debe ser un número entero mayor o igual a 0.");
  }

  const nuevo: ProductoInsert = {
    titulo,
    descripcion: descripcion || null,
    categoria: categoria || null,
    precio,
    stock,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("productos").insert(nuevo);

  if (error) {
    console.error("[productos] Error al crear:", error);
    // Con RLS activo, una cuenta sin rol 'admin' recibe exactamente este error.
    volverConError(
      FORMULARIO,
      error.code === "42501"
        ? "No tienes permisos para crear productos."
        : `No se pudo guardar el producto: ${error.message}`,
    );
  }

  revalidatePath(LISTADO);
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
