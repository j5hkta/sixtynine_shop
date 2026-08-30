import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * ISR: la página se sirve desde caché y, como mucho una vez cada 60 s, la
 * primera visita tras expirar dispara la regeneración en segundo plano. Nadie
 * espera por ella — quien llega recibe la versión anterior.
 *
 * Al guardar el banner desde el panel se llama a `revalidatePath("/", "page")`,
 * así que ese cambio no espera los 60 s.
 */
export const revalidate = 60;

export const metadata = {
  description:
    "Tablas, ruedas, zapatillas y ropa para los que viven sobre cuatro ruedas.",
};

const CAMPOS_TARJETA = "id, titulo, precio, categoria, imagenes";

type DatosPortada = {
  ultimos: {
    id: string;
    titulo: string;
    precio: number;
    categoria: string | null;
    imagenes: string[] | null;
  }[];
  banner: { banner_imagen: string | null; banner_link: string | null } | null;
  error: string | null;
};

/**
 * Con ISR la página se prerenderiza durante el `next build`, así que un fallo
 * de Supabase (o unas credenciales sin configurar) tumbaría el build entero.
 * Se degrada al estado de error que la página ya sabe pintar; la siguiente
 * revalidación lo arregla sola en cuanto la base de datos responda.
 */
async function cargarPortada(): Promise<DatosPortada> {
  try {
    const supabase = createAnonClient();

    const [productos, config] = await Promise.all([
      supabase
        .from("productos")
        .select(CAMPOS_TARJETA)
        .eq("estado", "activo")
        .order("creado_en", { ascending: false })
        .limit(8),
      supabase
        .from("configuracion_tienda")
        .select("banner_imagen, banner_link")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (productos.error) throw productos.error;

    // Un fallo leyendo el banner no debe tumbar la portada entera: sin banner
    // la página sigue siendo perfectamente usable.
    if (config.error) {
      console.error("[tienda] No se pudo leer el banner:", config.error.message);
    }

    return {
      ultimos: productos.data ?? [],
      banner: config.data ?? null,
      error: null,
    };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido.";
    console.error("[tienda] No se pudo cargar la portada:", mensaje);
    return { ultimos: [], banner: null, error: mensaje };
  }
}

export default async function HomePage() {
  const { ultimos, banner, error } = await cargarPortada();

  const bannerLink = banner?.banner_link ?? "/productos";

  return (
    <>
      {/* Banner principal, a todo el ancho */}
      <section>
        <Link href={bannerLink} className="block w-full">
          {banner?.banner_imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.banner_imagen}
              alt="Ver la colección"
              className="h-auto w-full object-cover"
            />
          ) : (
            // Respaldo mientras no haya banner subido desde /admin/apariencia.
            <div className="flex min-h-[45vh] w-full flex-col items-center justify-center gap-6 bg-black px-4 py-24 text-center text-white">
              <h1 className="text-5xl leading-[0.9] font-black tracking-tighter uppercase sm:text-7xl">
                Outlet
                <br />
                Sixty Nine
              </h1>
              <p className="max-w-md text-sm text-white/60">
                Tablas, ruedas y ropa a precio de liquidación.
              </p>
              <span className="border border-white px-8 py-3 text-[11px] font-bold tracking-[0.25em] uppercase">
                Ver la colección
              </span>
            </div>
          )}
        </Link>
      </section>

      {/* Cuadrícula de productos */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-neutral-200 pb-5">
          <h2 className="text-2xl font-black tracking-tight text-black uppercase sm:text-3xl">
            Últimos Ingresos
          </h2>

          <Link
            href="/productos"
            className="text-[11px] font-bold tracking-[0.2em] text-black uppercase underline-offset-4 hover:underline"
          >
            Ver todo
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-10 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            No se pudo cargar el catálogo: {error}
          </p>
        )}

        {!error && ultimos.length === 0 && (
          <p className="mt-10 border border-dashed border-neutral-300 px-6 py-20 text-center text-sm text-neutral-500">
            Todavía no hay productos publicados. Vuelve pronto.
          </p>
        )}

        {ultimos.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ultimos.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
