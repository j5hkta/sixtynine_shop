"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ItemCarrito = {
  /** Identificador de la línea: `id_producto` + talla. */
  id: string;
  id_producto: string;
  titulo: string;
  precio: number;
  /** `null` cuando el producto no maneja tallas. */
  talla: string | null;
  /** Portada, o `null` si el producto no tiene imágenes. */
  imagen: string | null;
  cantidad: number;
};

/** Datos que aporta la ficha de producto; el resto los calcula el store. */
export type NuevoItem = Omit<ItemCarrito, "id" | "cantidad"> & {
  cantidad?: number;
};

type EstadoCarrito = {
  items: ItemCarrito[];
  agregarItem: (item: NuevoItem) => void;
  removerItem: (id: string) => void;
  actualizarCantidad: (id: string, cantidad: number) => void;
  limpiarCarrito: () => void;
};

/**
 * La misma tabla en talla M y en talla L son dos líneas distintas del carrito,
 * pero dos veces la talla M es una sola línea con cantidad 2.
 */
function lineaId(idProducto: string, talla: string | null): string {
  return `${idProducto}__${talla ?? "unica"}`;
}

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      items: [],

      agregarItem: (nuevo) =>
        set((estado) => {
          const id = lineaId(nuevo.id_producto, nuevo.talla);
          const cantidad = Math.max(1, Math.trunc(nuevo.cantidad ?? 1));
          const existente = estado.items.find((item) => item.id === id);

          if (existente) {
            return {
              items: estado.items.map((item) =>
                item.id === id
                  ? { ...item, cantidad: item.cantidad + cantidad }
                  : item,
              ),
            };
          }

          return {
            items: [
              ...estado.items,
              {
                id,
                id_producto: nuevo.id_producto,
                titulo: nuevo.titulo,
                // Se guarda el precio del momento: si cambia en la tienda, hay
                // que reconciliarlo al pagar, no confiar en esta copia.
                precio: nuevo.precio,
                talla: nuevo.talla,
                imagen: nuevo.imagen,
                cantidad,
              },
            ],
          };
        }),

      removerItem: (id) =>
        set((estado) => ({
          items: estado.items.filter((item) => item.id !== id),
        })),

      actualizarCantidad: (id, cantidad) =>
        set((estado) => {
          const nueva = Math.trunc(cantidad);

          // Bajar a 0 (o menos) equivale a quitar la línea.
          if (nueva <= 0) {
            return { items: estado.items.filter((item) => item.id !== id) };
          }

          return {
            items: estado.items.map((item) =>
              item.id === id ? { ...item, cantidad: nueva } : item,
            ),
          };
        }),

      limpiarCarrito: () => set({ items: [] }),
    }),
    {
      name: "sixtynine-carrito",
      version: 1,
      // `window.localStorage`, no el `localStorage` global a secas: en el
      // servidor el primero lanza ReferenceError, que `createJSONStorage`
      // captura para devolver un storage vacío. El global suelto existe en
      // Node 26 y sólo consigue emitir un warning en cada build.
      storage: createJSONStorage(() => window.localStorage),
      // Sólo se persisten los datos; las acciones se recrean al arrancar.
      partialize: (estado) => ({ items: estado.items }),
    },
  ),
);

// -----------------------------------------------------------------------------
// Lectura segura durante la hidratación
// -----------------------------------------------------------------------------

const sinSuscripcion = () => () => {};

/**
 * `false` en el servidor y en el render de hidratación; `true` a partir del
 * siguiente render en el cliente.
 *
 * Hace falta porque `persist` lee `localStorage` de forma síncrona al crear el
 * store: el HTML del servidor diría "0 items" y el primer render del cliente
 * ya diría "3", que es exactamente un error de hidratación.
 *
 * Se usa `useSyncExternalStore` en vez del clásico `useState` + `useEffect`
 * porque el ESLint de este proyecto (React Compiler) prohíbe llamar a
 * `setState` dentro de un efecto.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}

/** Total de unidades en el carrito, a prueba de hidratación. */
export function useTotalItems(): number {
  const hidratado = useHidratado();
  const total = useCarrito((estado) =>
    estado.items.reduce((suma, item) => suma + item.cantidad, 0),
  );

  return hidratado ? total : 0;
}

/** Importe total del carrito, a prueba de hidratación. */
export function useTotalPrecio(): number {
  const hidratado = useHidratado();
  const total = useCarrito((estado) =>
    estado.items.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
  );

  return hidratado ? total : 0;
}
