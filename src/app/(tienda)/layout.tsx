import Link from "next/link";
import NextTopLoader from "nextjs-toploader";

import Navbar from "@/components/tienda/Navbar";
import { CATEGORIAS, rutaDeCategoria } from "@/lib/categorias";

/**
 * Layout de la tienda pública.
 *
 * Vive en el grupo de rutas `(tienda)`, que no aparece en la URL: `/` y
 * `/productos` siguen siendo `/` y `/productos`. Está separado del layout raíz
 * para que el Navbar público no se cuele en `/admin` ni en `/login`.
 *
 * Estética outlet: fondo blanco, texto negro, bordes grises finos. Las únicas
 * zonas negras son las dos franjas del Navbar y el pie.
 */
export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      {/* Barra negra: sobre fondo blanco el amarillo neón no se distingue. */}
      <NextTopLoader
        color="#000000"
        height={3}
        showSpinner={false}
        shadow={false}
        easing="ease"
        speed={250}
      />

      <Navbar />

      <main className="flex-1">{children}</main>

      <footer className="mt-20 bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Sixty Nine"
                className="h-12 object-contain"
              />
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/50">
                Skate &amp; Apparel. Equipo real para quien se levanta y vuelve
                a intentarlo.
              </p>
            </div>

            <div>
              <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase">
                Catálogo
              </h2>
              <ul className="mt-4 space-y-2">
                {CATEGORIAS.slice(0, 5).map((categoria) => (
                  <li key={categoria}>
                    <Link
                      href={rutaDeCategoria(categoria)}
                      className="text-xs text-white/60 transition-colors hover:text-white"
                    >
                      {categoria}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase">
                Tienda
              </h2>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/productos"
                    className="text-xs text-white/60 transition-colors hover:text-white"
                  >
                    Todo el catálogo
                  </Link>
                </li>
                <li>
                  <Link
                    href="/carrito"
                    className="text-xs text-white/60 transition-colors hover:text-white"
                  >
                    Mi carrito
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase">
                Contacto
              </h2>
              <p className="mt-4 text-xs text-white/60">
                Envíos a todo el Perú.
                <br />
                Pagos con Mercado Pago.
              </p>
            </div>
          </div>

          {/* Sin enlace al panel: se entra por la ruta secreta de `ADMIN_PATH`
              (ver `src/proxy.ts`). Un enlace aquí delataría su existencia. */}
          <div className="mt-12 border-t border-white/15 pt-6">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Sixty Nine. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
