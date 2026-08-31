"use server";

import { esAgenciaValida } from "@/lib/envio";
import { createClient } from "@/lib/supabase/server";
import type { ItemCarrito } from "@/store/carrito";

export type ResultadoPedido =
  | { exito: true; pedidoId: string }
  | { exito: false; error: string };

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
  // Solo ciudad o distrito: la direccion exacta la pone la agencia, asi que
  // "Lima" es una respuesta perfectamente valida.
  if (direccion.length < 3) {
    return "Ingresa tu ciudad o distrito.";
  }

  return { nombre, dni, telefono, direccion };
}

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
  const cliente = validarCliente(formData);
  if (typeof cliente === "string") {
    return { exito: false, error: cliente };
  }

  const agencia = texto(formData, "agencia");
  if (!esAgenciaValida(agencia)) {
    return { exito: false, error: "Selecciona una agencia de envío." };
  }

  const sede = texto(formData, "sede_agencia");
  if (sede.length < 3) {
    return {
      exito: false,
      error: "Indica la sede de la agencia donde recogerás el pedido.",
    };
  }

  if (!Array.isArray(carrito) || carrito.length === 0) {
    return { exito: false, error: "Tu carrito está vacío." };
  }

  const items = carrito.map((item) => ({
    producto_id: String(item.id_producto),
    cantidad: Math.trunc(Number(item.cantidad)),
    talla: item.talla ? String(item.talla) : null,
  }));

  if (items.some((i) => !Number.isInteger(i.cantidad) || i.cantidad <= 0)) {
    return { exito: false, error: "Alguna cantidad del carrito no es válida." };
  }

  const supabase = await createClient();

  const { data: pedidoId, error } = await supabase.rpc("procesar_checkout", {
    p_cliente_nombre: cliente.nombre,
    p_cliente_telefono: cliente.telefono,
    p_cliente_dni: cliente.dni,
    p_direccion_envio: cliente.direccion,
    p_items: items,
    p_agencia: agencia,
    p_sede_agencia: sede,
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
