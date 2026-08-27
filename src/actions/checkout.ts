"use server";

import { createClient } from "@/lib/supabase/server";
import type { ItemCarrito } from "@/store/carrito";

/** Numero de WhatsApp de la tienda (formato internacional, sin +). */
const WHATSAPP = "51992657906";

export type ResultadoPedido =
  | { ok: true; url: string; pedidoId: string }
  | { ok: false; error: string };

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Precio con 2 decimales, en soles. Duplicado a proposito: `src/lib/formato`
 *  es un modulo de UI y este archivo corre solo en el servidor. */
function soles(monto: number): string {
  return `S/ ${monto.toFixed(2)}`;
}

type DatosCliente = {
  nombre: string;
  dni: string;
  telefono: string;
  direccion: string;
};

/**
 * Validacion en el cliente-de-servidor, para dar un mensaje util sin gastar un
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
 * Cierra un pedido y devuelve el enlace de WhatsApp con el resumen.
 *
 * Toda la logica de negocio vive ahora en `public.procesar_checkout()`: valida
 * el stock con las filas bloqueadas (`FOR UPDATE`), lo descuenta, calcula el
 * total con los precios reales e inserta cabecera y detalle, todo en una sola
 * transaccion. Del carrito del navegador solo se aceptan *que* producto, *que*
 * talla y *cuantas* unidades; el precio que traiga se descarta.
 *
 * Esta Server Action ya no inserta nada: `anon` ni siquiera tiene permiso de
 * INSERT sobre `pedidos`.
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

  return {
    ok: true,
    pedidoId,
    url: await enlaceWhatsApp(pedidoId, cliente, items),
  };
}

/**
 * Arma el texto para WhatsApp. Los titulos y precios se releen de `productos`
 * (SELECT publico) porque `procesar_checkout()` devuelve solo el id y las
 * tablas de pedidos no son legibles para `anon`.
 *
 * El pedido guardado en la base de datos es el registro que manda; este
 * mensaje es una copia de cortesia e incluye el numero de pedido para poder
 * contrastarlo.
 */
async function enlaceWhatsApp(
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

  const lineas = items.map((item) => {
    const producto = porId.get(item.producto_id);
    const titulo = producto?.titulo ?? "Producto";
    const subtotal = (producto?.precio ?? 0) * item.cantidad;
    return { titulo, talla: item.talla, cantidad: item.cantidad, subtotal };
  });

  const total =
    Math.round(lineas.reduce((suma, l) => suma + l.subtotal, 0) * 100) / 100;

  const mensaje = [
    "*NUEVO PEDIDO — SIXTY NINE SKATE & APPAREL*",
    `Pedido: #${pedidoId.slice(0, 8).toUpperCase()}`,
    "",
    `*Cliente:* ${cliente.nombre}`,
    `*DNI:* ${cliente.dni}`,
    `*Teléfono:* ${cliente.telefono}`,
    `*Dirección de envío:* ${cliente.direccion}`,
    "",
    "*Productos:*",
    lineas
      .map(
        (l) =>
          `• ${l.titulo}${l.talla ? ` (Talla ${l.talla})` : ""} x${l.cantidad} — ${soles(l.subtotal)}`,
      )
      .join("\n"),
    "",
    `*TOTAL: ${soles(total)}*`,
    "",
    "_Envío por coordinar._",
  ].join("\n");

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
