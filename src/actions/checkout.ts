"use server";

import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import type { PedidoInsert, PedidoItemInsert } from "@/lib/supabase/types";
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
 * Regla central: del carrito del cliente solo se aceptan *que* producto, *que*
 * talla y *cuantas* unidades. El precio y el stock se releen de la base de
 * datos, porque el carrito vive en el localStorage del navegador y cualquiera
 * puede editarlo antes de enviarlo.
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

  // Se normaliza lo que llega del cliente antes de tocarlo para nada mas.
  const lineas = carrito.map((item) => ({
    producto_id: String(item.id_producto),
    talla: item.talla ? String(item.talla) : null,
    cantidad: Math.trunc(Number(item.cantidad)),
  }));

  if (lineas.some((l) => !Number.isInteger(l.cantidad) || l.cantidad <= 0)) {
    return { ok: false, error: "Alguna cantidad del carrito no es válida." };
  }

  const supabase = await createClient();

  const ids = [...new Set(lineas.map((l) => l.producto_id))];
  const { data: productos, error: errorProductos } = await supabase
    .from("productos")
    .select("id, titulo, precio, stock, estado")
    .in("id", ids);

  if (errorProductos) {
    console.error("[checkout] Error al leer productos:", errorProductos);
    return {
      ok: false,
      error: "No pudimos verificar el catálogo. Inténtalo de nuevo.",
    };
  }

  const porId = new Map((productos ?? []).map((p) => [p.id, p]));

  // El stock se valida por producto, no por linea: la misma tabla en talla M y
  // en talla L sale del mismo inventario, y validarlas por separado dejaria
  // pasar un pedido de 3 + 4 unidades contra un stock de 5.
  const unidadesPorProducto = new Map<string, number>();
  for (const linea of lineas) {
    unidadesPorProducto.set(
      linea.producto_id,
      (unidadesPorProducto.get(linea.producto_id) ?? 0) + linea.cantidad,
    );
  }

  for (const [productoId, unidades] of unidadesPorProducto) {
    const producto = porId.get(productoId);

    if (!producto || producto.estado === "borrador") {
      return {
        ok: false,
        error: "Uno de los productos ya no está disponible. Revisa tu carrito.",
      };
    }
    if (producto.estado === "agotado") {
      return { ok: false, error: `"${producto.titulo}" está agotado.` };
    }
    if (producto.stock < unidades) {
      return {
        ok: false,
        error:
          producto.stock === 0
            ? `"${producto.titulo}" se quedó sin stock.`
            : `Solo quedan ${producto.stock} unidades de "${producto.titulo}" y pediste ${unidades}.`,
      };
    }
  }

  // Total calculado con el precio de la base de datos. El `precio` que venia en
  // el carrito se descarta por completo.
  const detalle = lineas.map((linea) => {
    const producto = porId.get(linea.producto_id)!;
    return {
      ...linea,
      titulo: producto.titulo,
      precio_unitario: producto.precio,
      subtotal: producto.precio * linea.cantidad,
    };
  });

  const total =
    Math.round(detalle.reduce((suma, l) => suma + l.subtotal, 0) * 100) / 100;

  // El id se genera aqui en vez de dejarlo a la base de datos porque la
  // politica RLS solo permite INSERT a `anon`, no SELECT: un
  // `.insert().select()` no podria devolver la fila recien creada.
  const pedidoId = randomUUID();

  const pedido: PedidoInsert = {
    id: pedidoId,
    cliente_nombre: cliente.nombre,
    cliente_telefono: cliente.telefono,
    cliente_dni: cliente.dni,
    direccion_envio: cliente.direccion,
    total,
  };

  const { error: errorPedido } = await supabase.from("pedidos").insert(pedido);

  if (errorPedido) {
    console.error("[checkout] Error al crear el pedido:", errorPedido);
    return {
      ok: false,
      error: "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    };
  }

  const items: PedidoItemInsert[] = detalle.map((linea) => ({
    pedido_id: pedidoId,
    producto_id: linea.producto_id,
    cantidad: linea.cantidad,
    precio_unitario: linea.precio_unitario,
    talla: linea.talla,
  }));

  const { error: errorItems } = await supabase
    .from("pedidos_items")
    .insert(items);

  if (errorItems) {
    // Las dos inserciones son peticiones HTTP separadas, no una transaccion:
    // aqui la cabecera ya esta escrita y no se puede borrar (DELETE es solo
    // para admins). Queda un pedido huerfano que hay que limpiar a mano.
    // La solucion definitiva es la funcion `security definer` que documenta
    // `supabase/pedidos_schema.sql`.
    console.error(
      `[checkout] Pedido ${pedidoId} quedó sin items (requiere limpieza manual):`,
      errorItems,
    );
    return {
      ok: false,
      error: "No pudimos guardar el detalle de tu pedido. Contáctanos.",
    };
  }

  return {
    ok: true,
    pedidoId,
    url: enlaceWhatsApp(pedidoId, cliente, detalle, total),
  };
}

function enlaceWhatsApp(
  pedidoId: string,
  cliente: DatosCliente,
  detalle: {
    titulo: string;
    talla: string | null;
    cantidad: number;
    subtotal: number;
  }[],
  total: number,
): string {
  const productos = detalle
    .map(
      (l) =>
        `• ${l.titulo}${l.talla ? ` (Talla ${l.talla})` : ""} x${l.cantidad} — ${soles(l.subtotal)}`,
    )
    .join("\n");

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
    productos,
    "",
    `*TOTAL: ${soles(total)}*`,
    "",
    "_Envío por coordinar._",
  ].join("\n");

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
