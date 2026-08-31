import Link from "next/link";

import ProductCard, { type ProductoTarjeta } from "./ProductCard";

/**
 * Cabecera común de las franjas de la portada.
 *
 * Vive aquí y no duplicada en cada sección para que el título, la línea
 * inferior y el «Ver todo» sean idénticos en todas. `SeccionRopa` la importa
 * desde el cliente y esta desde el servidor: al no tener interactividad, vale
 * para las dos.
 */
export function CabeceraSeccion({
  titulo,
  verTodo,
  children,
}: {
  titulo: string;
  /** Ruta del enlace «Ver todo». Sin ella no se pinta el enlace. */
  verTodo?: string | null;
  /** Controles extra bajo el título, como las pestañas de ropa. */
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-200 pb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-black uppercase sm:text-3xl">
          {titulo}
        </h2>

        {verTodo && (
          <Link
            href={verTodo}
            className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase underline-offset-4 transition-colors hover:text-black hover:underline"
          >
            Ver todo
          </Link>
        )}
      </div>

      {children}
    </div>
  );
}

export function RejillaProductos({
  productos,
}: {
  productos: ProductoTarjeta[];
}) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {productos.map((producto) => (
        <ProductCard key={producto.id} producto={producto} />
      ))}
    </div>
  );
}

/**
 * Franja de la portada: título, «Ver todo» y cuadrícula.
 *
 * No se renderiza si no hay productos. Una sección vacía con su encabezado
 * hace pensar que algo se rompió; mejor que la franja no exista hasta que
 * alguien le asigne productos desde el panel.
 */
export default function SeccionPortada({
  titulo,
  verTodo,
  productos,
}: {
  titulo: string;
  verTodo?: string | null;
  productos: ProductoTarjeta[];
}) {
  if (productos.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <CabeceraSeccion titulo={titulo} verTodo={verTodo} />
      <RejillaProductos productos={productos} />
    </section>
  );
}
