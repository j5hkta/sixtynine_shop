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
