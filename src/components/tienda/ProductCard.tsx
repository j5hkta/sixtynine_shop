import Link from "next/link";
import { ImageOff } from "lucide-react";

import { moneda } from "@/lib/formato";

export type ProductoTarjeta = {
  id: string;
  titulo: string;
  precio: number;
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
export default function ProductCard({ producto }: { producto: ProductoTarjeta }) {
  const portada = producto.imagenes?.[0];

  return (
    <Link
      href={`/productos/${producto.id}`}
      className="group flex flex-col border border-neutral-200 bg-white transition-colors hover:border-black"
    >
      {/* Portada */}
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
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
            <ImageOff className="h-8 w-8" aria-hidden />
            <span className="text-[10px] font-bold tracking-widest uppercase">
              Sin imagen
            </span>
          </div>
        )}
      </div>

      {/* Datos */}
      <div className="flex flex-1 flex-col gap-1.5 border-t border-neutral-200 p-4">
        {producto.categoria && (
          <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
            {producto.categoria}
          </p>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold text-black">
          {producto.titulo}
        </h3>

        <p className="mt-auto pt-3 font-mono text-lg font-bold text-black">
          {moneda.format(producto.precio)}
        </p>

        <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase transition-colors group-hover:text-black">
          Ver más
        </span>
      </div>
    </Link>
  );
}
