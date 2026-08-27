/**
 * Zonas de envío y su costo.
 *
 * OJO: este importe está duplicado en `supabase/envio_schema.sql`, dentro de
 * `procesar_checkout()`. La copia de Postgres es la que manda — es la que se
 * escribe en el pedido — y esta de aquí sólo alimenta lo que se muestra al
 * comprador y el ítem de envío que ve Mercado Pago. Si cambias una, cambia la
 * otra o el cobro dejará de cuadrar con el pedido.
 */
export const ZONAS_ENVIO = {
  lima: { etiqueta: "Lima Metropolitana", costo: 10 },
  provincia: { etiqueta: "Provincia", costo: 20 },
} as const;

export type ZonaEnvio = keyof typeof ZONAS_ENVIO;

export const ZONAS: ZonaEnvio[] = ["lima", "provincia"];

export function esZonaValida(valor: string): valor is ZonaEnvio {
  return valor === "lima" || valor === "provincia";
}

export function costoEnvio(zona: ZonaEnvio): number {
  return ZONAS_ENVIO[zona].costo;
}
