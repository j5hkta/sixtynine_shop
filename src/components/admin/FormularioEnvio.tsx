"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Truck } from "lucide-react";

import { guardarEnvio } from "@/actions/pedidos";

const inputClase =
  "w-full border border-ink-line bg-ink px-4 py-3 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none";

const labelClase =
  "block text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase";

/**
 * Marca el pedido como enviado y guarda los códigos de recojo en un solo paso.
 *
 * Están juntos porque son la misma acción del mundo real: llevas el paquete a
 * la agencia y te dan el número y la clave. Separarlo dejaría pedidos en
 * "enviado" sin datos, y el comprador vería una pantalla de seguimiento vacía.
 */
export default function FormularioEnvio({
  pedidoId,
  trackingNumero,
  trackingClave,
  yaEnviado,
}: {
  pedidoId: string;
  trackingNumero: string | null;
  trackingClave: string | null;
  yaEnviado: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function handleSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const formData = new FormData(evento.currentTarget);
    setError(null);
    setGuardado(false);

    iniciar(async () => {
      const resultado = await guardarEnvio(formData);
      if (resultado.ok) {
        setGuardado(true);
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 border-t border-ink-line pt-6"
    >
      <input type="hidden" name="id" value={pedidoId} />

      <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
        <Truck className="h-4 w-4" aria-hidden />
        {yaEnviado ? "Datos de envío" : "Marcar como enviado"}
      </h3>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {guardado && !error && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 border border-neon/40 bg-neon/10 px-3 py-2 text-xs text-neon"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Guardado. El cliente ya lo ve en /seguimiento.
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <label htmlFor="tracking_numero" className={labelClase}>
            Número de seguimiento
          </label>
          <input
            id="tracking_numero"
            name="tracking_numero"
            type="text"
            maxLength={80}
            defaultValue={trackingNumero ?? ""}
            placeholder="Ej: SH-4821093"
            className={`${inputClase} font-mono`}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="tracking_clave" className={labelClase}>
            Clave de recojo
          </label>
          <input
            id="tracking_clave"
            name="tracking_clave"
            type="text"
            maxLength={80}
            defaultValue={trackingClave ?? ""}
            placeholder="Ej: 4417"
            className={`${inputClase} font-mono`}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-600">
        Con al menos uno de los dos basta. Al guardar, el pedido pasa a{" "}
        <span className="text-neutral-400">enviado</span>.
      </p>

      <button
        type="submit"
        disabled={pendiente}
        className="mt-4 flex w-full items-center justify-center gap-2 bg-neon py-3 text-xs font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendiente ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Guardando...
          </>
        ) : yaEnviado ? (
          "Actualizar datos de envío"
        ) : (
          "Guardar y marcar como enviado"
        )}
      </button>
    </form>
  );
}
