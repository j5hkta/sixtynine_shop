"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { useCarrito } from "@/store/carrito";

type AccionesProductoProps = {
  id: string;
  titulo: string;
  precio: number;
  /** Portada del producto; se guarda en la línea del carrito. */
  imagen: string | null;
  tallas: string[];
  /** 0 deshabilita la compra. */
  stock: number;
};

export default function AccionesProducto({
  id,
  titulo,
  precio,
  imagen,
  tallas,
  stock,
}: AccionesProductoProps) {
  const agregarItem = useCarrito((estado) => estado.agregarItem);

  const [talla, setTalla] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sólo limpia el temporizador pendiente al desmontar.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const sinStock = stock <= 0;

  function anadirAlCarrito() {
    if (tallas.length > 0 && !talla) {
      setAviso("Selecciona una talla para continuar.");
      return;
    }

    setAviso(null);

    agregarItem({
      id_producto: id,
      titulo,
      precio,
      talla,
      imagen,
      cantidad: 1,
    });

    setConfirmado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setConfirmado(false), 2500);
  }

  return (
    <div className="space-y-6">
      {tallas.length > 0 && (
        <fieldset>
          <legend className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
            Talla
          </legend>

          <div className="mt-3 flex flex-wrap gap-2">
            {tallas.map((opcion) => {
              const seleccionada = opcion === talla;
              return (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => {
                    setTalla(opcion);
                    setAviso(null);
                  }}
                  aria-pressed={seleccionada}
                  className={`min-w-14 border px-4 py-3 font-mono text-sm font-bold transition-colors ${
                    seleccionada
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 text-neutral-700 hover:border-black hover:text-black"
                  }`}
                >
                  {opcion}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {aviso && (
        <p role="alert" className="text-sm text-red-600">
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={anadirAlCarrito}
        disabled={sinStock}
        className="flex w-full items-center justify-center gap-2 bg-black py-4 text-sm font-black tracking-[0.15em] text-white uppercase transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {sinStock ? (
          "Sin stock"
        ) : confirmado ? (
          <>
            <Check className="h-4 w-4" aria-hidden />
            Añadido al carrito
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" aria-hidden />
            Añadir al Carrito
          </>
        )}
      </button>

      {/* Mensaje para lectores de pantalla: el cambio de texto del botón por
          sí solo no siempre se anuncia. */}
      <p aria-live="polite" className="sr-only">
        {confirmado ? `${titulo} añadido al carrito.` : ""}
      </p>
    </div>
  );
}
