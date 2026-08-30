import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, PackageCheck, PackageX } from "lucide-react";

import AccionesProducto from "@/components/tienda/AccionesProducto";
import GaleriaProducto from "@/components/tienda/GaleriaProducto";
import { moneda } from "@/lib/formato";
import { createAnonClient } from "@/lib/supabase/anon";

/** ISR: ver el comentario en `src/app/(tienda)/page.tsx`. */
export const revalidate = 60;

/**
 * Prerenderiza en el build una página por producto publicado.
 *
 * Un id que no esté en esta lista se genera bajo demanda y se cachea igual
 * (`dynamicParams` es `true` por defecto), así que un producto creado después
 * del build sigue funcionando.
 *
 * El try/catch es deliberado: sin `.env.local` configurado, o con Supabase
 * caído, un fallo aquí tumbaría el `next build` entero. Devolver una lista
 * vacía degrada a generación bajo demanda, que es exactamente el
 * comportamiento anterior.
 */
export async function generateStaticParams() {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id")
      .neq("estado", "borrador");

    if (error) throw error;

    return (data ?? []).map(({ id }) => ({ id }));
  } catch (e) {
    console.warn(
      "[tienda] No se pudieron prerenderizar los productos; se generarán bajo demanda.",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

/**
 * La politica RLS de lectura es abierta (la tienda no tiene sesion), asi que
 * ocultar los borradores es responsabilidad de la app: sin este filtro, la URL
 * de un producto sin publicar seria accesible para cualquiera que la adivine.
 */
async function cargarProducto(id: string) {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, titulo, descripcion, precio, stock, categoria, tallas, imagenes, estado",
      )
      .eq("id", id)
      .neq("estado", "borrador")
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (e) {
    // Se degrada a 404 en lugar de romper el prerender (ver `cargarUltimos` en
    // `src/app/(tienda)/page.tsx`). El log distingue un fallo real de un id
    // que simplemente no existe.
    console.error(
      "[tienda] Error al cargar el producto:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/productos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const producto = await cargarProducto(id);

  if (!producto) return { title: "Producto no encontrado" };

  return {
    title: producto.titulo,
    description: producto.descripcion ?? undefined,
  };
}

export default async function ProductoDetallePage({
  params,
}: PageProps<"/productos/[id]">) {
  const { id } = await params;
  const producto = await cargarProducto(id);

  if (!producto) {
    notFound();
  }

  const imagenes = producto.imagenes ?? [];
  const tallas = producto.tallas ?? [];
  const hayStock = producto.stock > 0 && producto.estado !== "agotado";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver al catálogo
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <GaleriaProducto imagenes={imagenes} titulo={producto.titulo} />

        <div>
          {producto.categoria && (
            <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
              {producto.categoria}
            </p>
          )}

          <h1 className="mt-3 text-3xl leading-tight font-black tracking-tighter text-black uppercase sm:text-4xl">
            {producto.titulo}
          </h1>

          <p className="mt-6 font-mono text-4xl font-black text-black">
            {moneda.format(producto.precio)}
          </p>

          <p className="mt-4 flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
            {hayStock ? (
              <>
                <PackageCheck className="h-4 w-4 text-black" aria-hidden />
                <span className="text-neutral-600">
                  En stock — {producto.stock}{" "}
                  {producto.stock === 1 ? "unidad" : "unidades"}
                </span>
              </>
            ) : (
              <>
                <PackageX className="h-4 w-4 text-red-600" aria-hidden />
                <span className="text-red-600">Agotado</span>
              </>
            )}
          </p>

          {producto.descripcion && (
            <p className="mt-8 border-t border-neutral-200 pt-8 text-sm leading-relaxed text-neutral-600">
              {producto.descripcion}
            </p>
          )}

          <div className="mt-8 border-t border-neutral-200 pt-8">
            <AccionesProducto
              id={producto.id}
              titulo={producto.titulo}
              precio={producto.precio}
              imagen={imagenes[0] ?? null}
              tallas={tallas}
              stock={hayStock ? producto.stock : 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
