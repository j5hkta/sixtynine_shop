/**
 * Envío por agencia.
 *
 * La tienda no cobra flete: el paquete viaja a la agencia que elija el
 * comprador y se paga allí al recogerlo ("pago en destino"), salvo que el
 * pedido supere el umbral, en cuyo caso lo asumimos nosotros.
 *
 * Ojo: en ambos casos el importe que cobra la web es el mismo —el de los
 * productos—, así que "Gratis" y "Pago en destino" son sólo dos maneras de
 * explicar quién paga el flete en la agencia. Nada de esto entra en el total
 * del pedido ni en el monto a yapear.
 */
export const AGENCIAS = {
  shalom: { etiqueta: "Shalom" },
  olva: { etiqueta: "Olva Courier" },
} as const;

export type Agencia = keyof typeof AGENCIAS;

export const CLAVES_AGENCIA: Agencia[] = ["shalom", "olva"];

export function esAgenciaValida(valor: string): valor is Agencia {
  return valor === "shalom" || valor === "olva";
}

/** A partir de este subtotal el flete corre por cuenta de la tienda. */
export const UMBRAL_ENVIO_GRATIS = 250;

export function envioEsGratis(subtotal: number): boolean {
  return subtotal > UMBRAL_ENVIO_GRATIS;
}

/** Texto que ve el comprador en el resumen del carrito y del checkout. */
export function textoEnvio(subtotal: number): string {
  return envioEsGratis(subtotal) ? "Gratis" : "Pago en Destino (Agencia)";
}
