import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, MessageCircle } from "lucide-react";

import LimpiarCarrito from "@/components/tienda/LimpiarCarrito";
import { moneda } from "@/lib/formato";
import {
  DATOS_DE_PAGO_SIN_CONFIGURAR,
  enlaceWhatsAppPedido,
  YAPE_NUMERO,
  YAPE_TITULAR,
} from "@/lib/pago";
import { createAnonClient } from "@/lib/supabase/anon";

export const metadata = {
  title: "Pedido reservado | Sixty Nine Skate & Apparel",
  robots: { index: false, follow: false },
};

/** Formato legible del número de Yape: 999 999 999. */
function agrupar(numero: string): string {
  return numero.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/**
 * Lee el importe del pedido.
 *
 * No usa una consulta directa a `pedidos`: RLS sólo deja leer esa tabla a los
 * admins y el comprador no tiene cuenta. `obtener_resumen_pedido()` es una
 * función SECURITY DEFINER que devuelve el importe y el estado, nada del
 * cliente (ver `supabase/consulta_pedido_publico.sql`).
 */
async function cargarPedido(id: string) {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .rpc("obtener_resumen_pedido", { p_id: id })
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (e) {
    console.error(
      "[checkout] No se pudo leer el pedido:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export default async function CheckoutExitoPage({
  searchParams,
}: PageProps<"/checkout/exito">) {
  const { id } = await searchParams;

  if (typeof id !== "string" || !id) {
    notFound();
  }

  const pedido = await cargarPedido(id);

  if (!pedido) {
    notFound();
  }

  const numeroCorto = id.slice(0, 8).toUpperCase();
  const yaConfirmado = pedido.estado !== "pendiente";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      {/* Vacía el carrito ahora que el pedido está registrado. */}
      <LimpiarCarrito />

      <header className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </span>

        <h1 className="mt-6 text-3xl font-black tracking-tighter text-black uppercase sm:text-4xl">
          ¡Pedido Reservado!
        </h1>

        <p className="mt-3 text-sm text-neutral-600">
          Tu pedido{" "}
          <span className="font-mono font-bold text-black">#{numeroCorto}</span>{" "}
          está apartado. Guarda este número.
        </p>
      </header>

      {DATOS_DE_PAGO_SIN_CONFIGURAR && (
        <p
          role="alert"
          className="mt-8 flex items-start gap-2 border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Los datos de pago todavía son de ejemplo. Define{" "}
          <code>NEXT_PUBLIC_YAPE_NUMERO</code>,{" "}
          <code>NEXT_PUBLIC_YAPE_TITULAR</code> y{" "}
          <code>NEXT_PUBLIC_WHATSAPP</code> en el entorno.
        </p>
      )}

      {/* Instrucciones de pago */}
      <section className="mt-10 border-2 border-black bg-white p-6 sm:p-8">
        <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          Paso 1 · Yapea el monto exacto
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-neutral-700">
          Para procesar tu envío, yapea el monto exacto de{" "}
          <span className="font-mono text-lg font-black text-black">
            {moneda.format(pedido.total)}
          </span>{" "}
          al número{" "}
          <span className="font-mono font-black text-black">
            {agrupar(YAPE_NUMERO)}
          </span>{" "}
          a nombre de <span className="font-bold text-black">{YAPE_TITULAR}</span>.
        </p>

        <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Monto a yapear</dt>
            <dd className="font-mono text-xl font-black text-black">
              {moneda.format(pedido.total)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Número</dt>
            <dd className="font-mono font-bold text-black">
              {agrupar(YAPE_NUMERO)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Titular</dt>
            <dd className="font-bold text-black">{YAPE_TITULAR}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Referencia</dt>
            <dd className="font-mono font-bold text-black">#{numeroCorto}</dd>
          </div>
        </dl>

        <p className="mt-4 flex items-start gap-2 text-xs text-neutral-500">
          <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          El monto debe coincidir al céntimo: así identificamos tu pago sin
          tener que preguntarte.
        </p>
      </section>

      {/* WhatsApp */}
      <section className="mt-6 border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          Paso 2 · Envíanos la captura
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          Mándanos la captura del yapeo por WhatsApp y confirmamos tu pedido.
          Sin la captura no podemos despacharlo.
        </p>

        <a
          href={enlaceWhatsAppPedido(id)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[#25D366] py-4 text-sm font-black tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          Enviar captura por WhatsApp
        </a>
      </section>

      {yaConfirmado && (
        <p
          role="status"
          className="mt-6 border border-neutral-300 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-700"
        >
          Este pedido ya figura como{" "}
          <span className="font-bold">{pedido.estado}</span>. No hace falta que
          vuelvas a pagar.
        </p>
      )}

      <p className="mt-10 text-center text-xs text-neutral-500">
        Tenemos tu pedido apartado <strong>24 horas</strong>. Pasado ese plazo
        las unidades vuelven al catálogo.
      </p>

      <div className="mt-6 text-center">
        <Link
          href="/productos"
          className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase underline-offset-4 hover:text-black hover:underline"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
