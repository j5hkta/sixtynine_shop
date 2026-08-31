"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { alternarEstadoBanner } from "@/actions/banners";

/**
 * Publica u oculta un banner.
 *
 * Ocultar es reversible y no destruye nada, así que no pide confirmación —a
 * diferencia del borrado—. El error se muestra junto al botón en vez de
 * lanzarse: un `throw` desde una Server Action llega al navegador como el
 * error genérico #441 de React, sin mensaje.
 */
export default function BotonEstadoBanner({
  id,
  activo,
  destino,
}: {
  id: string;
  activo: boolean;
  destino: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await alternarEstadoBanner(id, activo);
      if (!resultado.exito) setError(resultado.error);
    });
  }

  const etiqueta = activo ? "Ocultar" : "Mostrar";
  const Icono = activo ? EyeOff : Eye;

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={`${etiqueta} el banner de ${destino}`}
        title={`${etiqueta} el banner de ${destino}`}
        className={
          // Oculto -> acción primaria: recuperar el banner es lo que se quiere
          // hacer con una fila apagada. Activo -> secundaria, para que ocultar
          // no compita visualmente con el resto de la lista.
          activo
            ? "flex items-center gap-2 border border-ink-line px-3 py-2 text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            : "flex items-center gap-2 bg-neon px-3 py-2 text-[10px] font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Icono className="h-3.5 w-3.5" aria-hidden />
        )}
        {etiqueta}
      </button>
    </div>
  );
}
