"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";

import { procesarPedido } from "@/actions/checkout";
import { moneda } from "@/lib/formato";
import { useCarrito, useHidratado, useTotalPrecio } from "@/store/carrito";

const inputClase =
  "w-full border border-neutral-400 bg-ink px-4 py-3 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none";

const labelClase =
  "block text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase";

const ayudaClase = "text-xs text-neutral-600";

export default function CheckoutPage() {
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  const limpiarCarrito = useCarrito((estado) => estado.limpiarCarrito);
  const subtotal = useTotalPrecio();

  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  function handleSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    // Se captura antes de entrar en la transición: dentro del callback async
    // `evento.currentTarget` ya sería null.
    const formData = new FormData(evento.currentTarget);
    setError(null);

    iniciarEnvio(async () => {
      const resultado = await procesarPedido(formData, items);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      limpiarCarrito();
      // Salida del sitio hacia WhatsApp: no es una navegación del router, así
      // que `window.location.href` es lo correcto y no `router.push`.
      window.location.href = resultado.url;
    });
  }

  // Mismo motivo que en /carrito: hasta que `persist` rehidrata, el servidor y
  // el cliente no coinciden.
  if (!hidratado) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="h-10 w-56 animate-pulse bg-white/5" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="h-96 animate-pulse bg-white/5" />
          <div className="h-64 animate-pulse bg-white/5" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-6">
        <span className="flex h-20 w-20 items-center justify-center border border-ink-line bg-ink-soft text-neutral-600">
          <ShoppingBag className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-8 text-3xl font-black tracking-tighter text-white uppercase">
          No hay nada que pagar
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
        <Link
          href="/productos"
          className="mt-10 bg-neon px-8 py-4 text-xs font-black tracking-[0.2em] text-ink uppercase transition-colors hover:bg-white"
        >
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Link
        href="/carrito"
        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neon"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver al carrito
      </Link>

      <header className="mt-6">
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Último paso
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tighter text-white uppercase sm:text-5xl">
          Checkout
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6 border border-ink-line bg-ink-soft p-6 sm:p-8"
        >
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Datos de envío
          </h2>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="space-y-2">
            <label htmlFor="nombre" className={labelClase}>
              Nombre Completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              autoComplete="name"
              placeholder="Juan Pérez Quispe"
              className={inputClase}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dni" className={labelClase}>
                DNI
              </label>
              <input
                id="dni"
                name="dni"
                type="text"
                inputMode="numeric"
                required
                maxLength={8}
                placeholder="12345678"
                aria-describedby="dni-ayuda"
                className={`${inputClase} font-mono`}
              />
              <p id="dni-ayuda" className={ayudaClase}>
                8 dígitos, sin puntos ni guiones.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="telefono" className={labelClase}>
                Teléfono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                required
                autoComplete="tel-national"
                placeholder="987654321"
                aria-describedby="telefono-ayuda"
                className={`${inputClase} font-mono`}
              />
              <p id="telefono-ayuda" className={ayudaClase}>
                Celular de 9 dígitos que empiece en 9.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="direccion" className={labelClase}>
              Dirección de Envío
            </label>
            <textarea
              id="direccion"
              name="direccion"
              rows={3}
              required
              autoComplete="street-address"
              placeholder="Av. Larco 123, Dpto. 401, Miraflores, Lima"
              className={`${inputClase} resize-y`}
            />
            <p className={ayudaClase}>
              Incluye distrito y alguna referencia para el repartidor.
            </p>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 bg-neon py-4 text-xs font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Verificando stock...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" aria-hidden />
                Confirmar y Pagar vía WhatsApp
              </>
            )}
          </button>

          <p className={ayudaClase}>
            Al confirmar te llevamos a WhatsApp con el resumen del pedido listo
            para enviar. El pago y el envío se coordinan por ahí.
          </p>
        </form>

        {/* Resumen */}
        <aside className="border border-ink-line bg-ink-soft p-6 lg:sticky lg:top-24">
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Tu pedido
          </h2>

          <ul className="mt-6 space-y-4 border-b border-ink-line pb-6">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-white">
                    {item.titulo}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {item.talla ? `Talla ${item.talla} · ` : ""}
                    {item.cantidad} u.
                  </span>
                </span>
                <span className="shrink-0 font-mono text-white">
                  {moneda.format(item.precio * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              Total
            </span>
            <span className="font-mono text-2xl font-black text-neon">
              {moneda.format(subtotal)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            Los precios se vuelven a verificar contra el catálogo al confirmar.
            El envío se coordina por WhatsApp.
          </p>
        </aside>
      </div>
    </div>
  );
}
