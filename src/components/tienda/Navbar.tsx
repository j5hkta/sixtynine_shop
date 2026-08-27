"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { CATEGORIAS } from "@/lib/categorias";
import { useTotalItems } from "@/store/carrito";

/**
 * Navbar de dos niveles, en negro sobre la tienda blanca.
 *
 * No usa `useSearchParams` para marcar la categoría activa a propósito: ese
 * hook obliga a la página entera a salirse del render estático, y la portada y
 * el catálogo se sirven prerenderizados con ISR. El resalte es por hover.
 */
export default function Navbar() {
  // Devuelve 0 hasta que termina la hidratación, para que el HTML del servidor
  // y el primer render del cliente coincidan (ver `useTotalItems`).
  const totalItems = useTotalItems();

  return (
    <header className="sticky top-0 z-50">
      {/* Franja 1: marca y carrito */}
      <div className="bg-black">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Sixty Nine — Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Sixty Nine"
              className="h-12 object-contain"
            />
          </Link>

          <div className="flex items-center gap-6">
            <span className="hidden text-[10px] font-bold tracking-[0.25em] text-white/60 uppercase lg:block">
              Envíos a todo el Perú
            </span>

            <Link
              href="/carrito"
              aria-label={
                totalItems === 0
                  ? "Carrito de compras (vacío)"
                  : `Carrito de compras (${totalItems} ${totalItems === 1 ? "artículo" : "artículos"})`
              }
              className="relative flex items-center gap-2 text-white transition-opacity hover:opacity-70"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden />
              <span className="hidden text-[11px] font-bold tracking-[0.2em] uppercase sm:block">
                Carrito
              </span>
              {totalItems > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-2 -left-2 flex h-4 min-w-4 items-center justify-center bg-white px-1 font-mono text-[10px] font-black text-black"
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Franja 2: categorías */}
      <nav
        aria-label="Categorías"
        className="border-t border-white/15 bg-black"
      >
        <ul className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li className="shrink-0">
            <Link
              href="/productos"
              className="text-[11px] font-bold tracking-[0.2em] text-white uppercase underline-offset-4 transition-colors hover:underline"
            >
              Todo el catálogo
            </Link>
          </li>

          {CATEGORIAS.map((categoria) => (
            <li key={categoria} className="shrink-0">
              <Link
                href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                className="text-[11px] font-bold tracking-[0.2em] text-white/70 uppercase underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {categoria}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
