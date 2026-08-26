import { AlertTriangle } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Catálogo | Sixty Nine Skate & Apparel",
  description:
    "Todo el catálogo de Sixty Nine: tablas, ruedas, trucks, zapatillas y ropa.",
};

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: productos, error } = await supabase
    .from("productos")
    .select("id, titulo, precio, categoria, imagenes")
    .eq("estado", "activo")
    .order("creado_en", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Todo el equipo
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tighter text-white uppercase sm:text-5xl">
          Catálogo
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />

        {productos && productos.length > 0 && (
          <p className="mt-4 text-sm text-neutral-500">
            {productos.length}{" "}
            {productos.length === 1 ? "producto" : "productos"} disponibles.
          </p>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className="mt-10 flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo cargar el catálogo: {error.message}
        </p>
      )}

      {!error && productos && productos.length === 0 && (
        <p className="mt-10 border border-dashed border-ink-line bg-ink-soft px-6 py-20 text-center text-sm text-neutral-500">
          Todavía no hay productos publicados. Vuelve pronto.
        </p>
      )}

      {productos && productos.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
