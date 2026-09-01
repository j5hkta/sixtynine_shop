"use server";

import { headers } from "next/headers";

import { z } from "zod";

import { CLAVES_AGENCIA } from "@/lib/envio";
import { comprobarLimite, ipDeCabeceras } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { primerError, sinEtiquetas, textoCorto } from "@/lib/validacion";
import type { ItemCarrito } from "@/store/carrito";

export type ResultadoPedido =
  | { exito: true; pedidoId: string }
  | { exito: false; error: string };

/**
 * Cupo de pedidos por IP.
 *
 * Generoso a propósito: un comprador real puede reintentar tres o cuatro veces
 * si se le agota el stock de algo. Lo que corta es el bucle automatizado, que
 * en cada vuelta bloquea filas de `productos` y descuenta inventario.
 */
const MAX_PEDIDOS = 10;
const VENTANA_SEGUNDOS = 600;

/** Tope de líneas por pedido. Cada una toma un `FOR UPDATE` en la base. */
const MAX_LINEAS = 50;

/** Tope de unidades por línea. */
const MAX_UNIDADES = 99;

/**
 * Datos del comprador.
 *
 * Esta capa da un mensaje útil sin gastar un viaje a la base de datos;
 * `procesar_checkout()` repite las mismas reglas y es la que manda.
 */
const esquemaCliente = z.object({
  nombre: sinEtiquetas(120).pipe(
    z.string().min(3, "ingresa tu nombre completo"),
  ),
  dni: textoCorto(8).pipe(
    z.string().regex(/^\d{8}$/, "debe tener exactamente 8 dígitos"),
  ),
  telefono: z
    .string()
    .transform((valor) => valor.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .regex(/^9\d{8}$/, "debe ser un celular peruano de 9 dígitos que empiece en 9"),
    ),
  // Sólo ciudad o distrito: la dirección exacta la pone la agencia, así que
  // "Lima" es una respuesta perfectamente válida.
  direccion: sinEtiquetas(120).pipe(
    z.string().min(3, "ingresa tu ciudad o distrito"),
  ),
  agencia: z.enum(CLAVES_AGENCIA as [string, ...string[]], {
    message: "selecciona una agencia de envío",
  }),
  sede_agencia: sinEtiquetas(160).pipe(
    z
      .string()
      .min(3, "indica la sede de la agencia donde recogerás el pedido"),
  ),
});

/**
 * Carrito.
 *
 * Llega del `localStorage` del navegador, es decir, de un sitio que el visitante
 * controla por completo: se acepta *qué* producto, *qué* talla y *cuántas*
 * unidades, y nada más. El precio que traiga se descarta —lo relee
 * `procesar_checkout()` de la base— y los topes evitan que un cuerpo con diez
 * mil líneas ponga a la base a tomar diez mil bloqueos de fila.
 */
const esquemaCarrito = z
  .array(
    z.object({
      id_producto: z.uuid("identificador de producto no válido"),
      cantidad: z.coerce.number().int().min(1).max(MAX_UNIDADES),
      talla: textoCorto(20).nullish().default(null),
    }),
  )
  .min(1, "tu carrito está vacío")
  .max(MAX_LINEAS, `no se admiten más de ${MAX_LINEAS} líneas por pedido`);

/**
 * Registra el pedido y devuelve su identificador.
 *
 * Ya no hay pasarela de pago: el cobro se coordina por Yape o efectivo y lo
 * confirma un humano desde el panel. Aun asi el pedido se crea con
 * `procesar_checkout()`, que valida el stock con las filas bloqueadas, lo
 * descuenta y calcula el total con los precios reales dentro de una unica
 * transaccion. Del carrito del navegador solo se aceptan *que* producto, *que*
 * talla y *cuantas* unidades; el precio que traiga se descarta.
 *
 * El pedido nace en estado 'pendiente'. Pasa a 'confirmado' cuando alguien
 * verifica el yapeo en el panel, no automaticamente.
 *
 * El flete no se cobra aqui: el paquete viaja a la agencia elegida y se paga
 * al recogerlo, o lo asume la tienda si el pedido supera el umbral.
 */
export async function procesarPedido(
  formData: FormData,
  carrito: ItemCarrito[],
): Promise<ResultadoPedido> {
  const cliente = esquemaCliente.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!cliente.success) {
    return { exito: false, error: primerError(cliente.error) };
  }

  const lineas = esquemaCarrito.safeParse(carrito);

  if (!lineas.success) {
    return { exito: false, error: primerError(lineas.error) };
  }

  // Falla ABIERTO a propósito: si el limitador no responde (falta la
  // `service_role` key, la base tose), cerrar aquí significaría que la tienda
  // deja de vender. La protección real contra el abuso sigue siendo
  // `procesar_checkout()`, que bloquea las filas y valida el stock.
  const limite = await comprobarLimite(
    "checkout",
    ipDeCabeceras(await headers()),
    MAX_PEDIDOS,
    VENTANA_SEGUNDOS,
  );

  if (limite === "excedido") {
    return {
      exito: false,
      error:
        "Has hecho demasiados pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp.",
    };
  }

  const items = lineas.data.map((item) => ({
    producto_id: item.id_producto,
    cantidad: item.cantidad,
    talla: item.talla,
  }));

  const supabase = await createClient();

  const { data: pedidoId, error } = await supabase.rpc("procesar_checkout", {
    p_cliente_nombre: cliente.data.nombre,
    p_cliente_telefono: cliente.data.telefono,
    p_cliente_dni: cliente.data.dni,
    p_direccion_envio: cliente.data.direccion,
    p_items: items,
    p_agencia: cliente.data.agencia,
    p_sede_agencia: cliente.data.sede_agencia,
  });

  if (error) {
    console.error("[checkout] procesar_checkout falló:", error);

    // P0001 (raise_exception) es el SQLSTATE de todos los `RAISE EXCEPTION` de
    // la funcion, y sus mensajes estan escritos para que los lea el cliente
    // (falta de stock, producto retirado...). Cualquier otro codigo es un
    // fallo inesperado y no se expone.
    if (error.code === "P0001") {
      return { exito: false, error: error.message };
    }

    return {
      exito: false,
      error: "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    };
  }

  if (!pedidoId) {
    return {
      exito: false,
      error: "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    };
  }

  return { exito: true, pedidoId };
}
