import type { EstadoPedido } from "@/lib/supabase/types";

const estilo: Record<EstadoPedido, string> = {
  pendiente: "border-neon bg-neon text-ink",
  confirmado: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  enviado: "border-blue-400/40 bg-blue-400/10 text-blue-300",
  entregado: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  cancelado: "border-ink-line bg-white/5 text-neutral-500",
};

/** Etiqueta de estado, compartida por el dashboard y el listado de pedidos. */
export default function BadgeEstadoPedido({
  estado,
}: {
  estado: EstadoPedido;
}) {
  return (
    <span
      className={`inline-block border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${estilo[estado]}`}
    >
      {estado}
    </span>
  );
}
