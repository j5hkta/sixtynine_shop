import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, MessageCircle } from "lucide-react";

import CodigoSeguimiento from "@/components/tienda/CodigoSeguimiento";
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
  title: "Pedido reservado",
  robots: { index: false, follow: false },
};

type LineaPedido = {
  titulo: string;
  categoria: string | null;
  cantidad: number;
  precio_unitario: number;
};

/**
 * Vendedores implicados en el pedido, en orden estable.
 *
 * Ya NO se reparte el importe: el comprador yapea el total a cualquiera de los
 * dos y ellos se cuadran entre sí. Partir la cifra obligaba a hacer dos
 * transferencias exactas y era la parte más frágil del flujo — un céntimo mal
 * repartido y el pedido quedaba a medio pagar.
 */
function vendedoresDelPedido(lineas: LineaPedido[]): Vendedor[] {
  const presentes = new Set(lineas.map((l) => vendedorDeCategoria(l.categoria)));
  return (["skates", "ropa"] as const).filter((v) => presentes.has(v));
}

async function cargarPedido(id: string) {
  try {
    const supabase = createAnonClient();

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
  const vendedores = vendedoresDelPedido(lineas);
  const esMixto = vendedores.length > 1;
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
          Ya apartamos tus unidades.
        </p>
      </header>

      {/* El código va completo y a la vista: el buscador de /seguimiento acepta
          también el corto, pero el UUID entero es el único que nunca resulta
          ambiguo, y es lo que el comprador debe guardar. */}
      <CodigoSeguimiento id={id} />

      {/* Aviso de la ventana de 1 hora, bien visible. */}
      <p className="mt-8 flex items-start gap-3 border-2 border-black bg-neutral-50 px-4 py-4 text-sm">
        <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span className="leading-relaxed text-black">
          <strong>Tienes 1 hora para yapear.</strong> Pasado ese plazo el pedido
          se cancela solo y las unidades vuelven al catálogo.
        </span>
      </p>

      {DATOS_DE_PAGO_SIN_CONFIGURAR && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
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
          className="mt-6 flex items-start gap-2 border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No pudimos leer el detalle de tu pedido. Escríbenos por WhatsApp con
          el número <strong>#{numeroCorto}</strong> y lo resolvemos.
        </p>
      )}

      {/* Monto único a pagar */}
      <section className="mt-6 border-2 border-black bg-white p-6 sm:p-8">
        <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          Yapea el monto exacto
        </h2>

        <p className="mt-4 font-mono text-4xl font-black text-black">
          {moneda.format(resumen.total)}
        </p>

        <p className="mt-2 text-xs text-neutral-500">
          Referencia:{" "}
          <span className="font-mono font-bold text-black">#{numeroCorto}</span>
          {" · "}
          El flete de la agencia no está incluido.
        </p>

        {esMixto ? (
          <p className="mt-6 border-t border-neutral-200 pt-6 text-sm leading-relaxed font-bold text-black">
            Tu pedido es mixto. Puedes yapear el monto total a CUALQUIERA de
            estos dos números:
          </p>
        ) : (
          <p className="mt-6 border-t border-neutral-200 pt-6 text-sm text-neutral-700">
            Yapea al siguiente número:
          </p>
        )}

        <div
          className={`mt-5 grid gap-5 ${esMixto ? "sm:grid-cols-2" : ""}`}
        >
          {vendedores.map((clave) => {
            const datos = VENDEDORES[clave];
            return (
              <div
                key={clave}
                className="flex flex-col items-center gap-3 border border-neutral-200 p-4 text-center"
              >
                <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
                  {datos.etiqueta}
                </span>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={datos.qr}
                  alt={`Código QR de Yape para ${datos.etiqueta}`}
                  className="h-40 w-40 border border-neutral-200 object-contain"
                />

                <span className="font-mono text-lg font-black text-black">
                  {agruparNumero(datos.numero)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* WhatsApp */}
      <section className="mt-6 border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          Envíanos la captura
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          {esMixto
            ? "Manda la captura al mismo número al que yapeaste."
            : "Manda la captura del yapeo y confirmamos tu pedido."}{" "}
          Sin la captura no podemos despacharlo.
        </p>

        <div className={`mt-6 grid gap-3 ${esMixto ? "sm:grid-cols-2" : ""}`}>
          {vendedores.map((clave) => (
            <a
              key={clave}
              href={enlaceWhatsAppPedido(clave, id, resumen.total)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] py-4 text-sm font-black tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              {esMixto ? VENDEDORES[clave].etiqueta : "Enviar captura"}
            </a>
          ))}
        </div>
      </section>

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

      <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
        <Link
          href={`/seguimiento?id=${id}`}
          className="text-[11px] font-bold tracking-[0.2em] text-black uppercase underline underline-offset-4"
        >
          Seguir mi pedido
        </Link>
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
