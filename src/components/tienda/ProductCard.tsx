import Link from "next/link";
import { ImageOff } from "lucide-react";

import { calcularDescuento } from "@/lib/descuento";
import { moneda } from "@/lib/formato";

export type ProductoTarjeta = {
  id: string;
  titulo: string;
  precio: number;
  precio_original?: number | null;
  categoria: string | null;
  imagenes: string[] | null;
};

/**
 * Tarjeta de producto para las cuadrículas de la tienda.
 *
 * Estética outlet: fondo blanco, borde gris fino, todo el texto en negro y el
 * único énfasis al pasar el cursor es el borde que se vuelve negro. Server
 * Component: sin interactividad, no manda JS al cliente. Toda la tarjeta es un
 * enlace, para que el área de click sea grande en móvil.
 */
export default function ProductCard({
  producto,
}: {
  producto: ProductoTarjeta;
}) {
  const portada = producto.imagenes?.[0];
  const descuento = calcularDescuento(
    producto.precio,
    producto.precio_original,
  );

  return (
    <Link
      href={`/productos/${producto.id}`}
      className="group flex flex-col border border-neutral-200 bg-white transition-colors hover:border-black"
    >
      {/* Portada */}
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        {descuento && (
          <span className="absolute top-0 left-0 z-10 bg-red-600 px-2 py-1 text-[10px] font-black tracking-[0.1em] text-white md:px-2.5 md:py-1.5 md:text-xs">
            -{descuento.porcentaje}%
          </span>
        )}

        {portada ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portada}
            alt={producto.titulo}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-300">
            <ImageOff className="h-6 w-6 md:h-8 md:w-8" aria-hidden />
            <span className="text-[10px] font-bold tracking-widest uppercase">
              Sin imagen
            </span>
          </div>
        )}
      </div>

      {/* Datos */}
      <div className="flex flex-1 flex-col gap-1 border-t border-neutral-200 p-2 md:gap-1.5 md:p-4">
        {producto.categoria && (
          <p className="hidden text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase md:block">
            {producto.categoria}
          </p>
        )}

        <h3 className="line-clamp-2 text-xs leading-snug font-semibold text-black md:text-sm">
          {producto.titulo}
        </h3>

        {descuento ? (
          <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2 font-mono md:pt-3">
            <span className="text-sm font-bold text-red-600 md:text-base">
              {moneda.format(producto.precio)}
            </span>
            <span className="text-xs text-gray-400 line-through md:text-sm">
              {moneda.format(descuento.precioOriginal)}
            </span>
          </p>
        ) : (
          <p className="mt-auto pt-2 font-mono text-sm font-bold text-black md:pt-3 md:text-base">
            {moneda.format(producto.precio)}
          </p>
        )}

        <span className="hidden text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase transition-colors group-hover:text-black md:block">
          Ver más
        </span>
      </div>
    </Link>
  );
}
