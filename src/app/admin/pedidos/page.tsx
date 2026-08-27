import { AlertTriangle, Inbox } from "lucide-react";

import SelectorEstadoPedido from "@/components/admin/SelectorEstadoPedido";
import { fecha, moneda } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/lib/supabase/types";

export const metadata = {
  title: "Pedidos",
};

const estiloEstado: Record<EstadoPedido, string> = {
  pendiente: "border-neon bg-neon text-ink",
  confirmado: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  enviado: "border-blue-400/40 bg-blue-400/10 text-blue-300",
  entregado: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  cancelado: "border-ink-line bg-white/5 text-neutral-500",
};

const COLUMNAS = ["ID", "Cliente", "Fecha", "Total", "Estado"];

export default async function PedidosPage() {
  const supabase = await createClient();
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(
      "id, creado_en, cliente_nombre, cliente_telefono, cliente_dni, direccion_envio, total, estado",
    )
    .order("creado_en", { ascending: false });

  const ingresos = (pedidos ?? [])
    .filter((p) => p.estado !== "cancelado")
    .reduce((suma, p) => suma + p.total, 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Ventas
        </p>
        <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
          Pedidos
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />

        {pedidos && pedidos.length > 0 && (
          <p className="mt-4 text-sm text-neutral-500">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} ·{" "}
            <span className="font-mono text-neutral-300">
              {moneda.format(ingresos)}
            </span>{" "}
            sin contar cancelados.
          </p>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudieron cargar los pedidos: {error.message}
        </p>
      )}

      {!error && pedidos && pedidos.length === 0 && (
        <div className="flex flex-col items-center border border-dashed border-ink-line bg-ink-soft px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-4 text-sm font-bold tracking-wide text-white uppercase">
            Todavía no hay pedidos
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Aparecerán aquí en cuanto alguien complete el checkout.
          </p>
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <div className="overflow-x-auto border border-ink-line bg-ink-soft">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left">
                {COLUMNAS.map((columna) => (
                  <th
                    key={columna}
                    scope="col"
                    className="px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
                  >
                    {columna}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Cambiar estado</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="border-b border-ink-line/60 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-4 font-mono text-xs font-bold whitespace-nowrap text-neon">
                    #{pedido.id.slice(0, 8).toUpperCase()}
                  </td>

                  <td className="max-w-xs px-4 py-4">
                    <p className="truncate font-bold text-white">
                      {pedido.cliente_nombre}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">
                      {pedido.cliente_telefono} · DNI {pedido.cliente_dni}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-600">
                      {pedido.direccion_envio}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-xs whitespace-nowrap text-neutral-400">
                    {fecha.format(new Date(pedido.creado_en))}
                  </td>

                  <td className="px-4 py-4 font-mono font-bold whitespace-nowrap text-white">
                    {moneda.format(pedido.total)}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-block border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${estiloEstado[pedido.estado]}`}
                    >
                      {pedido.estado}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <SelectorEstadoPedido
                      id={pedido.id}
                      estado={pedido.estado}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
