/**
 * Formateadores compartidos por el panel y la tienda pública.
 *
 * Están aquí para que el precio se vea igual en todas partes: la columna es
 * `numeric(10,2)`, así que 2 decimales fijos hacen que lo mostrado coincida
 * exactamente con lo almacenado.
 *
 * Si la tienda cambia de país, este es el único archivo que hay que tocar.
 */
export const moneda = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
