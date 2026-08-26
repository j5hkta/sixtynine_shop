import {
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "Dashboard",
};

type Kpi = {
  label: string;
  value: string;
  hint: string;
  delta: string;
  /** `true` pinta la variación en amarillo neón; `false`, en rojo. */
  positive: boolean;
  icon: LucideIcon;
};

// TODO: reemplazar por consultas reales a Supabase (tabla `productos`, `pedidos`, `clientes`).
const kpis: Kpi[] = [
  {
    label: "Ventas de Hoy",
    value: "$1.284.900",
    hint: "23 transacciones cerradas",
    delta: "+12,5%",
    positive: true,
    icon: DollarSign,
  },
  {
    label: "Pedidos Pendientes",
    value: "18",
    hint: "5 esperando despacho",
    delta: "+4",
    positive: true,
    icon: Clock,
  },
  {
    label: "Stock Crítico",
    value: "7",
    hint: "productos bajo 5 unidades",
    delta: "-3",
    positive: false,
    icon: AlertTriangle,
  },
  {
    label: "Nuevos Clientes",
    value: "42",
    hint: "en los últimos 7 días",
    delta: "+8,2%",
    positive: true,
    icon: UserPlus,
  },
];

export default function AdminDashboardPage() {
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
          <span className="border border-neon/40 px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-neon uppercase">
            Mock data
          </span>
        </div>
      </header>

      {/* Indicadores */}
      <section aria-label="Indicadores clave">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint, delta, positive, icon: Icon }: Kpi) {
  const TrendIcon = positive ? TrendingUp : TrendingDown;

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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-line bg-ink text-neutral-500 transition-colors group-hover:border-neon/40 group-hover:text-neon">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>

      <p className="mt-5 font-mono text-3xl font-black tracking-tight text-white lg:text-4xl">
        {value}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-ink-line pt-4">
        <span
          className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${
            positive ? "text-neon" : "text-red-400"
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden />
          {delta}
        </span>
        <span className="truncate text-xs text-neutral-500">{hint}</span>
      </div>
    </article>
  );
}
