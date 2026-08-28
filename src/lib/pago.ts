/**
 * Datos de cobro manual (Yape / efectivo).
 *
 * Se leen de variables de entorno porque son datos del negocio, no del código:
 * cambiar de número o de titular no debería exigir un despliegue nuevo.
 *
 * Los valores por defecto son PLACEHOLDERS y están a la vista del comprador en
 * la pantalla de confirmación. Hay que definir las tres variables en
 * `.env.local` (y en el despliegue) antes de aceptar pedidos reales.
 */
export const YAPE_NUMERO = process.env.NEXT_PUBLIC_YAPE_NUMERO ?? "999999999";

export const YAPE_TITULAR =
  process.env.NEXT_PUBLIC_YAPE_TITULAR ?? "Sixty Nine Skate & Apparel";

/** Número de la tienda en formato internacional sin `+`, para `wa.me`. */
export const WHATSAPP_TIENDA =
  process.env.NEXT_PUBLIC_WHATSAPP ?? "51999999999";

/** `true` mientras siga alguno de los valores de ejemplo. */
export const DATOS_DE_PAGO_SIN_CONFIGURAR =
  !process.env.NEXT_PUBLIC_YAPE_NUMERO ||
  !process.env.NEXT_PUBLIC_YAPE_TITULAR ||
  !process.env.NEXT_PUBLIC_WHATSAPP;

/** Enlace a WhatsApp con el mensaje de confirmación ya escrito. */
export function enlaceWhatsAppPedido(pedidoId: string): string {
  const mensaje = `Hola, acabo de realizar el pedido ${pedidoId}. Adjunto mi captura de Yape.`;
  return `https://wa.me/${WHATSAPP_TIENDA}?text=${encodeURIComponent(mensaje)}`;
}
