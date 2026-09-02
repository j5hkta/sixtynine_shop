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
  /** Clave de `inventario_tallas`. Los productos sin tallas usan "Unica". */
  talla: string | null;
  /**
   * Unidades disponibles de ESA talla cuando se anadio la linea.
   *
   * Es una foto, no la verdad: el catalogo puede cambiar mientras el carrito
   * duerme en `localStorage`. Sirve para topar el selector de cantidad; quien
   * de verdad impide la sobreventa es `procesar_checkout()`, que relee el
   * inventario con la fila bloqueada.
   */
  stockDisponible: number;
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
                  ? {
                      ...item,
                      // Se refresca el tope con el dato mas reciente y se
                      // recorta: sin esto, pulsar "anadir" cinco veces en una
                      // talla con dos unidades dejaria una linea de cinco.
                      stockDisponible: nuevo.stockDisponible,
                      cantidad: Math.min(
                        item.cantidad + cantidad,
                        Math.max(1, nuevo.stockDisponible),
                      ),
                    }
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
                stockDisponible: nuevo.stockDisponible,
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
              item.id === id
                ? {
                    // El tope es el stock de la talla concreta, no un global.
                    ...item,
                    cantidad: Math.min(nueva, Math.max(1, item.stockDisponible)),
                  }
                : item,
            ),
          };
        }),

      limpiarCarrito: () => set({ items: [] }),
    }),
    {
      name: "sixtynine-carrito",
      // 1 -> 2: se anadio `stockDisponible`. Las lineas guardadas antes de la
      // migracion a inventario por tallas no lo traen, y sin un valor por
      // defecto el tope saldria `NaN` y bloquearia el selector en 1.
      version: 2,
      migrate: (guardado, versionPrevia) => {
        const estado = guardado as { items?: ItemCarrito[] } | undefined;
        if (versionPrevia >= 2 || !estado?.items) return estado as never;

        return {
          ...estado,
          items: estado.items.map((item) => ({
            ...item,
            stockDisponible:
              typeof item.stockDisponible === "number" &&
              Number.isFinite(item.stockDisponible)
                ? item.stockDisponible
                : item.cantidad,
          })),
        } as never;
      },
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
