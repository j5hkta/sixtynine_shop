import { AlertTriangle } from "lucide-react";

import FiltroCategorias from "@/components/tienda/FiltroCategorias";
import ProductCard from "@/components/tienda/ProductCard";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * ISR: ver el comentario en `src/app/(tienda)/page.tsx`.
 *
 * Esta página no lee `searchParams`: el filtro por categoría vive en rutas
 * propias (`/productos/categoria/[slug]`), prerenderizadas una por categoría.
 * Leer un query param aquí volvería la página dinámica y la sacaría del caché.
 */
export const revalidate = 60;

export const metadata = {
  title: "Catálogo",
  description:
    "Todo el catálogo de Sixty Nine: tablas, ruedas, trucks, zapatillas y ropa.",
};

/** Ver el comentario de `cargarPortada` en `src/app/(tienda)/page.tsx`. */
async function cargarCatalogo() {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id, titulo, precio, precio_original, categoria, imagenes")
      .eq("estado", "activo")
      // Los agotados salen del catálogo solos, sin que nadie los toque.
      .gt("stock_total", 0)
      .order("creado_en", { ascending: false });

    if (error) throw error;

    return { productos: data ?? [], error: null as string | null };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido.";
    console.error("[tienda] No se pudo cargar el catálogo:", mensaje);
    return { productos: [], error: mensaje };
  }
}

export default async function CatalogoPage() {
  const { productos, error } = await cargarCatalogo();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-black uppercase sm:text-4xl">
          Todo el catálogo
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          {productos.length} {productos.length === 1 ? "producto" : "productos"}{" "}
          disponibles.
        </p>
      </header>

      <FiltroCategorias />

      {error && (
        <p
          role="alert"
          className="mt-10 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo cargar el catálogo: {error}
        </p>
      )}

      {!error && productos.length === 0 && (
        <p className="mt-10 border border-dashed border-neutral-300 px-6 py-20 text-center text-sm text-neutral-500">
          Todavía no hay productos publicados. Vuelve pronto.
        </p>
      )}

      {productos.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
