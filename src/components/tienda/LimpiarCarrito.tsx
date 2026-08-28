"use client";

import { useEffect, useRef } from "react";

import { useCarrito } from "@/store/carrito";

/**
 * Vacía el carrito al llegar a la pantalla de confirmación.
 *
 * Va aquí y no en el checkout porque el pedido ya está registrado cuando esta
 * página se pinta: si el vaciado ocurriera antes de navegar y algo fallara por
 * el camino, el comprador se quedaría sin carrito y sin confirmación.
 *
 * El `ref` evita repetir la llamada si el componente se remonta (React en modo
 * estricto monta dos veces en desarrollo). No renderiza nada.
 */
export default function LimpiarCarrito() {
  const limpiarCarrito = useCarrito((estado) => estado.limpiarCarrito);
  const yaLimpiado = useRef(false);

  useEffect(() => {
    if (yaLimpiado.current) return;
    yaLimpiado.current = true;
    limpiarCarrito();
  }, [limpiarCarrito]);

  return null;
}
