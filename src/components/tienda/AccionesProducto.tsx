"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { TALLA_UNICA } from "@/lib/validacion";
import { useCarrito } from "@/store/carrito";

type AccionesProductoProps = {
  id: string;
  titulo: string;
  precio: number;
  /** Portada del producto; se guarda en la línea del carrito. */
  imagen: string | null;
  /**
   * Unidades por talla: `{"S": 10, "M": 0}`.
   *
   * Aquí SÍ viajan las cifras al navegador, a diferencia del resto de la ficha,
   * donde se ocultan a propósito. No hay alternativa: el carrito tiene que
   * poder topar la cantidad al stock de la talla elegida, y esa decisión ocurre
   * en el cliente. Lo que sigue sin verse es el total del producto.
   */
  inventario: Record<string, number>;
  /** Si se puede comprar algo. Falso también con el estado 'agotado'. */
  disponible: boolean;
};

export default function AccionesProducto({
  id,
  titulo,
  precio,
  imagen,
  inventario,
  disponible,
}: AccionesProductoProps) {
  const agregarItem = useCarrito((estado) => estado.agregarItem);

  const tallas = Object.keys(inventario);

  // Un producto de talla única no plantea ninguna elección: se preselecciona
  // para que el comprador no tenga que pulsar un botón con una sola opción.
  const soloUnica = tallas.length === 1 && tallas[0] === TALLA_UNICA;

  const [talla, setTalla] = useState<string | null>(
    soloUnica ? TALLA_UNICA : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sólo limpia el temporizador pendiente al desmontar.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const unidadesDeTalla = talla ? (inventario[talla] ?? 0) : 0;
  const sinStock = !disponible;

  function anadirAlCarrito() {
    if (!talla) {
      setAviso("Selecciona una talla para continuar.");
      return;
    }

    if (unidadesDeTalla <= 0) {
      setAviso("Esa talla está agotada.");
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
      // Viaja con la línea para que el carrito sepa dónde topar sin volver a
      // consultar. Es una foto del momento: `procesar_checkout()` revalida
      // contra la base al pagar, que es lo que de verdad impide la sobreventa.
      stockDisponible: unidadesDeTalla,
    });

    setConfirmado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setConfirmado(false), 2500);
  }

  return (
    <div className="space-y-6">
      {!soloUnica && tallas.length > 0 && (
        <fieldset>
          <legend className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
            Talla
          </legend>

          <div className="mt-3 flex flex-wrap gap-2">
            {tallas.map((opcion) => {
              const unidades = inventario[opcion] ?? 0;
              const agotada = unidades <= 0;
              const seleccionada = opcion === talla;

              return (
                <button
                  key={opcion}
                  type="button"
                  disabled={agotada}
                  onClick={() => {
                    setTalla(opcion);
                    setAviso(null);
                  }}
                  aria-pressed={seleccionada}
                  // La talla agotada se muestra tachada en vez de ocultarse:
                  // así se ve que el producto existe en esa talla y que lo que
                  // falta es reposición, no que nunca se fabricó.
                  title={agotada ? `Talla ${opcion} agotada` : undefined}
                  className={`min-w-14 border px-4 py-3 font-mono text-sm font-bold transition-colors ${
                    agotada
                      ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300 line-through"
                      : seleccionada
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
          "Agotado"
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
