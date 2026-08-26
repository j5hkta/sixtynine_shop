import Link from "next/link";

import Navbar from "@/components/tienda/Navbar";

/**
 * Layout de la tienda pública.
 *
 * Vive en el grupo de rutas `(tienda)`, que no aparece en la URL: `/` y
 * `/productos` siguen siendo `/` y `/productos`. Está separado del layout raíz
 * para que el Navbar público no se cuele en `/admin` ni en `/login`.
 */
export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-neutral-200">
      <Navbar />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center bg-neon font-mono text-xs font-black text-ink">
              69
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
              Sixty Nine Skate &amp; Apparel
            </span>
          </div>

          <p className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} Sixty Nine. Todos los derechos
            reservados.
          </p>

          <Link
            href="/admin"
            className="text-[10px] font-bold tracking-[0.2em] text-neutral-600 uppercase transition-colors hover:text-neon"
          >
            Panel
          </Link>
        </div>
      </footer>
    </div>
  );
}
