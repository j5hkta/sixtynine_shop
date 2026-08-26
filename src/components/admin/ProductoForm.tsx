import Link from "next/link";

import BotonGuardar from "@/components/admin/BotonGuardar";

export const CATEGORIAS = [
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

const ayudaClase = "text-xs text-neutral-600";

/** Valores iniciales del formulario, ya normalizados a string por la página. */
export type ValoresProducto = {
  titulo: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  /** Separadas por coma, ej. "S, M, L". */
  tallas: string;
  /** Separadas por coma, ej. "url1.jpg, url2.jpg". */
  imagenes: string;
};

const VACIO: ValoresProducto = {
  titulo: "",
  descripcion: "",
  precio: 0,
  stock: 0,
  categoria: "",
  tallas: "",
  imagenes: "",
};

type ProductoFormProps = {
  /** Server Action: `crearProducto` o `actualizarProducto`. */
  action: (formData: FormData) => Promise<void>;
  /** Presente sólo al editar; se envía como input oculto. */
  productoId?: string;
  valores?: ValoresProducto;
  etiquetaBoton: string;
};

/**
 * Formulario compartido por el alta y la edición de productos.
 *
 * Es un Server Component: la Server Action llega por prop y sólo el botón de
 * guardar se hidrata en el cliente (ver `BotonGuardar`).
 */
export default function ProductoForm({
  action,
  productoId,
  valores = VACIO,
  etiquetaBoton,
}: ProductoFormProps) {
  // Si el producto tiene una categoría que ya no está en la lista, se conserva
  // como opción para no perderla silenciosamente al guardar.
  const categorias =
    valores.categoria && !CATEGORIAS.includes(valores.categoria)
      ? [valores.categoria, ...CATEGORIAS]
      : CATEGORIAS;

  return (
    <form
      action={action}
      className="space-y-6 border border-ink-line bg-ink-soft p-6 sm:p-8"
    >
      {productoId && <input type="hidden" name="id" value={productoId} />}

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
          defaultValue={valores.titulo}
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
          defaultValue={valores.descripcion}
          placeholder="Maple canadiense de 7 capas, lija incluida..."
          className={`${inputClase} resize-y`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="precio" className={labelClase}>
            Precio (S/)
          </label>
          <input
            id="precio"
            name="precio"
            type="number"
            required
            min={0}
            step={0.01}
            defaultValue={valores.precio}
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
            defaultValue={valores.stock}
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
          defaultValue={valores.categoria}
          className={inputClase}
        >
          <option value="">Sin categoría</option>
          {categorias.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="tallas" className={labelClase}>
          Tallas Disponibles
        </label>
        <input
          id="tallas"
          name="tallas"
          type="text"
          defaultValue={valores.tallas}
          placeholder="S, M, L"
          aria-describedby="tallas-ayuda"
          className={inputClase}
        />
        <p id="tallas-ayuda" className={ayudaClase}>
          Separa los valores por comas. Ej: <code>S, M, L</code> o{" "}
          <code>7.5, 8.0, 8.25</code>. Déjalo vacío si no aplica.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="imagenes" className={labelClase}>
          URLs de Imágenes
        </label>
        <input
          id="imagenes"
          name="imagenes"
          type="text"
          defaultValue={valores.imagenes}
          placeholder="url1.jpg, url2.jpg"
          aria-describedby="imagenes-ayuda"
          className={inputClase}
        />
        <p id="imagenes-ayuda" className={ayudaClase}>
          Separa las URLs por comas. Ej:{" "}
          <code>https://.../tabla-1.jpg, https://.../tabla-2.jpg</code>. La
          primera se usa como portada.
        </p>
      </div>

      <p className="border-t border-ink-line pt-5 text-xs text-neutral-600">
        El estado del producto (<code>activo</code>, <code>borrador</code>,{" "}
        <code>agotado</code>) se gestiona aparte y no se modifica desde aquí.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <BotonGuardar>{etiquetaBoton}</BotonGuardar>

        <Link
          href="/admin/productos"
          className="px-5 py-3.5 text-xs font-bold tracking-[0.15em] text-neutral-500 uppercase transition-colors hover:text-white"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
