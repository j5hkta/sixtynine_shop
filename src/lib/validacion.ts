import { z } from "zod";

/**
 * Piezas compartidas por los esquemas de las Server Actions.
 *
 * Una Server Action es un endpoint HTTP público: Next le asigna un id y
 * cualquiera puede invocarla con el cuerpo que quiera, sin pasar por el
 * formulario. Lo que llega NO es lo que pintó el navegador, así que todo se
 * revalida aquí antes de tocar la base de datos.
 *
 * Sobre el XSS: estas cadenas se renderizan como hijos de texto en JSX y React
 * escapa los signos de menor/mayor, el ampersand y las comillas al serializar.
 * No hay `dangerouslySetInnerHTML` en ningún punto del proyecto, así que falta
 * el sumidero que haría falta para que un `<script>` guardado llegara a
 * ejecutarse. Lo que sí se limpia aquí son los caracteres de control, que no
 * aportan nada y sí ensucian los datos.
 */

const TABULADOR = 0x09;
const SALTO = 0x0a;
const RETORNO = 0x0d;
const PRIMER_IMPRIMIBLE = 0x20;
const SUPRIMIR = 0x7f;

/**
 * Quita caracteres de control, conservando tabulador, salto y retorno.
 *
 * Se recorre en lugar de usar una expresión regular a propósito: un rango de
 * controles escrito con escapes es de lo más fácil de romper al copiar el
 * archivo entre editores, y aquí un fallo silencioso dejaría pasar el byte
 * nulo, que revienta las cadenas de PostgreSQL (error 22021). El resto de
 * controles no se ven pero ensucian el dato: entran al pegar desde Word o PDF.
 */
export function limpiarControl(valor: string): string {
  let salida = "";

  for (const caracter of valor) {
    const codigo = caracter.codePointAt(0) ?? 0;
    const esControl =
      (codigo < PRIMER_IMPRIMIBLE &&
        codigo !== TABULADOR &&
        codigo !== SALTO &&
        codigo !== RETORNO) ||
      codigo === SUPRIMIR;

    if (!esControl) salida += caracter;
  }

  return salida;
}

/** Texto de una línea: sin saltos, sin controles y recortado. */
export function textoCorto(max: number) {
  return z
    .string()
    .transform((valor) => limpiarControl(valor).replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));
}

/** Texto de varias líneas: conserva los saltos, colapsa el resto. */
export function textoLargo(max: number) {
  return z
    .string()
    .transform((valor) =>
      limpiarControl(valor)
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    )
    .pipe(z.string().max(max));
}

/**
 * Rechaza cualquier cosa que parezca una etiqueta HTML.
 *
 * Sólo para campos cortos que jamás deberían llevar marcado —el texto de un
 * anuncio, la sede de una agencia—. NO se aplica a las descripciones de
 * producto: ahí las comillas y los signos de menor/mayor son legítimos
 * (medidas como 8.0" x 31.5", rangos como 65mm < 70mm) y rechazarlos
 * convertiría la protección en un estorbo diario para el administrador.
 */
export function sinEtiquetas(max: number) {
  return textoCorto(max).refine((valor) => !/<[^>]*>/.test(valor), {
    message: "no se admite código HTML en este campo",
  });
}

/**
 * Importe en soles. Dos decimales, que es lo que aceptan las columnas
 * `numeric(10,2)`; con más, lo guardado no coincidiría con lo validado.
 */
export function importe(max = 999999.99) {
  return z.coerce
    .number()
    .finite()
    .nonnegative()
    .max(max)
    .transform((valor) => Math.round(valor * 100) / 100);
}

/** Entero no negativo, con tope para que nadie pida 2.000 millones de unidades. */
export function entero(max: number) {
  return z.coerce.number().int().nonnegative().max(max);
}

/**
 * Convierte un error de Zod en una frase para el usuario.
 *
 * Se queda con el primer problema: una lista de seis fallos metida en un
 * `redirect` no la lee nadie, y el formulario ya marca lo obligatorio.
 */
export function primerError(error: z.ZodError): string {
  const problema = error.issues[0];
  if (!problema) return "Los datos enviados no son válidos.";

  const campo = problema.path.join(".");
  return campo ? `${campo}: ${problema.message}` : problema.message;
}
