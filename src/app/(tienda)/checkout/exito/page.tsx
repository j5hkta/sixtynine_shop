import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";

import LimpiarCarrito from "@/components/tienda/LimpiarCarrito";
import { moneda } from "@/lib/formato";
import {
  agruparNumero,
  DATOS_DE_PAGO_SIN_CONFIGURAR,
  enlaceWhatsAppPedido,
  vendedorDeCategoria,
  VENDEDORES,
  type Vendedor,
} from "@/lib/pago";
import { createAnonClient } from "@/lib/supabase/anon";

export const metadata = {
  title: "Pedido reservado | Sixty Nine Skate & Apparel",
  robots: { index: false, follow: false },
};

type LineaPedido = {
  titulo: string;
  categoria: string | null;
  cantidad: number;
  precio_unitario: number;
};

/** Cuánto le toca cobrar a cada hermano. */
type Reparto = {
  vendedor: Vendedor;
  /** Suma de producto, sin envío. */
  subtotal: number;
  /** Lo que hay que yapear: subtotal más el envío si le corresponde. */
  aPagar: number;
  llevaEnvio: boolean;
  lineas: LineaPedido[];
};

/**
 * Reparte las líneas entre los dos vendedores y decide quién cobra el envío.
 *
 * El envío es uno solo y no se puede partir, así que se carga entero al
 * vendedor con mayor subtotal. Lo importante es que las dos cifras sumen
 * exactamente el total del pedido: si no cuadraran, el comprador yapearía de
 * menos y nadie sabría por qué.
 */
function repartir(lineas: LineaPedido[], costoEnvio: number): Reparto[] {
  const cubos = new Map<Vendedor, LineaPedido[]>();

  for (const linea of lineas) {
    const vendedor = vendedorDeCategoria(linea.categoria);
    cubos.set(vendedor, [...(cubos.get(vendedor) ?? []), linea]);
  }

  const partes: Reparto[] = [...cubos.entries()].map(([vendedor, suyas]) => ({
    vendedor,
    subtotal:
      Math.round(
        suyas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0) * 100,
      ) / 100,
    aPagar: 0,
    llevaEnvio: false,
    lineas: suyas,
  }));

  // Orden estable: primero el de mayor subtotal, que es quien carga el envío.
  partes.sort((a, b) => b.subtotal - a.subtotal);

  return partes.map((parte, indice) => {
    const llevaEnvio = indice === 0;
    return {
      ...parte,
      llevaEnvio,
      aPagar:
        Math.round((parte.subtotal + (llevaEnvio ? costoEnvio : 0)) * 100) / 100,
    };
  });
}

