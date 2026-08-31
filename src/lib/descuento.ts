/**
 * Descuento visual de un producto.
 *
 * `precio` es siempre lo que se cobra; `precio_original` es sólo el número
 * tachado. Nada de esto entra en el total del pedido: `procesar_checkout` relee
 * `precio` de la base de datos y no mira esta columna.
 */
export type Descuento = {
  /** Entero, ya redondeado. Siempre 1 o más. */
  porcentaje: number;
  precioOriginal: number;
};

/**
 * Devuelve el descuento a mostrar, o `null` si no hay ninguno que enseñar.
 *
 * Descarta el caso de un descuento que redondea a 0 % (por ejemplo 100,00
 * rebajado desde 100,40): la restricción de la base de datos sólo exige que el
 * original sea mayor, y un badge de "0% OFF" junto a un precio tachado casi
 * idéntico parece un error de la tienda, no una oferta.
 */
export function calcularDescuento(
  precio: number,
  precioOriginal: number | null | undefined,
): Descuento | null {
  if (
    precioOriginal == null ||
    !Number.isFinite(precioOriginal) ||
    !Number.isFinite(precio) ||
    precioOriginal <= precio ||
    precioOriginal <= 0
  ) {
    return null;
  }

  const porcentaje = Math.round((1 - precio / precioOriginal) * 100);

  return porcentaje > 0 ? { porcentaje, precioOriginal } : null;
}
