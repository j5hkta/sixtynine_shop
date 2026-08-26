import Link from "next/link";
import { AlertTriangle, PackagePlus, Plus } from "lucide-react";

import BotonEliminarProducto from "@/components/admin/BotonEliminarProducto";
import { createClient } from "@/lib/supabase/server";
import type { EstadoProducto } from "@/lib/supabase/types";

export const metadata = {
  title: "Productos",
};

// Si tu tienda no opera en pesos chilenos, cambia locale y currency aquí.
const moneda = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const fecha = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const estiloEstado: Record<EstadoProducto, string> = {
  activo: "border-neon/40 bg-neon/10 text-neon",
  borrador: "border-ink-line bg-white/5 text-neutral-400",
  agotado: "border-red-500/40 bg-red-500/10 text-red-400",
};

export default async function ProductosPage() {
  const supabase = await createClient();
  const { data: productos, error } = await supabase
    .from("productos")
    .select("id, titulo, descripcion, precio, stock, categoria, estado, creado_en")
    .order("creado_en", { ascending: false });

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
            Catálogo
          </p>
          <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
            Productos
          </h1>
          <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
        </div>

        <Link
          href="/admin/productos/nuevo"
          className="flex items-center gap-2 bg-neon px-5 py-3 text-xs font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nuevo Producto
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo cargar el catálogo: {error.message}
        </p>
      )}

      {/* Listado */}
      {!error && productos && productos.length === 0 ? (
        <div className="flex flex-col items-center border border-dashed border-ink-line bg-ink-soft px-6 py-16 text-center">
          <PackagePlus className="h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-4 text-sm font-bold tracking-wide text-white uppercase">
            Todavía no hay productos
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Crea el primero para que aparezca en la tienda.
          </p>
          <Link
            href="/admin/productos/nuevo"
            className="mt-6 bg-neon px-5 py-3 text-xs font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white"
          >
            + Nuevo Producto
          </Link>
        </div>
      ) : null}

      {productos && productos.length > 0 && (
        <div className="overflow-x-auto border border-ink-line bg-ink-soft">
          <table className="w-full min-w-[54rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left">
                {["Producto", "Categoría", "Precio", "Stock", "Estado", "Creado"].map(
                  (columna) => (
                    <th
                      key={columna}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
                    >
                      {columna}
                    </th>
                  ),
                )}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {productos.map((producto) => (
                <tr
                  key={producto.id}
                  className="border-b border-ink-line/60 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="max-w-xs px-4 py-4">
                    <p className="truncate font-bold text-white">
                      {producto.titulo}
                    </p>
                    {producto.descripcion && (
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {producto.descripcion}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-4 text-neutral-400">
                    {producto.categoria ?? "—"}
                  </td>

                  <td className="px-4 py-4 font-mono font-bold whitespace-nowrap text-white">
                    {moneda.format(producto.precio)}
                  </td>

                  <td
                    className={`px-4 py-4 font-mono font-bold ${
                      producto.stock <= 5 ? "text-red-400" : "text-neutral-300"
                    }`}
                  >
                    {producto.stock}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-block border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${estiloEstado[producto.estado]}`}
                    >
                      {producto.estado}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs whitespace-nowrap text-neutral-500">
                    {fecha.format(new Date(producto.creado_en))}
                  </td>

                  <td className="px-4 py-4">
                    <BotonEliminarProducto
                      id={producto.id}
                      titulo={producto.titulo}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
