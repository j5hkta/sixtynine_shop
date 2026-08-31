"use client";

import Link from "next/link";
import {
  ArrowRight,
  ImageOff,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { textoEnvio } from "@/lib/envio";
import { moneda } from "@/lib/formato";
import {
  useCarrito,
  useHidratado,
  useTotalItems,
  useTotalPrecio,
  type ItemCarrito,
} from "@/store/carrito";

/** Tope defensivo: el carrito no conoce el stock real del producto. */
const CANTIDAD_MAXIMA = 99;

export default function CarritoPage() {
  // Los hooks van siempre antes de cualquier return condicional.
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  const actualizarCantidad = useCarrito((estado) => estado.actualizarCantidad);
  const removerItem = useCarrito((estado) => estado.removerItem);
  const limpiarCarrito = useCarrito((estado) => estado.limpiarCarrito);
  const totalItems = useTotalItems();
  const subtotal = useTotalPrecio();

  // Hasta que `persist` rehidrata desde localStorage, el servidor y el cliente
  // no coinciden. Se pinta un esqueleto neutro en lugar de arriesgar un error
  // de hidratación (mismo motivo que el contador del Navbar).
  if (!hidratado) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="h-10 w-56 animate-pulse bg-neutral-100" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-3">
            <div className="h-28 animate-pulse bg-neutral-100" />
            <div className="h-28 animate-pulse bg-neutral-100" />
          </div>
          <div className="h-64 animate-pulse bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return <CarritoVacio />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
            Tu selección
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tighter text-black uppercase sm:text-5xl">
            Carrito
          </h1>
          <span className="mt-4 block h-1 w-16 bg-black" aria-hidden />
          <p className="mt-4 text-sm text-neutral-500">
            {totalItems} {totalItems === 1 ? "artículo" : "artículos"} en{" "}
            {items.length} {items.length === 1 ? "línea" : "líneas"}.
          </p>
        </div>

        <button
          type="button"
          onClick={limpiarCarrito}
          className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:text-red-600"
        >
          Vaciar carrito
        </button>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Columna izquierda: líneas */}
        <ul className="space-y-3">
          {items.map((item) => (
            <LineaCarrito
              key={item.id}
              item={item}
              onCantidad={actualizarCantidad}
              onRemover={removerItem}
            />
          ))}
        </ul>

        {/* Columna derecha: resumen */}
        <aside className="border border-neutral-200 bg-white p-6 lg:sticky lg:top-24">
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Resumen de orden
          </h2>

          <dl className="mt-6 space-y-3 border-b border-neutral-200 pb-6 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="font-mono font-bold text-black">
                {moneda.format(subtotal)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">Envío</dt>
              <dd className="text-right text-xs font-bold text-black">
                {textoEnvio(subtotal)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-600 uppercase">
              Total
            </span>
            <span className="font-mono text-2xl font-black text-black">
              {moneda.format(subtotal)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-neutral-400">
            Enviamos por agencia (Shalom u Olva). El flete no entra en este
            total: se paga al recoger, salvo pedidos sobre S/ 250.
          </p>

          <Link
            href="/checkout"
            className="mt-6 flex w-full items-center justify-center gap-2 bg-black py-4 text-xs font-black tracking-[0.15em] text-white uppercase transition-colors hover:opacity-80"
          >
            Proceder al Pago
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>

          <Link
            href="/productos"
            className="mt-3 block text-center text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-black"
          >
            Seguir comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}

function CarritoVacio() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <span className="flex h-20 w-20 items-center justify-center border border-neutral-200 bg-white text-neutral-400">
        <ShoppingBag className="h-8 w-8" aria-hidden />
      </span>

      <h1 className="mt-8 text-3xl font-black tracking-tighter text-black uppercase sm:text-4xl">
        Tu carrito está vacío
      </h1>
      <span className="mt-4 block h-1 w-16 bg-black" aria-hidden />

      <p className="mt-6 max-w-sm text-sm leading-relaxed text-neutral-500">
        Todavía no has añadido nada. Date una vuelta por el catálogo y arma tu
        setup.
      </p>

      <Link
        href="/productos"
        className="mt-10 flex items-center gap-2 bg-black px-8 py-4 text-xs font-black tracking-[0.2em] text-white uppercase transition-colors hover:opacity-80"
      >
        Ir al Catálogo
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

function LineaCarrito({
  item,
  onCantidad,
  onRemover,
}: {
  item: ItemCarrito;
  onCantidad: (id: string, cantidad: number) => void;
  onRemover: (id: string) => void;
}) {
  const enMinimo = item.cantidad <= 1;
  const enMaximo = item.cantidad >= CANTIDAD_MAXIMA;

  return (
    <li className="flex gap-4 border border-neutral-200 bg-white p-4 transition-colors hover:border-black">
      {/* Miniatura */}
      <Link
        href={`/productos/${item.id_producto}`}
        className="h-24 w-24 shrink-0 overflow-hidden border border-neutral-200 bg-white"
        aria-hidden
        tabIndex={-1}
      >
        {item.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imagen}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
            <ImageOff className="h-6 w-6" aria-hidden />
          </span>
        )}
      </Link>

      {/* Datos */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/productos/${item.id_producto}`}
          className="truncate text-sm font-bold text-black transition-colors hover:text-black"
        >
          {item.titulo}
        </Link>

        {item.talla && (
          <p className="text-[11px] font-bold tracking-[0.15em] text-neutral-500 uppercase">
            Talla{" "}
            <span className="font-mono text-neutral-700">{item.talla}</span>
          </p>
        )}

        <p className="text-xs text-neutral-500">
          <span className="font-mono">{moneda.format(item.precio)}</span> c/u
        </p>

        {/* Cantidad */}
        <div className="mt-auto flex items-center gap-3 pt-3">
          <div className="flex items-center border border-neutral-200">
            <button
              type="button"
              onClick={() => onCantidad(item.id, item.cantidad - 1)}
              disabled={enMinimo}
              aria-label={`Quitar una unidad de ${item.titulo}`}
              className="p-2 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-600"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>

            <span
              aria-live="polite"
              className="min-w-10 px-1 text-center font-mono text-sm font-bold text-black"
            >
              {item.cantidad}
            </span>

            <button
              type="button"
              onClick={() => onCantidad(item.id, item.cantidad + 1)}
              disabled={enMaximo}
              aria-label={`Añadir una unidad de ${item.titulo}`}
              className="p-2 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemover(item.id)}
            aria-label={`Quitar ${item.titulo} del carrito`}
            title="Quitar del carrito"
            className="border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Total de la línea */}
      <p className="shrink-0 self-start font-mono text-base font-black whitespace-nowrap text-black">
        {moneda.format(item.precio * item.cantidad)}
      </p>
    </li>
  );
}
