import Link from "next/link";

import { CATEGORIAS, rutaDeCategoria } from "@/lib/categorias";

const base =
  "border px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors";
const activo = "border-black bg-black text-white";
const inactivo =
  "border-neutral-300 text-neutral-600 hover:border-black hover:text-black";

/**
 * Chips de categoría, compartidos por `/productos` y por cada
 * `/productos/categoria/[slug]`.
 *
 * Server Component sin estado: la categoría activa llega por prop desde la
 * ruta, no de `useSearchParams`. Eso es lo que permite que ambas páginas sigan
 * prerenderizándose de forma estática.
 */
export default function FiltroCategorias({
  activa = null,
}: {
  activa?: string | null;
}) {
  return (
    <nav aria-label="Filtrar por categoría" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/productos"
            aria-current={activa === null ? "page" : undefined}
            className={`${base} ${activa === null ? activo : inactivo}`}
          >
            Todo
          </Link>
        </li>

        {CATEGORIAS.map((categoria) => {
          const esActiva = activa === categoria;
          return (
            <li key={categoria}>
              <Link
                href={rutaDeCategoria(categoria)}
                aria-current={esActiva ? "page" : undefined}
                className={`${base} ${esActiva ? activo : inactivo}`}
              >
                {categoria}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
