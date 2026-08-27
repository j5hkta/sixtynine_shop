"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/lib/supabase/types";

const LISTADO = "/admin/pedidos";

export const ESTADOS_PEDIDO: readonly EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "enviado",
  "entregado",
  "cancelado",
];

function esEstadoValido(valor: string): valor is EstadoPedido {
  return (ESTADOS_PEDIDO as readonly string[]).includes(valor);
}

/**
 * Cambia el estado de un pedido desde el panel.
 *
 * `nuevoEstado` llega de un `<select>` del navegador, así que se valida contra
 * la lista antes de tocar la base de datos: un valor fuera de ella lo
 * rechazaría el CHECK de la tabla, pero con un error de Postgres en crudo.
 */
export async function actualizarEstadoPedido(id: string, nuevoEstado: string) {
  if (!id) {
    throw new Error("Falta el identificador del pedido.");
  }

  if (!esEstadoValido(nuevoEstado)) {
    throw new Error(
      `Estado inválido: debe ser ${ESTADOS_PEDIDO.join(", ")}.`,
    );
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
    throw new Error(`No se pudo actualizar el pedido: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      "No se guardó el cambio: el pedido no existe o tu cuenta no tiene permisos.",
    );
  }

  revalidatePath(LISTADO);
}
