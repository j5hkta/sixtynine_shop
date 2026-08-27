import type { EstadoPedido } from "./supabase/types";

/**
 * Estados posibles de un pedido, en el orden natural del ciclo de vida.
 *
 * Vive aquí y no en `src/actions/pedidos.ts` porque aquel lleva `"use server"`
 * y un archivo así sólo puede exportar funciones async: exportar la constante
 * desde allí rompe el build en cuanto un Server Component la importa.
 *
 * Debe coincidir con el CHECK de `pedidos.estado` en
 * `supabase/pedidos_schema.sql`.
 */
export const ESTADOS_PEDIDO: readonly EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "enviado",
  "entregado",
  "cancelado",
];

export function esEstadoPedidoValido(valor: string): valor is EstadoPedido {
  return (ESTADOS_PEDIDO as readonly string[]).includes(valor);
}
