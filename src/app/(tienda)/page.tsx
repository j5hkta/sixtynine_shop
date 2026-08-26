import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sixty Nine Skate & Apparel Store",
  description:
    "Tablas, ruedas, zapatillas y ropa para los que viven sobre cuatro ruedas.",
};

const CAMPOS_TARJETA = "id, titulo, precio, categoria, imagenes";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: ultimos, error } = await supabase
    .from("productos")
    .select(CAMPOS_TARJETA)
    .eq("estado", "activo")
    .order("creado_en", { ascending: false })
    .limit(4);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-20 h-96 w-96 rounded-full bg-neon/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <p className="text-[11px] font-bold tracking-[0.35em] text-neon uppercase">
            Est. Lima — Skate &amp; Apparel
          </p>

          <h1 className="mt-6 text-5xl leading-[0.9] font-black tracking-tighter text-white uppercase sm:text-7xl lg:text-8xl">
            La calle
            <br />
            no perdona
            <span className="text-neon">.</span>
          </h1>

          <p className="mt-8 max-w-lg text-base leading-relaxed text-neutral-400 sm:text-lg">
            Tablas que aguantan, ruedas que no se rinden y ropa que sobrevive a
            la caída. Equipo real para quien se levanta y vuelve a intentarlo.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/productos"
              className="flex items-center gap-2 bg-neon px-8 py-4 text-xs font-black tracking-[0.2em] text-ink uppercase transition-colors hover:bg-white"
            >
              Ver Colección
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>

            <span className="h-1 w-16 bg-neon" aria-hidden />
          </div>
        </div>
      </section>

      {/* Últimos ingresos */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
              Recién llegado
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tighter text-white uppercase sm:text-4xl">
              Últimos Ingresos
            </h2>
            <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
          </div>

          <Link
            href="/productos"
            className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neon"
          >
            Ver todo →
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-10 flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            No se pudo cargar el catálogo: {error.message}
          </p>
        )}

        {!error && ultimos && ultimos.length === 0 && (
          <p className="mt-10 border border-dashed border-ink-line bg-ink-soft px-6 py-16 text-center text-sm text-neutral-500">
            Todavía no hay productos publicados. Vuelve pronto.
          </p>
        )}

        {ultimos && ultimos.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ultimos.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
