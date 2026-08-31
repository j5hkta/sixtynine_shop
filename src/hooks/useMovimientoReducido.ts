"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

/**
 * `true` si el sistema pide movimiento reducido.
 *
 * Lo usan el carrusel de la portada y la barra de anuncios para no rotar solos:
 * un elemento que cambia cada pocos segundos sin que nadie lo toque es
 * exactamente lo que esa preferencia existe para desactivar.
 *
 * Con `useSyncExternalStore` y no con `useState` + `useEffect` por dos motivos:
 * el compilador de React prohíbe llamar a `setState` dentro de un efecto, y así
 * no hay un primer render con el valor equivocado que luego se corrige.
 */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(CONSULTA);
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => window.matchMedia(CONSULTA).matches,
    // En el servidor no hay forma de saberlo. Se asume que no, que es lo que
    // ve la mayoría; si al hidratar coincide, no cambia nada.
    () => false,
  );
}
