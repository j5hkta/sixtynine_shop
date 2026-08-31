import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  IdCard,
  ImageOff,
  MapPin,
  Phone,
  Truck,
  User,
} from "lucide-react";

import FormularioEnvio from "@/components/admin/FormularioEnvio";
import SelectorEstadoPedido from "@/components/admin/SelectorEstadoPedido";
import { AGENCIAS, esAgenciaValida } from "@/lib/envio";
import { fecha, moneda } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Detalle de pedido",
};

/**
 * Un solo viaje a la base de datos: PostgREST resuelve los embebidos por las
 * claves foráneas declaradas en el esquema (`pedidos_items.pedido_id` y
 * `pedidos_items.producto_id`).
 *
 * `productos(...)` trae el título y las imágenes actuales del producto, no una
 * copia del momento de la compra: si el título cambia después, aquí se verá el
 * nuevo. El precio, en cambio, sale de `pedidos_items.precio_unitario`, que sí
 * es la foto del momento en que se cobró.
 */
async function cargarPedido(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedidos_items(*, productos(titulo, imagenes))")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[pedidos] Error al cargar el detalle:", error);
  }

  return data;
}

export default async function DetallePedidoPage({
  params,
}: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  const pedido = await cargarPedido(id);

  if (!pedido) {
    notFound();
  }

  const items = pedido.pedidos_items ?? [];
  const sumaLineas =
    Math.round(
      items.reduce((suma, item) => suma + item.precio_unitario * item.cantidad, 0) *
        100,
    ) / 100;

  // `pedidos.total` incluye el envío, así que la comparación tiene que sumarlo:
  // contrastarlo sólo contra las líneas haría saltar la alerta en todos los
  // pedidos con envío cobrado.
  const envio = pedido.costo_envio ?? 0;
  const esperado = Math.round((sumaLineas + envio) * 100) / 100;

  // El total guardado es el que se cobró. Si no cuadra, alguien editó datos a
  // mano y conviene saberlo.
  const descuadre = Math.abs(esperado - pedido.total) > 0.005;

  // Los pedidos anteriores al cambio de modelo no tienen agencia: se muestra el
  // hueco en vez de ocultar el bloque, porque un envío sin destino es
  // justamente lo que hay que notar antes de empaquetar.
  const nombreAgencia =
    pedido.agencia && esAgenciaValida(pedido.agencia)
      ? AGENCIAS[pedido.agencia].etiqueta
      : null;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neon"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a Pedidos
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
            Pedido
          </p>
          <h1 className="mt-2 font-mono text-3xl font-black tracking-tighter text-neon sm:text-4xl">
            #{pedido.id.slice(0, 8).toUpperCase()}
          </h1>
          <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
        </div>

        <p className="font-mono text-3xl font-black text-white">
          {moneda.format(pedido.total)}
        </p>
      </header>

      {descuadre && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          El total guardado ({moneda.format(pedido.total)}) no coincide con las
          líneas más el envío ({moneda.format(esperado)}). Revisa si se editó
          algo a mano.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Bloque 1: cliente */}
        <section className="border border-neutral-400 bg-ink-soft p-6">
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Cliente
          </h2>

          <dl className="mt-6 space-y-5 text-sm">
            <Dato icono={User} etiqueta="Nombre">
              {pedido.cliente_nombre}
            </Dato>
            <Dato icono={IdCard} etiqueta="DNI" mono>
              {pedido.cliente_dni}
            </Dato>
            <Dato icono={Phone} etiqueta="Teléfono" mono>
              <a
                href={`https://wa.me/51${pedido.cliente_telefono}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-neon"
              >
                {pedido.cliente_telefono}
              </a>
            </Dato>
            <Dato icono={MapPin} etiqueta="Ciudad / Distrito">
              {pedido.direccion_envio}
            </Dato>
            <Dato icono={CalendarClock} etiqueta="Fecha">
              {fecha.format(new Date(pedido.creado_en))}
            </Dato>
          </dl>

          {/* Destacado: son los dos datos que hay que leer para rotular el
              paquete, y perderlos entre el resto obligaría a buscarlos en cada
              pedido. */}
          <dl className="mt-6 space-y-4 border-2 border-neon bg-neon/5 p-4">
            <Dato icono={Truck} etiqueta="Agencia" destacado>
              {nombreAgencia ?? (
                <span className="text-amber-400">Sin agencia registrada</span>
              )}
            </Dato>
            <Dato icono={Building2} etiqueta="Sede de recojo" destacado>
              {pedido.sede_agencia ?? (
                <span className="text-amber-400">Sin sede registrada</span>
              )}
            </Dato>
          </dl>

          <div className="mt-6 border-t border-ink-line pt-6">
            <p className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
              Estado
            </p>
            <div className="mt-3">
              <SelectorEstadoPedido id={pedido.id} estado={pedido.estado} />
            </div>
          </div>

          <FormularioEnvio
            pedidoId={pedido.id}
            trackingNumero={pedido.tracking_numero}
            trackingClave={pedido.tracking_clave}
            yaEnviado={pedido.estado === "enviado"}
          />
        </section>

        {/* Bloque 2: artículos */}
        <section className="border border-neutral-400 bg-ink-soft p-6">
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Artículos ({items.length})
          </h2>

          {items.length === 0 ? (
            <p className="mt-6 border border-dashed border-ink-line px-6 py-10 text-center text-sm text-neutral-500">
              Este pedido no tiene líneas registradas.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {items.map((item) => {
                const portada = item.productos?.imagenes?.[0];
                const titulo = item.productos?.titulo ?? "Producto eliminado";

                return (
                  <li
                    key={item.id}
                    className="flex gap-4 border border-ink-line bg-ink p-4"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden border border-ink-line bg-ink-soft">
                      {portada ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={portada}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-neutral-800/40 text-neutral-600">
                          <ImageOff className="h-6 w-6" aria-hidden />
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-sm font-bold text-white">
                        {titulo}
                      </p>

                      <p className="text-[11px] font-bold tracking-[0.15em] text-neutral-500 uppercase">
                        {item.talla ? (
                          <>
                            Talla{" "}
                            <span className="font-mono text-neutral-300">
                              {item.talla}
                            </span>{" "}
                            ·{" "}
                          </>
                        ) : null}
                        Cantidad{" "}
                        <span className="font-mono text-neutral-300">
                          {item.cantidad}
                        </span>
                      </p>

                      <p className="mt-auto pt-2 text-xs text-neutral-500">
                        <span className="font-mono">
                          {moneda.format(item.precio_unitario)}
                        </span>{" "}
                        c/u
                      </p>
                    </div>

                    <p className="shrink-0 self-center font-mono text-base font-black whitespace-nowrap text-white">
                      {moneda.format(item.precio_unitario * item.cantidad)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="mt-6 space-y-2 border-t border-ink-line pt-6 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-400">Productos</dt>
              <dd className="font-mono text-neutral-300">
                {moneda.format(sumaLineas)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-400">
                Envío
                {pedido.zona_envio && (
                  <span className="ml-2 text-xs text-neutral-600 capitalize">
                    {pedido.zona_envio}
                  </span>
                )}
              </dt>
              <dd className="font-mono text-neutral-300">
                {moneda.format(envio)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-ink-line pt-4">
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              Total
            </span>
            <span className="font-mono text-2xl font-black text-neon">
              {moneda.format(pedido.total)}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  mono,
  destacado,
  children,
}: {
  icono: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  etiqueta: string;
  mono?: boolean;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icono
        className={`mt-0.5 h-4 w-4 shrink-0 ${destacado ? "text-neon" : "text-neutral-600"}`}
        aria-hidden
      />
      <div className="min-w-0">
        <dt
          className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
            destacado ? "text-neon" : "text-neutral-600"
          }`}
        >
          {etiqueta}
        </dt>
        <dd
          className={`mt-0.5 break-words text-white ${mono ? "font-mono" : ""} ${
            destacado ? "text-base font-bold" : ""
          }`}
        >
          {children}
        </dd>
      </div>
    </div>
  );
}
