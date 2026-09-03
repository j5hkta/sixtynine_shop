import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, PackageCheck, PackageX } from "lucide-react";

import AccionesProducto from "@/components/tienda/AccionesProducto";
import GaleriaProducto from "@/components/tienda/GaleriaProducto";
import { calcularDescuento } from "@/lib/descuento";
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
    const { data, error } = await supabase.from("productos").select("id");

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
 * Sin filtro por estado, a proposito.
 *
 * Ya no existe 'borrador': `estado` lo calcula la base a partir del inventario.
 * Un producto agotado conserva su ficha —con el boton deshabilitado— para que
 * los enlaces compartidos no se conviertan en 404 en cuanto se vende la ultima
 * unidad. Del catalogo si desaparece: eso lo filtran las otras consultas.
 */
async function cargarProducto(id: string) {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, titulo, descripcion, precio, precio_original, inventario_tallas, categoria, imagenes, estado",
      )
      .eq("id", id)
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
  const inventario = producto.inventario_tallas ?? {};
  // `stock_total` no se pide en el select: sumar aqui las mismas claves que ya
  // viajan evita traer una columna mas solo para repetir la cuenta.
  const unidades = Object.values(inventario).reduce(
    (suma, n) => suma + (Number(n) || 0),
    0,
  );
  const hayStock = unidades > 0 && producto.estado !== "agotado";
  const descuento = calcularDescuento(
    producto.precio,
    producto.precio_original,
  );

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

          {descuento ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-4xl font-black text-red-600">
                  {moneda.format(producto.precio)}
                </p>
                <span className="bg-red-600 px-2.5 py-1.5 text-xs font-black tracking-[0.1em] text-white">
                  -{descuento.porcentaje}%
                </span>
              </div>

              <p className="mt-1 font-mono text-lg text-gray-400 line-through">
                {moneda.format(descuento.precioOriginal)}
              </p>

              <p className="mt-2 text-xs font-bold tracking-[0.15em] text-red-600 uppercase">
                Ahorras{" "}
                {moneda.format(descuento.precioOriginal - producto.precio)}
              </p>
            </div>
          ) : (
            <p className="mt-6 font-mono text-4xl font-black text-black">
              {moneda.format(producto.precio)}
            </p>
          )}

          <p className="mt-4 flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
            {hayStock ? (
              <>
                <PackageCheck className="h-4 w-4 text-black" aria-hidden />
                {/* Sin la cifra: enseñar "quedan 2" invita a esperar a que
                    bajen de precio, y enseñar "quedan 40" quita urgencia. El
                    dato exacto sólo lo necesita el panel. */}
                <span className="text-neutral-600">En stock</span>
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
              inventario={inventario}
              disponible={hayStock}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
