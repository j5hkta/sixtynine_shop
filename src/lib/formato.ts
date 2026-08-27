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

/**
 * Instante en que empezó el mes en curso, según el calendario de Lima.
 *
 * No sirve `new Date(año, mes, 1)`: eso usa la zona horaria del servidor, y en
 * un despliegue en la nube (que corre en UTC) el mes empezaría cinco horas
 * antes de lo que marca el calendario peruano — los pedidos del último día del
 * mes anterior, entre las 19:00 y medianoche, se colarían en el mes siguiente.
 *
 * Perú no cambia de hora, así que su desfase es UTC-5 todo el año y la
 * medianoche del día 1 en Lima son las 05:00 UTC.
 */
export function inicioDelMesLima(referencia = new Date()): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(referencia);

  const anio = Number(partes.find((p) => p.type === "year")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value);

  return new Date(Date.UTC(anio, mes - 1, 1, 5, 0, 0));
}

/** Nombre del mes en curso en Lima, para rotular la tarjeta de ventas. */
export function nombreDelMesLima(referencia = new Date()): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    month: "long",
  }).format(referencia);
}
