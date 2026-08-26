import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { actualizarProducto } from "@/actions/productos";
import ProductoForm from "@/components/admin/ProductoForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Editar Producto",
};

export default async function EditarProductoPage({
  params,
  searchParams,
}: PageProps<"/admin/productos/[id]">) {
  const { id } = await params;
  const { error: errorMensaje } = await searchParams;

  const supabase = await createClient();
  const { data: producto, error } = await supabase
    .from("productos")
    .select(
      "id, titulo, descripcion, precio, stock, categoria, tallas, imagenes",
    )
    .eq("id", id)
    .maybeSingle();

  // Un `id` que no es un UUID valido hace fallar la consulta (22P02), no la
  // deja vacia: ambos casos son un 404 desde el punto de vista del panel.
  if (error) {
    console.error("[productos] Error al cargar el producto:", error);
  }
  if (!producto) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <Link
          href="/admin/productos"
          className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>

        <h1 className="mt-4 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
          Editar Producto
        </h1>
        <p className="mt-2 truncate text-sm text-neutral-500">
          {producto.titulo}
        </p>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
      </header>

      {typeof errorMensaje === "string" && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {errorMensaje}
        </p>
      )}

      <ProductoForm
        action={actualizarProducto}
        productoId={producto.id}
        etiquetaBoton="Guardar Cambios"
        valores={{
          titulo: producto.titulo,
          descripcion: producto.descripcion ?? "",
          precio: producto.precio,
          stock: producto.stock,
          categoria: producto.categoria ?? "",
          // La BD devuelve text[]; el formulario trabaja con texto separado
          // por comas, igual que lo que `listaDeTexto` sabe volver a parsear.
          tallas: (producto.tallas ?? []).join(", "),
          imagenes: (producto.imagenes ?? []).join(", "),
        }}
      />
    </div>
  );
}
