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

/** Clave que usan los productos sin tallas (skates, accesorios). */
export const TALLA_UNICA = "Unica";

/** Tope de unidades por talla. Muy por encima de lo real, pero acotado. */
const UNIDADES_MAXIMAS = 100_000;

/** Tope de variantes por producto. */
const VARIANTES_MAXIMAS = 30;

/**
 * Inventario por talla: {"S": 10, "M": 4, "L": 0}.
 *
 * Llega del formulario como dos listas paralelas —una de nombres y otra de
 * cantidades— porque un `<input>` no sabe enviar un objeto. Se emparejan aqui.
 *
 * Reglas que importan:
 *
 * - Una talla sin nombre se descarta en silencio: el formulario permite anadir
 *   filas y dejarlas a medias, y abortar el guardado por una fila vacia seria
 *   un incordio.
 * - Una talla repetida es un ERROR, no una suma. Si alguien escribe "M" dos
 *   veces con 3 y 5 unidades, ni 3 ni 5 ni 8 es obviamente lo que queria: es
 *   mejor decirselo que elegir por el.
 * - Cero es un valor legitimo, no una talla ausente. Distingue "esta talla
 *   existe pero se agoto" —que la ficha pinta tachada— de "esta talla no se
 *   fabrica", que no aparece.
 */
export function inventarioTallas() {
  return z
    .object({
      inventario_talla: z.union([z.string(), z.array(z.string())]).optional(),
      inventario_cantidad: z
        .union([z.string(), z.array(z.string())])
        .optional(),
    })
    .transform((campos, ctx) => {
      const nombres = comoLista(campos.inventario_talla);
      const cantidades = comoLista(campos.inventario_cantidad);

      const inventario: Record<string, number> = {};

      for (const [indice, nombreCrudo] of nombres.entries()) {
        const talla = limpiarControl(nombreCrudo).replace(/\s+/g, " ").trim();

        if (talla === "") continue;

        if (talla.length > 20) {
          ctx.addIssue({
            code: "custom",
            message: `la talla "${talla.slice(0, 20)}..." es demasiado larga`,
          });
          return z.NEVER;
        }

        if (talla in inventario) {
          ctx.addIssue({
            code: "custom",
            message: `la talla "${talla}" esta repetida`,
          });
          return z.NEVER;
        }

        // `Number("")` es 0, asi que una cantidad en blanco se guardaria como
        // "talla agotada" sin que nadie lo pidiera. Se descarta antes de
        // convertir.
        const cantidadCruda = (cantidades[indice] ?? "").trim();
        const unidades = cantidadCruda === "" ? NaN : Number(cantidadCruda);

        if (
          !Number.isInteger(unidades) ||
          unidades < 0 ||
          unidades > UNIDADES_MAXIMAS
        ) {
          ctx.addIssue({
            code: "custom",
            message: `las unidades de "${talla}" deben ser un entero entre 0 y ${UNIDADES_MAXIMAS}`,
          });
          return z.NEVER;
        }

        inventario[talla] = unidades;
      }

      if (Object.keys(inventario).length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "anade al menos una talla con sus unidades",
        });
        return z.NEVER;
      }

      if (Object.keys(inventario).length > VARIANTES_MAXIMAS) {
        ctx.addIssue({
          code: "custom",
          message: `no se admiten mas de ${VARIANTES_MAXIMAS} tallas por producto`,
        });
        return z.NEVER;
      }

      return inventario;
    });
}

/** Un campo repetido en un formulario llega como string o como array. */
function comoLista(valor: string | string[] | undefined): string[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}
