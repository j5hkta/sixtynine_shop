"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { SECCIONES_PORTADA } from "@/lib/secciones";
import { archivosDeFormData, subirImagenes } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ProductoInsert, ProductoUpdate } from "@/lib/supabase/types";
import {
  importe,
  inventarioTallas,
  primerError,
  textoCorto,
  textoLargo,
} from "@/lib/validacion";

const LISTADO = "/admin/productos";
const FORMULARIO_NUEVO = "/admin/productos/nuevo";

function volverConError(destino: string, mensaje: string): never {
  redirect(`${destino}?error=${encodeURIComponent(mensaje)}`);
}

/**
 * Invalida todas las vistas publicas que dependen del producto.
 *
 * Son cuatro y no una porque cualquiera de ellas puede cambiar al guardar: la
 * portada se arma con `seccion_portada`, y el catalogo, las categorias y la
 * ficha filtran por `stock_total > 0`, asi que reponer inventario tiene que devolver
 * el producto a la tienda en el acto. Sin esto tardaria hasta 60 s y pareceria
 * que el panel no guardo nada.
 *
 * `/buscar` no aparece: se renderiza bajo demanda, nunca se cachea.
 */
function refrescarTiendaPublica() {
  revalidatePath("/", "page");
  revalidatePath("/productos");
  revalidatePath("/productos/[id]", "page");
  revalidatePath("/productos/categoria/[slug]", "page");
}

// -----------------------------------------------------------------------------
// Lectura y validacion de campos
// -----------------------------------------------------------------------------

/**
 * Esquema del formulario de producto.
 *
 * Todo lo que llega de `FormData` es texto, así que los números se convierten
 * con `coerce` y los enumerados se cierran con `z.enum`: un `estado` inventado
 * por consola ya no llega a la base de datos.
 *
 * `categoria` acepta también la cadena vacía y cualquier valor fuera de
 * `CATEGORIAS`, a propósito. El formulario conserva como opción la categoría
 * que ya tuviera un producto aunque se haya retirado de la lista (los que se
 * quedaron en «Polerones»); cerrarla aquí reasignaría esos productos en
 * silencio la próxima vez que alguien los editara.
 */
const esquemaProducto = z
  .object({
    titulo: textoCorto(120).pipe(z.string().min(1, "el título es obligatorio")),
    // Texto libre y largo. No se le aplica `sinEtiquetas`: las descripciones
    // llevan medidas con comillas y rangos con signos de menor/mayor.
    descripcion: textoLargo(4000).optional().default(""),
    categoria: textoCorto(60).optional().default(""),
    precio: importe(),
    // Vacío significa «sin descuento», no cero: `Number("")` es 0 y guardaría
    // un producto rebajado desde S/ 0.00.
    precio_original: z
      .union([z.literal(""), importe()])
      .optional()
      .default("")
      .transform((valor) => (valor === "" ? null : valor)),
    estado: z.enum(["activo", "borrador", "agotado"]).optional().default("activo"),
    seccion_portada: z.enum(SECCIONES_PORTADA).optional().default("ninguna"),
  })
  .refine(
    (campos) =>
      campos.precio_original === null || campos.precio_original > campos.precio,
    {
      path: ["precio_original"],
      message:
        "debe ser mayor que el precio actual; si el producto no está rebajado, déjalo vacío",
    },
  )
  .transform((campos) => ({
    ...campos,
    descripcion: campos.descripcion || null,
    categoria: campos.categoria || null,
  }));

type CamposProducto = z.output<typeof esquemaProducto> & {
  inventario_tallas: Record<string, number>;
};

/**
 * Lee y valida los campos comunes al alta y la edicion.
 *
 * Ante un valor invalido no retorna: redirige a `destinoError`. La comparacion
 * entre precio y precio original se hace sobre los valores ya redondeados a dos
 * decimales (lo hace `importe()`), porque las columnas son `numeric(10,2)`: dos
 * cifras que solo se distinguieran en el tercer decimal pasarian la validacion
 * y chocarian despues contra la restriccion de la base, ya iguales.
 */
function leerCampos(formData: FormData, destinoError: string): CamposProducto {
  const resultado = esquemaProducto.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!resultado.success) {
    volverConError(destinoError, primerError(resultado.error));
  }

  // El inventario se valida aparte porque `Object.fromEntries()` se queda con
  // el ULTIMO valor de cada campo repetido, y aqui `inventario_talla` viene una
  // vez por fila del formulario. Hay que leerlas con `getAll()`.
  const inventario = inventarioTallas().safeParse({
    inventario_talla: formData.getAll("inventario_talla").map(String),
    inventario_cantidad: formData.getAll("inventario_cantidad").map(String),
  });

  if (!inventario.success) {
    volverConError(destinoError, primerError(inventario.error));
  }

  return { ...resultado.data, inventario_tallas: inventario.data };
}

function mensajeDeErrorSupabase(code: string, message: string, verbo: string) {
  return code === "42501"
    ? `No tienes permisos para ${verbo} productos.`
    : `No se pudo ${verbo} el producto: ${message}`;
}

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

/**
 * Alta de producto desde `<form action={crearProducto}>`.
 *
 * `redirect()` funciona lanzando una excepcion interna de Next, asi que tanto
 * el camino feliz como el de error salen por la misma via y nada de lo que
 * haya despues se ejecuta.
 */
