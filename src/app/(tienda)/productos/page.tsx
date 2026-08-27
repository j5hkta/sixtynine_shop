import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import { CATEGORIAS, esCategoriaValida } from "@/lib/categorias";
import { createAnonClient } from "@/lib/supabase/anon";

export const metadata = {
  title: "Catálogo | Sixty Nine Skate & Apparel",
  description:
    "Todo el catálogo de Sixty Nine: tablas, ruedas, trucks, zapatillas y ropa.",
};

/** Ver el comentario de `cargarPortada` en `src/app/(tienda)/page.tsx`. */
async function cargarCatalogo(categoria: string | null) {
  try {
    const supabase = createAnonClient();

    let consulta = supabase
      .from("productos")
      .select("id, titulo, precio, categoria, imagenes")
      .eq("estado", "activo");

    if (categoria) {
      consulta = consulta.eq("categoria", categoria);
    }

    const { data, error } = await consulta.order("creado_en", {
      ascending: false,
    });

    if (error) throw error;

    return { productos: data ?? [], error: null as string | null };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido.";
    console.error("[tienda] No se pudo cargar el catálogo:", mensaje);
    return { productos: [], error: mensaje };
  }
}

export default async function CatalogoPage({
  searchParams,
}: PageProps<"/productos">) {
  const params = await searchParams;
  const solicitada =
    typeof params.categoria === "string" ? params.categoria : null;

  // Sólo se aceptan categorías de la lista: cualquier otro valor se ignora y
  // se muestra el catálogo completo, en vez de una página vacía sin explicación.
  const categoria =
    solicitada && esCategoriaValida(solicitada) ? solicitada : null;

  const { productos, error } = await cargarCatalogo(categoria);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-black uppercase sm:text-4xl">
          {categoria ?? "Todo el catálogo"}
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          {productos.length}{" "}
          {productos.length === 1 ? "producto" : "productos"}
          {categoria ? ` en ${categoria}` : " disponibles"}.
        </p>
      </header>

      {/* Filtros por categoría */}
      <nav aria-label="Filtrar por categoría" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/productos"
              aria-current={categoria === null ? "page" : undefined}
              className={`border px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
                categoria === null
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 text-neutral-600 hover:border-black hover:text-black"
              }`}
            >
              Todo
            </Link>
          </li>

          {CATEGORIAS.map((opcion) => {
            const activa = categoria === opcion;
            return (
              <li key={opcion}>
                <Link
                  href={`/productos?categoria=${encodeURIComponent(opcion)}`}
                  aria-current={activa ? "page" : undefined}
                  className={`border px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
                    activa
                      ? "border-black bg-black text-white"
                      : "border-neutral-300 text-neutral-600 hover:border-black hover:text-black"
                  }`}
                >
                  {opcion}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

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
        <div className="mt-10 border border-dashed border-neutral-300 px-6 py-20 text-center">
          <p className="text-sm text-neutral-500">
            {categoria
              ? `Todavía no hay productos en ${categoria}.`
              : "Todavía no hay productos publicados. Vuelve pronto."}
          </p>
          {categoria && (
            <Link
              href="/productos"
              className="mt-6 inline-block bg-black px-6 py-3 text-[11px] font-bold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-80"
            >
              Ver todo el catálogo
            </Link>
          )}
        </div>
      )}

      {productos.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
