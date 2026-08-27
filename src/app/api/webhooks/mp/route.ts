import { createHmac, timingSafeEqual } from "node:crypto";

import { getPaymentClient } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook de Mercado Pago.
 *
 * MP no envía el resultado del pago: envía un aviso con el id. La verificación
 * real es consultar ese id contra la API de MP con nuestro access token, que
 * es lo que hace este handler. Por eso un POST falso no consigue confirmar
 * nada: el id que traiga o no existe en nuestra cuenta, o devuelve su estado
 * verdadero.
 *
 * Siempre responde 200. MP reintenta ante cualquier otro código, y un bucle de
 * reintentos sobre un error nuestro no arregla nada. Los fallos quedan en el
 * log del servidor.
 */
export async function POST(request: Request) {
  try {
    const cuerpoCrudo = await request.text();

    if (!verificarFirma(request, cuerpoCrudo)) {
      console.error("[webhook mp] Firma inválida; aviso descartado.");
      return Response.json({ received: true }, { status: 200 });
    }

    const aviso = JSON.parse(cuerpoCrudo) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };

    // MP manda avisos de varios tipos (merchant_order, plan, etc.). Solo
    // interesan los de pago.
    if (aviso.type !== "payment") {
      return Response.json({ received: true }, { status: 200 });
    }

    const pagoId = aviso.data?.id;
    if (!pagoId) {
      console.error("[webhook mp] Aviso de pago sin data.id.");
      return Response.json({ received: true }, { status: 200 });
    }

    const pago = await getPaymentClient().get({ id: String(pagoId) });

    const pedidoId = pago.external_reference;
    const estadoPago = pago.status;

    if (!pedidoId) {
      console.error(`[webhook mp] Pago ${pagoId} sin external_reference.`);
      return Response.json({ received: true }, { status: 200 });
    }

    if (estadoPago !== "approved") {
      console.log(
        `[webhook mp] Pago ${pagoId} del pedido ${pedidoId} en estado "${estadoPago}"; no se confirma.`,
      );
      return Response.json({ received: true }, { status: 200 });
    }

    const supabase = createAdminClient();

    // Antes de confirmar se compara lo cobrado con lo registrado. Si no
    // coincide, algo se manipuló entre la creación del pedido y el pago, y
    // conviene revisarlo a mano en vez de dar la venta por buena.
    const { data: pedido, error: errorLectura } = await supabase
      .from("pedidos")
      .select("id, total, estado")
      .eq("id", pedidoId)
      .maybeSingle();

    if (errorLectura || !pedido) {
      console.error(
        `[webhook mp] No se encontró el pedido ${pedidoId}:`,
        errorLectura,
      );
      return Response.json({ received: true }, { status: 200 });
    }

    const cobrado = Number(pago.transaction_amount ?? 0);
    if (Math.abs(cobrado - pedido.total) > 0.005) {
      console.error(
        `[webhook mp] Descuadre en el pedido ${pedidoId}: MP cobró ${cobrado} y el pedido registra ${pedido.total}. No se confirma.`,
      );
      return Response.json({ received: true }, { status: 200 });
    }

    // `eq("estado", "pendiente")` hace la operación idempotente y protege el
    // avance del pedido: MP reintenta los avisos, y un reintento tardío no
    // debe devolver a "confirmado" algo que ya se marcó como enviado.
    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado: "confirmado" })
      .eq("id", pedidoId)
      .eq("estado", "pendiente")
      .select("id");

    if (error) {
      console.error(`[webhook mp] Error al confirmar ${pedidoId}:`, error);
      return Response.json({ received: true }, { status: 200 });
    }

    if (!data || data.length === 0) {
      console.log(
        `[webhook mp] Pedido ${pedidoId} ya no estaba pendiente (estado "${pedido.estado}"); sin cambios.`,
      );
      return Response.json({ received: true }, { status: 200 });
    }

    console.log(`[webhook mp] Pedido ${pedidoId} confirmado (pago ${pagoId}).`);
    return Response.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("[webhook mp] Fallo no controlado:", e);
    return Response.json({ received: true }, { status: 200 });
  }
}

/**
 * Valida la cabecera `x-signature` de Mercado Pago.
 *
 * Si `MP_WEBHOOK_SECRET` no está configurada se deja pasar con un aviso: la
 * consulta posterior a la API de MP sigue siendo la verificación que de verdad
 * decide. Configurarla añade una segunda barrera que corta los avisos falsos
 * antes de gastar una llamada a la API.
 */
function verificarFirma(request: Request, cuerpo: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;

  if (!secreto) {
    console.warn(
      "[webhook mp] MP_WEBHOOK_SECRET sin configurar: se omite la validación de firma.",
    );
    return true;
  }

  const firma = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!firma) return false;

  // Formato: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45..."
  const partes = Object.fromEntries(
    firma.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  const ts = partes.ts;
  const hash = partes.v1;
  if (!ts || !hash) return false;

  let dataId: string | undefined;
  try {
    dataId = String(JSON.parse(cuerpo)?.data?.id ?? "");
  } catch {
    return false;
  }

  const plantilla = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const esperado = createHmac("sha256", secreto).update(plantilla).digest("hex");

  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
