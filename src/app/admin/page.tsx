import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Inbox,
  Package,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import BadgeEstadoPedido from "@/components/admin/BadgeEstadoPedido";
import { fecha, inicioDelMesLima, moneda, nombreDelMesLima } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/lib/supabase/types";

export const metadata = {
  title: "Dashboard",
};

/** Un pedido cuenta como venta cuando ya está cobrado o en camino. */
const ESTADOS_VENDIDOS: EstadoPedido[] = ["confirmado", "enviado", "entregado"];

/** Umbral por debajo del cual un producto se considera en riesgo de agotarse. */
const STOCK_CRITICO = 3;

type Metricas = {
  ventasDelMes: number;
  pedidosDelMes: number;
  pendientes: number | null;
  productosActivos: number | null;
  stockCritico: number | null;
  ultimos: {
    id: string;
    creado_en: string;
    cliente_nombre: string;
    total: number;
    estado: EstadoPedido;
  }[];
  errores: string[];
};

async function cargarMetricas(): Promise<Metricas> {
  const supabase = await createClient();
  const desde = inicioDelMesLima().toISOString();

  // Las cinco consultas son independientes: en paralelo tardan lo que la más
  // lenta, no la suma.
  const [ventas, pendientes, activos, criticos, ultimos] = await Promise.all([
    supabase
      .from("pedidos")
      .select("total")
      .in("estado", ESTADOS_VENDIDOS)
      .gte("creado_en", desde),

    // `head: true` con `count` pide sólo la cabecera: cuenta en la base sin
    // traerse ninguna fila.
    supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),

    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo"),

    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo")
      .lte("stock_total", STOCK_CRITICO),

    supabase
      .from("pedidos")
      .select("id, creado_en, cliente_nombre, total, estado")
      .order("creado_en", { ascending: false })
      .limit(5),
  ]);

  const errores: string[] = [];
  for (const [nombre, resultado] of [
    ["ventas del mes", ventas],
    ["pedidos pendientes", pendientes],
    ["productos activos", activos],
    ["stock crítico", criticos],
    ["últimos pedidos", ultimos],
  ] as const) {
    if (resultado.error) {
      console.error(`[admin] Fallo al cargar ${nombre}:`, resultado.error);
      errores.push(nombre);
    }
  }

  // La suma se hace aquí y no en la base porque las funciones de agregación de
  // PostgREST no están habilitadas por defecto en Supabase. Con el volumen de
  // una tienda pequeña es irrelevante; si el mes llega a miles de pedidos,
  // conviene moverlo a una función SQL.
  const filasVentas = ventas.data ?? [];
  const ventasDelMes =
    Math.round(filasVentas.reduce((suma, p) => suma + p.total, 0) * 100) / 100;

  return {
    ventasDelMes,
    pedidosDelMes: filasVentas.length,
    pendientes: pendientes.count ?? null,
    productosActivos: activos.count ?? null,
    stockCritico: criticos.count ?? null,
    ultimos: ultimos.data ?? [],
    errores,
  };
}

export default async function AdminDashboardPage() {
  const m = await cargarMetricas();

  const kpis: Kpi[] = [
    {
      label: `Ventas de ${nombreDelMesLima()}`,
      value: moneda.format(m.ventasDelMes),
      hint: `${m.pedidosDelMes} ${m.pedidosDelMes === 1 ? "pedido cerrado" : "pedidos cerrados"}`,
      icon: DollarSign,
    },
    {
      label: "Pedidos Pendientes",
      value: textoNumero(m.pendientes),
      hint: "esperando confirmación de pago",
      icon: Clock,
      alerta: (m.pendientes ?? 0) > 0,
    },
    {
      label: "Productos Activos",
      value: textoNumero(m.productosActivos),
      hint: "visibles en la tienda",
      icon: Package,
    },
    {
      label: "Stock Crítico",
      value: textoNumero(m.stockCritico),
      hint: `activos con ${STOCK_CRITICO} unidades o menos`,
      icon: AlertTriangle,
      peligro: (m.stockCritico ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Sixty Nine Skate &amp; Apparel
        </p>

        <h1 className="mt-2 text-4xl leading-none font-black tracking-tighter text-white uppercase sm:text-5xl lg:text-6xl">
          Panel de
          <span className="text-neon"> Control</span>
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="h-1 w-24 bg-neon" aria-hidden />
          <p className="text-sm text-neutral-500">
            Resumen operativo de la tienda.
          </p>
        </div>
      </header>

      {m.errores.length > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo cargar: {m.errores.join(", ")}. El resto de cifras sí es
          correcto.
        </p>
      )}

      {/* Indicadores */}
      <section aria-label="Indicadores clave">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      {/* Últimos pedidos */}
      <section aria-label="Últimos pedidos">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Últimos pedidos
          </h2>

          <Link
            href="/admin/pedidos"
            className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neon"
          >
            Ver todos →
          </Link>
        </div>

        {m.ultimos.length === 0 ? (
          <div className="mt-4 flex flex-col items-center border border-dashed border-ink-line bg-ink-soft px-6 py-12 text-center">
            <Inbox className="h-7 w-7 text-neutral-600" aria-hidden />
            <p className="mt-3 text-sm text-neutral-500">
              Todavía no hay pedidos registrados.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto border border-ink-line bg-ink-soft">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-line text-left">
                  {["Pedido", "Cliente", "Fecha", "Total", "Estado"].map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {m.ultimos.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-b border-ink-line/60 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pedidos/${pedido.id}`}
                        className="font-mono text-xs font-bold whitespace-nowrap text-neon underline-offset-4 hover:underline"
                      >
                        #{pedido.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>

                    <td className="max-w-xs truncate px-4 py-3 text-white">
                      {pedido.cliente_nombre}
                    </td>

                    <td className="px-4 py-3 text-xs whitespace-nowrap text-neutral-400">
                      {fecha.format(new Date(pedido.creado_en))}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap text-white">
                      {moneda.format(pedido.total)}
                    </td>

                    <td className="px-4 py-3">
                      <BadgeEstadoPedido estado={pedido.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  /** Resalta en neón cuando hay algo que atender. */
  alerta?: boolean;
  /** Resalta en rojo cuando el dato es un problema. */
  peligro?: boolean;
};

/** Un contador que no se pudo leer se muestra como guion, no como 0. */
function textoNumero(valor: number | null): string {
  return valor === null ? "—" : String(valor);
}

function KpiCard({ label, value, hint, icon: Icon, alerta, peligro }: Kpi) {
  const acento = peligro
    ? "text-red-400"
    : alerta
      ? "text-neon"
      : "text-neutral-500";

  return (
    <article className="group relative overflow-hidden border border-ink-line bg-ink-soft p-5 transition-colors duration-200 hover:border-neon/50">
      {/* Filo neón que aparece al pasar el cursor */}
      <span
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-neon transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[11px] font-bold tracking-[0.15em] text-neutral-500 uppercase">
          {label}
        </h3>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center border border-ink-line bg-ink transition-colors group-hover:border-neon/40 ${acento}`}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>

      <p className="mt-5 font-mono text-3xl font-black tracking-tight text-white lg:text-4xl">
        {value}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-ink-line pt-4">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-neutral-600" aria-hidden />
        <span className="truncate text-xs text-neutral-500">{hint}</span>
      </div>
    </article>
  );
}
