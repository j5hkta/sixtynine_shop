import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import FiltroCategorias from "@/components/tienda/FiltroCategorias";
import ProductCard from "@/components/tienda/ProductCard";
import { CATEGORIAS, categoriaDesdeSlug, slugDeCategoria } from "@/lib/categorias";
import { createAnonClient } from "@/lib/supabase/anon";

/** ISR: ver el comentario en `src/app/(tienda)/page.tsx`. */
export const revalidate = 60;

/**
 * Una página estática por categoría, generada en el build.
 *
 * A diferencia de `generateStaticParams` del detalle de producto, esta no
 * consulta la base de datos: las categorías son una constante del código, así
 * que no hay nada que pueda fallar ni que dependa de las credenciales.
 */
export function generateStaticParams() {
  return CATEGORIAS.map((categoria) => ({ slug: slugDeCategoria(categoria) }));
}

/**
 * Un slug fuera de la lista no existe como página. Se responde 404 en vez de
 * mostrar un catálogo vacío, que daría a entender que la categoría existe pero
 * no tiene stock.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/productos/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const categoria = categoriaDesdeSlug(slug);

  if (!categoria) return { title: "Categoría no encontrada" };

  return {
    title: `${categoria} | Sixty Nine Skate & Apparel`,
    description: `${categoria} en el catálogo de Sixty Nine Skate & Apparel.`,
  };
}

/** Ver el comentario de `cargarPortada` en `src/app/(tienda)/page.tsx`. */
async function cargarCategoria(categoria: string) {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id, titulo, precio, categoria, imagenes")
      .eq("categoria", categoria)
      .eq("estado", "activo")
      .order("creado_en", { ascending: false });

    if (error) throw error;

    return { productos: data ?? [], error: null as string | null };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido.";
    console.error(`[tienda] No se pudo cargar la categoría ${categoria}:`, mensaje);
    return { productos: [], error: mensaje };
  }
}

export default async function CategoriaPage({
  params,
}: PageProps<"/productos/categoria/[slug]">) {
  const { slug } = await params;
  const categoria = categoriaDesdeSlug(slug);

  if (!categoria) {
    notFound();
  }

  const { productos, error } = await cargarCategoria(categoria);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="border-b border-neutral-200 pb-6">
        <Link
          href="/productos"
          className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase underline-offset-4 hover:underline"
        >
          Catálogo
        </Link>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-black uppercase sm:text-4xl">
          {categoria}
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          {productos.length} {productos.length === 1 ? "producto" : "productos"}.
        </p>
      </header>

      <FiltroCategorias activa={categoria} />

      {error && (
        <p
          role="alert"
          className="mt-10 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo cargar la categoría: {error}
        </p>
      )}

      {!error && productos.length === 0 && (
        <div className="mt-10 border border-dashed border-neutral-300 px-6 py-20 text-center">
          <p className="text-sm text-neutral-500">
            Todavía no hay productos en {categoria}.
          </p>
          <Link
            href="/productos"
            className="mt-6 inline-block bg-black px-6 py-3 text-[11px] font-bold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-80"
          >
            Ver todo el catálogo
          </Link>
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
