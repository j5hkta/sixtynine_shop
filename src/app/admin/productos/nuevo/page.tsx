import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { crearProducto } from "@/actions/productos";
import BotonGuardar from "@/components/admin/BotonGuardar";

export const metadata = {
  title: "Nuevo Producto",
};

const CATEGORIAS = [
  "Tablas",
  "Ruedas",
  "Trucks",
  "Rodamientos",
  "Zapatillas",
  "Poleras",
  "Polerones",
  "Gorros",
  "Accesorios",
];

const inputClase =
  "w-full border border-ink-line bg-ink-soft px-4 py-3 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none";

const labelClase =
  "block text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase";

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

      <form
        action={crearProducto}
        className="space-y-6 border border-ink-line bg-ink-soft p-6 sm:p-8"
      >
        <div className="space-y-2">
          <label htmlFor="titulo" className={labelClase}>
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            type="text"
            required
            maxLength={120}
            placeholder="Tabla completa 8.0 Street"
            className={inputClase}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="descripcion" className={labelClase}>
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={4}
            placeholder="Maple canadiense de 7 capas, lija incluida..."
            className={`${inputClase} resize-y`}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="precio" className={labelClase}>
              Precio
            </label>
            <input
              id="precio"
              name="precio"
              type="number"
              required
              min={0}
              step={1}
              defaultValue={0}
              className={`${inputClase} font-mono`}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="stock" className={labelClase}>
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              required
              min={0}
              step={1}
              defaultValue={0}
              className={`${inputClase} font-mono`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="categoria" className={labelClase}>
            Categoría
          </label>
          <select
            id="categoria"
            name="categoria"
            defaultValue=""
            className={inputClase}
          >
            <option value="">Sin categoría</option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <p className="border-t border-ink-line pt-5 text-xs text-neutral-600">
          Tallas, imágenes y estado toman sus valores por defecto de la base de
          datos (<code>{"{}"}</code>, <code>{"{}"}</code> y{" "}
          <code>activo</code>). Se editarán desde la ficha del producto.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <BotonGuardar>Guardar Producto</BotonGuardar>

          <Link
            href="/admin/productos"
            className="px-5 py-3.5 text-xs font-bold tracking-[0.15em] text-neutral-500 uppercase transition-colors hover:text-white"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
