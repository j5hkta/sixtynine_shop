import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { crearProducto } from "@/actions/productos";
import ProductoForm from "@/components/admin/ProductoForm";

export const metadata = {
  title: "Nuevo Producto",
};

export default async function NuevoProductoPage({
  searchParams,
}: PageProps<"/admin/productos/nuevo">) {
  // `crearProducto` devuelve aquí con `?error=...` cuando la validación o el
  // insert fallan (ver src/actions/productos.ts).
  const { error } = await searchParams;

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
          Nuevo Producto
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
      </header>

      {typeof error === "string" && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <ProductoForm action={crearProducto} etiquetaBoton="Guardar Producto" />
    </div>
  );
}
