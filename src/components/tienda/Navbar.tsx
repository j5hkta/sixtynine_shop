"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";

import { CATEGORIAS, rutaDeCategoria } from "@/lib/categorias";
import { useTotalItems } from "@/store/carrito";

/**
 * Navbar de dos niveles, en negro sobre la tienda blanca.
 *
 * No usa `useSearchParams` para marcar la categoría activa a propósito: ese
 * hook obliga a la página entera a salirse del render estático, y la portada y
 * el catálogo se sirven prerenderizados con ISR. El resalte de la categoría
 * activa lo pone `FiltroCategorias` dentro de cada página, que sí sabe cuál es.
 */
export default function Navbar() {
  const router = useRouter();
  const [termino, setTermino] = useState("");

  // Devuelve 0 hasta que termina la hidratación, para que el HTML del servidor
  // y el primer render del cliente coincidan (ver `useTotalItems`).
  const totalItems = useTotalItems();

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    const consulta = termino.trim();
    if (!consulta) {
      evento.preventDefault();
      return;
    }

    // Se navega con el router para no recargar la página entera. El `action`
    // del formulario se conserva como respaldo si el JS no ha cargado todavía.
    evento.preventDefault();
    router.push(`/buscar?q=${encodeURIComponent(consulta)}`);
  }

  return (
    <header className="sticky top-0 z-50">
      {/* Franja 1: marca, buscador y carrito */}
      <div className="bg-black">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Link href="/" aria-label="Sixty Nine — Inicio" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Sixty Nine"
              className="h-12 object-contain"
            />
          </Link>

          <form
            action="/buscar"
            method="get"
            onSubmit={buscar}
            role="search"
            className="relative ml-auto w-full max-w-xs sm:ml-0 sm:max-w-sm"
          >
            <label htmlFor="buscador" className="sr-only">
              Buscar productos
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500"
              aria-hidden
            />
            <input
              id="buscador"
              name="q"
              type="search"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="Buscar..."
              className="w-full border border-neutral-400 bg-white py-2 pr-3 pl-9 text-sm text-black transition-colors placeholder:text-neutral-400 focus:border-white focus:outline-none"
            />
          </form>

          <Link
            href="/carrito"
            aria-label={
              totalItems === 0
                ? "Carrito de compras (vacío)"
                : `Carrito de compras (${totalItems} ${totalItems === 1 ? "artículo" : "artículos"})`
            }
            className="relative ml-auto flex shrink-0 items-center gap-2 text-white transition-opacity hover:opacity-70"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <span className="hidden text-[11px] font-bold tracking-[0.2em] uppercase lg:block">
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

      {/* Franja 2: categorías */}
      <nav aria-label="Categorías" className="border-t border-white/15 bg-black">
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
                href={rutaDeCategoria(categoria)}
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
