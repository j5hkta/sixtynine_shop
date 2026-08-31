"use server";

import { revalidatePath } from "next/cache";

import { ESTADOS_PEDIDO, esEstadoPedidoValido } from "@/lib/pedidos";
import { createClient } from "@/lib/supabase/server";

const LISTADO = "/admin/pedidos";

/**
 * Cambia el estado de un pedido desde el panel.
 *
 * `nuevoEstado` llega de un `<select>` del navegador, así que se valida contra
 * la lista antes de tocar la base de datos: un valor fuera de ella lo
 * rechazaría el CHECK de la tabla, pero con un error de Postgres en crudo.
 */
export type ResultadoEstado = { ok: true } | { ok: false; error: string };

export async function actualizarEstadoPedido(
  id: string,
  nuevoEstado: string,
): Promise<ResultadoEstado> {
  if (!id) {
    return { ok: false, error: "Falta el identificador del pedido." };
  }

  if (!esEstadoPedidoValido(nuevoEstado)) {
    return {
      ok: false,
      error: `Estado inválido: debe ser ${ESTADOS_PEDIDO.join(", ")}.`,
    };
  }

  const supabase = await createClient();

  // El `.select()` no es opcional: si la política RLS ("Solo admins actualizan
  // pedidos") filtra la fila, el UPDATE no lanza error, simplemente no
  // encuentra nada. Sin comprobar lo devuelto, el panel mostraría un cambio
  // que nunca se guardó.
  const { data, error } = await supabase
    .from("pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[pedidos] Error al actualizar el estado:", error);
    return {
      ok: false,
      error: `No se pudo actualizar el pedido: ${error.message}`,
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "No se guardó el cambio: el pedido no existe o tu cuenta no tiene permisos.",
    };
  }

  revalidatePath(LISTADO);
  return { ok: true };
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

/**
 * Marca el pedido como enviado y guarda los codigos de recojo.
 *
 * Van juntos a proposito: el estado "enviado" sin numero ni clave deja al
 * comprador mirando una pantalla de seguimiento vacia, asi que el panel exige
 * al menos uno de los dos.
 *
 * Devuelve el fallo como dato, no lo lanza: un `throw` desde una Server Action
 * llega al navegador como el error generico #441 de React, sin mensaje util.
 */
export async function guardarEnvio(
  formData: FormData,
): Promise<ResultadoEnvio> {
  const leer = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" ? valor.trim() : "";
  };

  const id = leer("id");
  const numero = leer("tracking_numero");
  const clave = leer("tracking_clave");

  if (!id) {
    return { ok: false, error: "Falta el identificador del pedido." };
  }

  if (!numero && !clave) {
    return {
      ok: false,
      error: "Ingresa al menos el número de seguimiento o la clave de recojo.",
    };
  }

  const supabase = await createClient();

  // Igual que en el resto del panel: si la politica RLS filtra la fila, el
  // UPDATE no lanza error, simplemente no encuentra nada. El `.select()` es la
  // unica forma de distinguir "guardado" de "no tenias permiso".
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      estado: "enviado",
      tracking_numero: numero || null,
      tracking_clave: clave || null,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[pedidos] Error al guardar el envío:", error);
    return { ok: false, error: `No se pudo guardar: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "No se guardó: el pedido no existe o tu cuenta no tiene permisos.",
    };
  }

  revalidatePath(LISTADO);
  revalidatePath(`${LISTADO}/${id}`);
  return { ok: true };
}
