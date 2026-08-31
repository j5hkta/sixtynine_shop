"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { rutaDeCategoria } from "@/lib/categorias";

/**
 * Grupos del menú.
 *
 * Las categorías son las de `src/lib/categorias.ts` escritas tal cual: si aquí
 * apareciera una que no existe, `rutaDeCategoria` generaría un slug sin página
 * detrás y el enlace daría 404.
 */
const GRUPOS = [
  {
    clave: "skate",
    etiqueta: "Skate",
    categorias: ["Tablas", "Completos", "Ruedas", "Trucks", "Rodamientos"],
  },
  {
    clave: "ropa",
    etiqueta: "Ropa",
    categorias: ["Polos", "Poleras", "Pantalones"],
  },
  {
    clave: "accesorios",
    etiqueta: "Accesorios",
    categorias: ["Gorros", "Cascos y Protecciones"],
  },
] as const;

/**
 * Menú de categorías con desplegables.
 *
 * Se abre al pulsar, no al pasar el ratón. Un menú de hover es invisible en
 * móvil —no hay puntero que pasar por encima— y ésta es una tienda que se ve
 * sobre todo desde el teléfono. Al pulsar funciona igual en ambos sitios y
 * además es navegable con teclado.
 */
export default function MenuCategorias() {
  const [abierto, setAbierto] = useState<string | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Cerrar al pulsar fuera y con Escape. Los `setState` viven dentro de los
  // manejadores, no en el cuerpo del efecto, que es lo que el compilador de
  // React no permite.
  useEffect(() => {
    if (abierto === null) return;

    function alPulsarFuera(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(null);
      }
    }

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(null);
    }

    document.addEventListener("pointerdown", alPulsarFuera);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("pointerdown", alPulsarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <nav aria-label="Categorías" className="border-t border-white/15 bg-black">
      <div
        ref={contenedorRef}
        className="mx-auto flex max-w-7xl items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-6 sm:py-2"
      >
        {GRUPOS.map((grupo) => {
          const estaAbierto = abierto === grupo.clave;

          return (
            <div key={grupo.clave} className="relative">
              <button
                type="button"
                onClick={() =>
                  setAbierto(estaAbierto ? null : grupo.clave)
                }
                aria-expanded={estaAbierto}
                aria-controls={`menu-${grupo.clave}`}
                className={`flex items-center gap-1 px-2 py-2 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors sm:px-3 sm:tracking-[0.2em] ${
                  estaAbierto ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {grupo.etiqueta}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    estaAbierto ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {/* Se desmonta al cerrar en vez de ocultarse con CSS: así sus
                  enlaces no quedan en el orden de tabulación. */}
              {estaAbierto && (
                <ul
                  id={`menu-${grupo.clave}`}
                  className="absolute top-full left-0 z-50 min-w-[13rem] border border-white/15 bg-black py-2 shadow-xl"
                >
                  {grupo.categorias.map((categoria) => (
                    <li key={categoria}>
                      <Link
                        href={rutaDeCategoria(categoria)}
                        onClick={() => setAbierto(null)}
                        className="block px-4 py-2.5 text-[11px] font-bold tracking-[0.15em] text-white/70 uppercase transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {categoria}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <Link
          href="/productos"
          onClick={() => setAbierto(null)}
          className="ml-auto px-2 py-2 text-[11px] font-bold tracking-[0.15em] text-white uppercase underline-offset-4 transition-colors hover:underline sm:px-3 sm:tracking-[0.2em]"
        >
          Todo el catálogo
        </Link>
      </div>
    </nav>
  );
}