export async function crearProducto(formData: FormData) {
  const campos = leerCampos(formData, FORMULARIO_NUEVO);

  const supabase = await createClient();
  const { urls, errores } = await subirImagenes(
    supabase,
    archivosDeFormData(formData, "imagenes_upload"),
  );

  // Si alguna imagen falla no se guarda nada: es preferible a crear el producto
  // con la galeria incompleta y que nadie se entere.
  if (errores.length > 0) {
    volverConError(
      FORMULARIO_NUEVO,
      `No se pudieron subir algunas imágenes y el producto no se guardó. ${errores.join(" ")}`,
    );
  }

  const nuevo: ProductoInsert = { ...campos, imagenes: urls };
  const { error } = await supabase.from("productos").insert(nuevo);

  if (error) {
    console.error("[productos] Error al crear:", error);
    volverConError(
      FORMULARIO_NUEVO,
      mensajeDeErrorSupabase(error.code ?? "", error.message, "crear"),
    );
  }

  revalidatePath(LISTADO);
  refrescarTiendaPublica();
  redirect(LISTADO);
}

/**
 * Edicion de producto. El `id` viaja en un input oculto del formulario.
 *
 * La galeria final son las imagenes que siguieron marcadas en el formulario
 * (`imagenes_actuales`) mas las recien subidas. Desmarcar una imagen la quita
 * del producto, pero el objeto permanece en el bucket.
 */
export async function actualizarProducto(formData: FormData) {
  // Se exige UUID, no "una cadena cualquiera": un `id` con otro formato hace
  // fallar la consulta con 22P02, y validarlo aqui evita el viaje a la base.
  const idValidado = z.uuid().safeParse(formData.get("id"));

  if (!idValidado.success) {
    volverConError(LISTADO, "Falta el identificador del producto a editar.");
  }

  const id = idValidado.data;

  const destinoError = `${LISTADO}/${id}`;
  const campos = leerCampos(formData, destinoError);

  const supabase = await createClient();
  const { urls, errores } = await subirImagenes(
    supabase,
    archivosDeFormData(formData, "imagenes_upload"),
  );

  if (errores.length > 0) {
    volverConError(
      destinoError,
      `No se pudieron subir algunas imágenes y no se guardaron los cambios. ${errores.join(" ")}`,
    );
  }

  const conservadas = formData
    .getAll("imagenes_actuales")
    // Las casillas devuelven las URLs que el propio formulario pintó, pero la
    // acción es un endpoint público: nada impide enviar aquí un enlace a otro
    // dominio y dejar la ficha del producto cargando imágenes de un tercero
    // que vería la IP de cada visitante. Se exige https y se acota el número.
    .filter(
      (valor): valor is string =>
        typeof valor === "string" &&
        valor.startsWith("https://") &&
        valor.length <= 500,
    )
    .slice(0, 20);

  // `Set` evita repetir una URL si la imagen ya estaba y se vuelve a subir:
  // como el nombre del objeto es el hash del contenido, la URL es la misma.
  const imagenes = [...new Set([...conservadas, ...urls])];

  const cambios: ProductoUpdate = { ...campos, imagenes };

  // Igual que en el borrado: un UPDATE bloqueado por la clausula `using` de
  // RLS no lanza error, simplemente no encuentra la fila. El `.select()`
  // devuelve lo realmente escrito, que es la unica forma de distinguir
  // "actualizado" de "no tenias permiso".
  const { data, error } = await supabase
    .from("productos")
    .update(cambios)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[productos] Error al actualizar:", error);
    volverConError(
      destinoError,
      mensajeDeErrorSupabase(error.code ?? "", error.message, "editar"),
    );
  }

  if (!data || data.length === 0) {
    volverConError(
      destinoError,
      "No se guardaron los cambios: el producto no existe o tu cuenta no tiene permisos.",
    );
  }

  revalidatePath(LISTADO);
  revalidatePath(destinoError);
  refrescarTiendaPublica();
  redirect(LISTADO);
}

/**
 * Baja de producto. Se invoca desde el listado con `bind`, de modo que el `id`
 * viaja en el closure del servidor y no en un campo manipulable del formulario.
 */
export type ResultadoBorrado = { ok: true } | { ok: false; error: string };

/**
 * Baja de producto. Se invoca desde el listado con `bind`, de modo que el `id`
 * viaja en el closure del servidor y no en un campo manipulable del formulario.
 *
 * Devuelve el fallo como DATO en vez de lanzarlo. Un `throw` desde una Server
 * Action llega al navegador convertido en el error generico #441 de React: en
 * produccion React borra el mensaje para no filtrar detalles del servidor, asi
 * que el texto cuidadosamente escrito aqui nunca se veia. Como valor de
 * retorno viaja intacto.
 */
export async function eliminarProducto(id: string): Promise<ResultadoBorrado> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Falta el identificador del producto." };
  }

  const supabase = await createClient();

  // El `.select()` es imprescindible: a diferencia del INSERT (que lanza 42501
  // al violar `with check`), un DELETE bloqueado por la clausula `using` de RLS
  // simplemente no encuentra la fila y devuelve 0 filas sin error. Sin
  // comprobar lo devuelto, un usuario sin permisos veria un borrado "exitoso".
  const { data, error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[productos] Error al eliminar:", error);

    // 23503 = violacion de clave foranea. `pedidos_items.producto_id` usa
    // `on delete restrict` para no destruir el historial de pedidos.
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "No se puede eliminar: el producto aparece en pedidos ya registrados. " +
          "Cambialo a estado 'borrador' para retirarlo de la tienda.",
      };
    }

    return {
      ok: false,
      error: `No se pudo eliminar el producto: ${error.message}`,
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "No se elimino el producto: no existe o tu cuenta no tiene permisos.",
    };
  }

  revalidatePath(LISTADO);
  refrescarTiendaPublica();
  return { ok: true };
}
