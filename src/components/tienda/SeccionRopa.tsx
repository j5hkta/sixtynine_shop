"use client";

import { useState } from "react";

import { type ProductoTarjeta } from "./ProductCard";
import { CabeceraSeccion, RejillaProductos } from "./SeccionPortada";
import { rutaDeCategoria } from "@/lib/categorias";
import { PESTANAS_ROPA } from "@/lib/secciones";

/**
 * Franja de ropa con pestañas.
 *
 * El filtrado ocurre en memoria sobre los productos que ya llegaron del
 * servidor: cambiar de pestaña no dispara ninguna consulta ni recarga nada.
 * Por eso es un Client Component y las otras franjas no lo son.
 *
 * Sólo se pintan las pestañas que tienen algo detrás. Una pestaña que al
 * pulsarla enseña un hueco es peor que no ofrecerla.
 */
export default function SeccionRopa({
  productos,
}: {
  productos: ProductoTarjeta[];
}) {
  const pestanas = PESTANAS_ROPA.filter((categoria) =>
    productos.some((producto) => producto.categoria === categoria),
  );

  // El inicializador se evalúa una sola vez; no hace falta efecto ni
  // sincronización posterior porque `productos` no cambia en esta página.
  const [activa, setActiva] = useState<string>(() => pestanas[0] ?? "");

  if (productos.length === 0 || pestanas.length === 0) return null;

  // Si la pestaña guardada desapareciera, se cae a la primera en vez de
  // mostrar una cuadrícula vacía.
  const seleccionada = pestanas.includes(activa as (typeof pestanas)[number])
    ? activa
    : pestanas[0];

  const visibles = productos.filter(
    (producto) => producto.categoria === seleccionada,
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <CabeceraSeccion
        titulo="Ropa y Accesorios"
        // El destino sigue a la pestaña abierta: quien está mirando polos
        // espera que «Ver todo» le lleve a los polos, no al catálogo entero.
        verTodo={rutaDeCategoria(seleccionada)}
      >
        <div
          role="tablist"
          aria-label="Tipo de prenda"
          className="mt-5 flex flex-wrap gap-2"
        >
          {pestanas.map((categoria) => {
            const esActiva = categoria === seleccionada;

            return (
              <button
                key={categoria}
                type="button"
                role="tab"
                aria-selected={esActiva}
                onClick={() => setActiva(categoria)}
                className={`border px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
                  esActiva
                    ? "border-black bg-black text-white"
                    : "border-neutral-300 bg-white text-neutral-600 hover:border-black hover:text-black"
                }`}
              >
                {categoria}
              </button>
            );
          })}
        </div>
      </CabeceraSeccion>

      <RejillaProductos productos={visibles} />
    </section>
  );
}
