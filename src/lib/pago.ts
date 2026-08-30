import { CATEGORIAS } from "./categorias";

/**
 * Cobro manual repartido entre dos vendedores.
 *
 * Cada hermano cobra lo suyo en su propio Yape, así que un pedido mixto exige
 * dos transferencias. La asignación se decide por la categoría del producto.
 *
 * Los números se leen de variables de entorno: cambiar de línea no debería
 * exigir un despliegue. Los valores por defecto son los que nos pasaste.
 */
export type Vendedor = "skates" | "ropa";

/**
 * Categorías que cobra el hermano de ropa. Todo lo demás va a skates,
 * incluidos los productos sin categoría o con una que no esté en la lista:
 * es preferible que el cobro caiga en un buzón concreto a dejarlo sin asignar.
 */
export const CATEGORIAS_ROPA: readonly string[] = [
  "Polos",
  "Pantalones",
  "Poleras",
  "Gorros",
  "Zapatillas",
];

/** Las de skates, derivadas para que no haya dos listas que mantener. */
export const CATEGORIAS_SKATES: readonly string[] = CATEGORIAS.filter(
  (categoria) => !CATEGORIAS_ROPA.includes(categoria),
);

export function vendedorDeCategoria(categoria: string | null): Vendedor {
  return categoria && CATEGORIAS_ROPA.includes(categoria) ? "ropa" : "skates";
}

type DatosVendedor = {
  clave: Vendedor;
  etiqueta: string;
  /** Número nacional de 9 dígitos, como se muestra en Yape. */
  numero: string;
  /** Ruta pública del QR de Yape. */
  qr: string;
};

export const VENDEDORES: Record<Vendedor, DatosVendedor> = {
  skates: {
    clave: "skates",
    etiqueta: "Skates",
    numero: process.env.NEXT_PUBLIC_YAPE_SKATES ?? "940203963",
    qr: "/qr-skate.png",
  },
  ropa: {
    clave: "ropa",
    etiqueta: "Ropa",
    numero: process.env.NEXT_PUBLIC_YAPE_ROPA ?? "992657906",
    qr: "/qr-ropa.png",
  },
};

/** `true` mientras alguno siga con el número por defecto del código. */
export const DATOS_DE_PAGO_SIN_CONFIGURAR =
  !process.env.NEXT_PUBLIC_YAPE_SKATES || !process.env.NEXT_PUBLIC_YAPE_ROPA;

/** Formato legible: 940 203 963. */
export function agruparNumero(numero: string): string {
  return numero.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/**
 * Enlace de WhatsApp al vendedor correspondiente.
 *
 * El número nacional se prefija con 51 para `wa.me`, que exige formato
 * internacional sin `+`.
 */
export function enlaceWhatsAppPedido(
  vendedor: Vendedor,
  pedidoId: string,
  monto?: number,
): string {
  const detalle =
    monto === undefined
      ? ""
      : ` Yapeo S/ ${monto.toFixed(2)} por los productos de ${VENDEDORES[vendedor].etiqueta.toLowerCase()}.`;

  const mensaje = `Hola, acabo de realizar el pedido ${pedidoId}.${detalle} Adjunto mi captura de Yape.`;

  return `https://wa.me/51${VENDEDORES[vendedor].numero}?text=${encodeURIComponent(mensaje)}`;
}
