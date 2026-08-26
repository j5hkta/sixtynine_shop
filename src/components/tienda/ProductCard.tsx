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
 * Server Component: no necesita interactividad, así que no manda JS al cliente.
 * Toda la tarjeta es un enlace, para que el área de click sea grande en móvil.
 */
export default function ProductCard({ producto }: { producto: ProductoTarjeta }) {
  const portada = producto.imagenes?.[0];

  return (
    <Link
      href={`/productos/${producto.id}`}
      className="group flex flex-col border border-ink-line bg-ink-soft transition-colors hover:border-neon/50"
    >
      {/* Portada */}
      <div className="relative aspect-square overflow-hidden bg-ink">
        {portada ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portada}
            alt={producto.titulo}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-800/40 text-neutral-600">
            <ImageOff className="h-8 w-8" aria-hidden />
            <span className="text-[10px] font-bold tracking-widest uppercase">
              Sin imagen
            </span>
          </div>
        )}
      </div>

      {/* Datos */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {producto.categoria && (
          <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-600 uppercase">
            {producto.categoria}
          </p>
        )}

        <h3 className="line-clamp-2 text-sm font-bold text-white transition-colors group-hover:text-neon">
          {producto.titulo}
        </h3>

        <p className="mt-auto pt-2 font-mono text-lg font-black text-white">
          {moneda.format(producto.precio)}
        </p>

        <span className="mt-2 border-t border-ink-line pt-3 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors group-hover:text-neon">
          Ver más →
        </span>
      </div>
    </Link>
  );
}
