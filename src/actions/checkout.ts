"use server";

import { getPreferenceClient } from "@/lib/mercadopago";
import { createClient } from "@/lib/supabase/server";
import type { ItemCarrito } from "@/store/carrito";

export type ResultadoPedido =
  | { ok: true; url: string; pedidoId: string }
  | { ok: false; error: string };

/** Base pública del sitio, para las URLs de retorno y el webhook. */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

type DatosCliente = {
  nombre: string;
  dni: string;
  telefono: string;
  direccion: string;
};

/**
 * Validacion en el servidor de Next, para dar un mensaje util sin gastar un
 * viaje a la base de datos. `procesar_checkout()` repite estas mismas reglas:
 * esta capa es comodidad, la de Postgres es la que manda.
 */
function validarCliente(formData: FormData): DatosCliente | string {
  const nombre = texto(formData, "nombre");
  const dni = texto(formData, "dni");
  const telefono = texto(formData, "telefono").replace(/\s+/g, "");
  const direccion = texto(formData, "direccion");

  if (nombre.length < 3) {
    return "Ingresa tu nombre completo.";
  }
  if (!/^\d{8}$/.test(dni)) {
    return "El DNI debe tener exactamente 8 dígitos.";
  }
  if (!/^9\d{8}$/.test(telefono)) {
    return "El teléfono debe ser un celular peruano de 9 dígitos que empiece en 9.";
  }
  if (direccion.length < 10) {
    return "Ingresa una dirección de envío completa.";
  }

  return { nombre, dni, telefono, direccion };
}

/**
 * Cierra un pedido y devuelve la URL de pago de Mercado Pago.
 *
 * El orden importa: primero se registra el pedido con `procesar_checkout()`
 * (que valida stock con las filas bloqueadas, lo descuenta y calcula el total
 * con los precios reales, todo en una transaccion), y solo despues se crea la
 * preferencia de pago. Asi nunca se cobra por algo que la base de datos ya
 * rechazo.
 *
 * Del carrito del navegador solo se aceptan *que* producto, *que* talla y
 * *cuantas* unidades; el precio que traiga se descarta.
 */
export async function procesarPedido(
  formData: FormData,
  carrito: ItemCarrito[],
): Promise<ResultadoPedido> {
  const cliente = validarCliente(formData);
  if (typeof cliente === "string") {
    return { ok: false, error: cliente };
  }

  if (!Array.isArray(carrito) || carrito.length === 0) {
    return { ok: false, error: "Tu carrito está vacío." };
  }

  const items = carrito.map((item) => ({
    producto_id: String(item.id_producto),
    cantidad: Math.trunc(Number(item.cantidad)),
    talla: item.talla ? String(item.talla) : null,
  }));

  if (items.some((i) => !Number.isInteger(i.cantidad) || i.cantidad <= 0)) {
    return { ok: false, error: "Alguna cantidad del carrito no es válida." };
  }

  const supabase = await createClient();

  const { data: pedidoId, error } = await supabase.rpc("procesar_checkout", {
    p_cliente_nombre: cliente.nombre,
    p_cliente_telefono: cliente.telefono,
    p_cliente_dni: cliente.dni,
    p_direccion_envio: cliente.direccion,
    p_items: items,
  });

  if (error) {
    console.error("[checkout] procesar_checkout falló:", error);

    // P0001 (raise_exception) es el SQLSTATE de todos los `RAISE EXCEPTION` de
    // la funcion, y sus mensajes estan escritos para que los lea el cliente
    // (falta de stock, producto retirado...). Cualquier otro codigo es un
    // fallo inesperado y no se expone.
    if (error.code === "P0001") {
      return { ok: false, error: error.message };
    }

    return {
      ok: false,
      error: "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    };
  }

  if (!pedidoId) {
    return {
      ok: false,
      error: "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    };
  }

  try {
    const url = await crearPreferenciaDePago(pedidoId, cliente, items);
    return { ok: true, pedidoId, url };
  } catch (e) {
    // El pedido ya existe y el stock ya se descontó, pero nadie va a pagarlo.
    // Se avisa con el número para poder rescatarlo o cancelarlo a mano.
    console.error(
      `[checkout] Pedido ${pedidoId} creado pero falló la preferencia de MP:`,
      e,
    );
    return {
      ok: false,
      error: `Registramos tu pedido #${pedidoId.slice(0, 8).toUpperCase()} pero no pudimos abrir la pasarela de pago. Escríbenos con ese número.`,
    };
  }
}

/**
 * Crea la preferencia de Checkout Pro y devuelve su URL.
 *
 * Los titulos y precios se releen de `productos` (SELECT publico) porque
 * `procesar_checkout()` devuelve solo el id y las tablas de pedidos no son
 * legibles sin sesion de admin.
 */
async function crearPreferenciaDePago(
  pedidoId: string,
  cliente: DatosCliente,
  items: { producto_id: string; cantidad: number; talla: string | null }[],
): Promise<string> {
  const supabase = await createClient();

  const { data: productos } = await supabase
    .from("productos")
    .select("id, titulo, precio")
    .in("id", [...new Set(items.map((i) => i.producto_id))]);

  const porId = new Map((productos ?? []).map((p) => [p.id, p]));

  const itemsMP = items.map((item, indice) => {
    const producto = porId.get(item.producto_id);
    return {
      id: `${item.producto_id}-${indice}`,
      title: `${producto?.titulo ?? "Producto"}${item.talla ? ` (Talla ${item.talla})` : ""}`,
      quantity: item.cantidad,
      unit_price: producto?.precio ?? 0,
      currency_id: "PEN",
    };
  });

  const preference = getPreferenceClient();

  const respuesta = await preference.create({
    body: {
      items: itemsMP,
      // Es el hilo que une el pago de MP con nuestro pedido: el webhook lo lee
      // para saber qué fila de `pedidos` confirmar. Sin esto no hay forma de
      // relacionarlos.
      external_reference: pedidoId,
      payer: {
        name: cliente.nombre,
        phone: { area_code: "51", number: cliente.telefono },
      },
      back_urls: {
        success: `${SITIO}/?pago=exito&pedido=${pedidoId}`,
        pending: `${SITIO}/?pago=pendiente&pedido=${pedidoId}`,
        failure: `${SITIO}/carrito?pago=error`,
      },
      auto_return: "approved",
      notification_url: `${SITIO}/api/webhooks/mp`,
      statement_descriptor: "SIXTYNINE",
    },
  });

  // `sandbox_init_point` es el entorno de pruebas; con credenciales de
  // producción MP no lo devuelve, así que `init_point` es el que manda.
  const url = respuesta.init_point ?? respuesta.sandbox_init_point;

  if (!url) {
    throw new Error("Mercado Pago no devolvió una URL de pago.");
  }

  return url;
}
