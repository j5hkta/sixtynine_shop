import Link from "next/link";
import { ImageUp } from "lucide-react";

import BotonGuardar from "@/components/admin/BotonGuardar";
import EditorInventario from "@/components/admin/EditorInventario";
import { CATEGORIAS } from "@/lib/categorias";
import {
  DATOS_SECCION,
  SECCIONES_PORTADA,
  type SeccionPortada,
} from "@/lib/secciones";
import type { EstadoProducto } from "@/lib/supabase/types";

const ESTADOS: { valor: EstadoProducto; etiqueta: string; ayuda: string }[] = [
  { valor: "activo", etiqueta: "Activo", ayuda: "visible en la tienda" },
  { valor: "borrador", etiqueta: "Borrador", ayuda: "oculto, en preparación" },
  { valor: "agotado", etiqueta: "Agotado", ayuda: "visible pero sin venta" },
];

const inputClase =
  "w-full border border-ink-line bg-ink-soft px-4 py-3 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none";

const labelClase =
  "block text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase";

const ayudaClase = "text-xs text-neutral-600";

/** Valores iniciales del formulario, ya normalizados por la página. */
export type ValoresProducto = {
  titulo: string;
  descripcion: string;
  precio: number;
  /** Vacío si el producto no está rebajado. */
  precioOriginal: string;
  /** Unidades por talla. Vacio en el alta. */
  inventario: Record<string, number>;
  categoria: string;
  /** URLs públicas ya guardadas en el producto. */
  imagenes: string[];
  estado: EstadoProducto;
  seccionPortada: SeccionPortada;
};

const VACIO: ValoresProducto = {
  titulo: "",
  descripcion: "",
  precio: 0,
  precioOriginal: "",
  inventario: {},
  categoria: "",
  imagenes: [],
  estado: "activo",
  seccionPortada: "ninguna",
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
  // como opción para no perderla silenciosamente al guardar. Es justo lo que
  // pasa con los productos que quedaron en "Polerones": el select los muestra
  // con su valor actual en vez de reasignarlos solo.
  const enLaLista = (CATEGORIAS as readonly string[]).includes(
    valores.categoria,
  );

  const categorias: readonly string[] =
    valores.categoria && !enLaLista
      ? [valores.categoria, ...CATEGORIAS]
      : CATEGORIAS;

  return (
    <form
      action={action}
      encType="multipart/form-data"
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
          className={`${inputClase} font-mono sm:max-w-[calc(50%-0.75rem)]`}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="precio_original" className={labelClase}>
          Precio Original (Sin descuento)
        </label>
        <input
          id="precio_original"
          name="precio_original"
          type="number"
          min={0}
          step={0.01}
          defaultValue={valores.precioOriginal}
          placeholder="Vacío si no hay descuento"
          aria-describedby="precio-original-ayuda"
          className={`${inputClase} font-mono sm:max-w-[calc(50%-0.75rem)]`}
        />
        <p id="precio-original-ayuda" className={ayudaClase}>
          Opcional. Si lo rellenas, la tienda muestra este importe tachado, el
          precio actual en rojo y un badge con el descuento. Tiene que ser{" "}
          <strong>mayor</strong> que el precio; el cobro siempre usa el precio
          actual.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
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
          <label htmlFor="estado" className={labelClase}>
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={valores.estado}
            className={inputClase}
          >
            {ESTADOS.map(({ valor, etiqueta, ayuda }) => (
              <option key={valor} value={valor}>
                {etiqueta} — {ayuda}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="seccion_portada" className={labelClase}>
          Sección en Portada
        </label>
        <select
          id="seccion_portada"
          name="seccion_portada"
          defaultValue={valores.seccionPortada}
          aria-describedby="seccion-ayuda"
          className={inputClase}
        >
          {SECCIONES_PORTADA.map((seccion) => (
            <option key={seccion} value={seccion}>
              {DATOS_SECCION[seccion].etiqueta}
            </option>
          ))}
        </select>
        <p id="seccion-ayuda" className={ayudaClase}>
          En qué franja de la página principal aparece el producto. Es
          independiente de su categoría: puedes poner una tabla en «Completos»
          si quieres destacarla ahí. Los productos en <code>borrador</code> no
          salen en la portada aunque tengan sección.
        </p>
      </div>

      <div className="space-y-2">
        <span className={labelClase}>Inventario por talla</span>

        <EditorInventario inicial={valores.inventario} />

        <p className={ayudaClase}>
          Cada fila es una variante con su propio stock. Una talla en{" "}
          <code>0</code> sigue apareciendo en la ficha, tachada: eso distingue
          «agotada, vuelve pronto» de «no existe». Para skates y accesorios usa
          la plantilla <strong>Sin tallas</strong>.
        </p>
      </div>

      {/* Galería ya guardada: sólo aparece al editar. */}
      {valores.imagenes.length > 0 && (
        <fieldset className="space-y-3">
          <legend className={labelClase}>Imágenes actuales</legend>

          <ul className="space-y-2">
            {valores.imagenes.map((url) => (
              <li key={url}>
                <label className="flex items-center gap-3 border border-ink-line bg-ink p-2 transition-colors hover:border-neon/40">
                  <input
                    type="checkbox"
                    name="imagenes_actuales"
                    value={url}
                    defaultChecked
                    className="h-4 w-4 shrink-0 accent-[#ffe600]"
                  />
                  {/* Miniaturas de un bucket cuyo host depende de la variable
                      de entorno; `next/image` exigiria declararlo en
                      `images.remotePatterns` en tiempo de build. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-12 w-12 shrink-0 border border-ink-line object-cover"
                  />
                  <span className="truncate font-mono text-xs text-neutral-500">
                    {url.split("/").pop()}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <p className={ayudaClase}>
            Desmarca una imagen para quitarla del producto al guardar. El
            archivo permanece en el bucket.
          </p>
        </fieldset>
      )}

      <div className="space-y-2">
        <label htmlFor="imagenes_upload" className={labelClase}>
          {valores.imagenes.length > 0 ? "Añadir imágenes" : "Imágenes"}
        </label>

        <label
          htmlFor="imagenes_upload"
          className="flex cursor-pointer items-center gap-3 border border-dashed border-ink-line bg-ink px-4 py-5 transition-colors hover:border-neon/50 hover:bg-neon/5"
        >
          <ImageUp className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
          <span className="text-sm text-neutral-500">
            Selecciona uno o varios archivos
          </span>
        </label>

        <input
          id="imagenes_upload"
          name="imagenes_upload"
          type="file"
          multiple
          accept="image/*"
          aria-describedby="imagenes-ayuda"
          className="block w-full text-xs text-neutral-500 file:mr-4 file:border-0 file:bg-neon file:px-4 file:py-2 file:text-xs file:font-black file:tracking-widest file:text-ink file:uppercase hover:file:bg-white"
        />

        <p id="imagenes-ayuda" className={ayudaClase}>
          JPG, PNG, WEBP, AVIF o GIF. Máximo 5 MB por archivo y ~12 MB por
          envío. Se suben al bucket <code>productos</code> al guardar; la
          primera imagen se usa como portada.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-line pt-6">
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