async function cargarPedido(id: string) {
  try {
    const supabase = createAnonClient();

    // Dos funciones SECURITY DEFINER: `pedidos` y `pedidos_items` sólo son
    // legibles por admins, y el comprador no tiene cuenta. Ver
    // `supabase/consulta_pedido_publico.sql`.
    const [resumen, items] = await Promise.all([
      supabase.rpc("obtener_resumen_pedido", { p_id: id }).maybeSingle(),
      supabase.rpc("obtener_items_pedido", { p_id: id }),
    ]);

    if (resumen.error) throw resumen.error;
    if (items.error) throw items.error;
    if (!resumen.data) return null;

    return { resumen: resumen.data, lineas: items.data ?? [] };
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

  const { resumen, lineas } = pedido;
  const numeroCorto = id.slice(0, 8).toUpperCase();
  const partes = repartir(lineas, resumen.costo_envio ?? 0);
  const esMixto = partes.length > 1;
  const yaConfirmado = resumen.estado !== "pendiente";

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

        <p className="mt-1 font-mono text-2xl font-black text-black">
          Total: {moneda.format(resumen.total)}
        </p>
      </header>

      {DATOS_DE_PAGO_SIN_CONFIGURAR && (
        <p
          role="alert"
          className="mt-8 flex items-start gap-2 border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Los números de Yape salen de los valores por defecto del código.
          Define <code>NEXT_PUBLIC_YAPE_SKATES</code> y{" "}
          <code>NEXT_PUBLIC_YAPE_ROPA</code> en el entorno.
        </p>
      )}

      {lineas.length === 0 && (
        <p
          role="alert"
          className="mt-8 flex items-start gap-2 border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No pudimos leer el detalle de tu pedido. Escríbenos por WhatsApp con
          el número <strong>#{numeroCorto}</strong> y lo resolvemos.
        </p>
      )}

      {esMixto && (
        <div className="mt-8 border-2 border-black bg-neutral-50 p-5">
          <p className="text-sm leading-relaxed font-bold text-black">
            Tu pedido contiene ropa y skates. Por favor, realiza dos Yapes a los
            siguientes números:
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            Son dos vendedores distintos. Los dos montos juntos suman{" "}
            {moneda.format(resumen.total)}.
          </p>
        </div>
      )}

      {partes.map((parte) => (
        <BloqueVendedor
          key={parte.vendedor}
          parte={parte}
          pedidoId={id}
          numeroCorto={numeroCorto}
          mostrarEtiqueta={esMixto}
        />
      ))}

      {yaConfirmado && (
        <p
          role="status"
          className="mt-6 border border-neutral-300 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-700"
        >
          Este pedido ya figura como{" "}
          <span className="font-bold">{resumen.estado}</span>. No hace falta que
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

function BloqueVendedor({
  parte,
  pedidoId,
  numeroCorto,
  mostrarEtiqueta,
}: {
  parte: Reparto;
  pedidoId: string;
  numeroCorto: string;
  mostrarEtiqueta: boolean;
}) {
  const datos = VENDEDORES[parte.vendedor];

  return (
    <section className="mt-6 border-2 border-black bg-white p-6 sm:p-8">
      <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
        {mostrarEtiqueta
          ? `Yape ${datos.etiqueta} · ${moneda.format(parte.aPagar)}`
          : "Yapea el monto exacto"}
      </h2>

      <p className="mt-5 text-sm leading-relaxed text-neutral-700">
        Para procesar tu envío, yapea el monto exacto de{" "}
        <span className="font-mono text-lg font-black text-black">
          {moneda.format(parte.aPagar)}
        </span>{" "}
        al número{" "}
        <span className="font-mono font-black text-black">
          {agruparNumero(datos.numero)}
        </span>{" "}
        ({datos.etiqueta}).
      </p>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={datos.qr}
            alt={`Código QR de Yape para ${datos.etiqueta}`}
            className="h-40 w-40 border border-neutral-200 object-contain"
          />
        </div>

        <dl className="flex-1 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Productos</dt>
            <dd className="font-mono text-black">
              {moneda.format(parte.subtotal)}
            </dd>
          </div>
          {parte.llevaEnvio && parte.aPagar !== parte.subtotal && (
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-neutral-500">Envío</dt>
              <dd className="font-mono text-black">
                {moneda.format(parte.aPagar - parte.subtotal)}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="font-bold text-black">A yapear</dt>
            <dd className="font-mono text-xl font-black text-black">
              {moneda.format(parte.aPagar)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Referencia</dt>
            <dd className="font-mono font-bold text-black">#{numeroCorto}</dd>
          </div>
        </dl>
      </div>

      <ul className="mt-5 space-y-1 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        {parte.lineas.map((linea) => (
          <li key={`${linea.titulo}-${linea.precio_unitario}`}>
            {linea.cantidad} × {linea.titulo}
          </li>
        ))}
      </ul>

      <a
        href={enlaceWhatsAppPedido(parte.vendedor, pedidoId, parte.aPagar)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 bg-[#25D366] py-4 text-sm font-black tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-90"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        Enviar captura · {datos.etiqueta}
      </a>
    </section>
  );
}
