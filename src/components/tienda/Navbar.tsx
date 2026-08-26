"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";

import { useTotalItems } from "@/store/carrito";

const ENLACES = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Catálogo" },
];

function esActivo(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Devuelve 0 hasta que termina la hidratación, para que el HTML del servidor
  // y el primer render del cliente coincidan (ver `useTotalItems`).
  const totalItems = useTotalItems();

  // Cierra el menú móvil al navegar. Se ajusta durante el render en lugar de
  // en un efecto para no provocar un render en cascada.
  const [ultimaRuta, setUltimaRuta] = useState(pathname);
  if (ultimaRuta !== pathname) {
    setUltimaRuta(pathname);
    setAbierto(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        {/* Marca */}
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center bg-neon font-mono text-sm font-black text-ink">
            69
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-black tracking-widest text-white uppercase">
              Sixty Nine
            </span>
            <span className="block text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
              Skate &amp; Apparel
            </span>
          </span>
        </Link>

        {/* Navegación (escritorio) */}
        <nav className="ml-auto hidden md:block">
          <ul className="flex items-center gap-8">
            {ENLACES.map((enlace) => {
              const activo = esActivo(enlace.href, pathname);
              return (
                <li key={enlace.href}>
                  <Link
                    href={enlace.href}
                    aria-current={activo ? "page" : undefined}
                    className={`text-xs font-bold tracking-[0.2em] uppercase transition-colors ${
                      activo
                        ? "text-neon"
                        : "text-neutral-400 hover:text-neon"
                    }`}
                  >
                    {enlace.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {/* TODO: falta la página del carrito; por ahora sólo muestra el total. */}
          <button
            type="button"
            aria-label={
              totalItems === 0
                ? "Carrito de compras (vacío)"
                : `Carrito de compras (${totalItems} ${totalItems === 1 ? "artículo" : "artículos"})`
            }
            className="relative border border-ink-line p-2.5 text-neutral-400 transition-colors hover:border-neon/50 hover:text-neon"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {totalItems > 0 && (
              <span
                aria-hidden
                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center bg-neon px-1 font-mono text-[10px] font-black text-ink"
              >
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={abierto}
            className="border border-ink-line p-2.5 text-neutral-400 transition-colors hover:border-neon/50 hover:text-neon md:hidden"
          >
            {abierto ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Navegación (móvil) */}
      {abierto && (
        <nav className="border-t border-ink-line md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {ENLACES.map((enlace) => {
              const activo = esActivo(enlace.href, pathname);
              return (
                <li key={enlace.href}>
                  <Link
                    href={enlace.href}
                    aria-current={activo ? "page" : undefined}
                    className={`block py-3 text-xs font-bold tracking-[0.2em] uppercase transition-colors ${
                      activo ? "text-neon" : "text-neutral-400 hover:text-neon"
                    }`}
                  >
                    {enlace.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
