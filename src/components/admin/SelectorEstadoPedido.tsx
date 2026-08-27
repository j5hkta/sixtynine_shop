"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { actualizarEstadoPedido } from "@/actions/pedidos";
import { ESTADOS_PEDIDO } from "@/lib/pedidos";
import type { EstadoPedido } from "@/lib/supabase/types";

export default function SelectorEstadoPedido({
  id,
  estado,
}: {
  id: string;
  estado: EstadoPedido;
}) {
  const [pendiente, iniciarCambio] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado optimista: el `<select>` refleja la elección al instante y no
  // espera al servidor. Si la acción falla, vuelve al valor anterior.
  const [valor, setValor] = useState<EstadoPedido>(estado);

  function handleChange(evento: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = evento.target.value as EstadoPedido;
    const anterior = valor;

    setValor(nuevo);
    setError(null);

    iniciarCambio(async () => {
      try {
        await actualizarEstadoPedido(id, nuevo);
      } catch (e) {
        setValor(anterior);
        setError(e instanceof Error ? e.message : "No se pudo actualizar.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={valor}
        onChange={handleChange}
        disabled={pendiente}
        aria-label={`Cambiar estado del pedido ${id.slice(0, 8).toUpperCase()}`}
        className="border border-ink-line bg-ink px-2 py-1.5 text-xs text-neutral-300 capitalize transition-colors focus:border-neon focus:outline-none disabled:opacity-50"
      >
        {ESTADOS_PEDIDO.map((opcion) => (
          <option key={opcion} value={opcion} className="capitalize">
            {opcion}
          </option>
        ))}
      </select>

      {pendiente && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-neon" aria-hidden />
      )}

      {error && (
        <span role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
