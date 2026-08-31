"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

import { alternarEstadoAnuncio, eliminarAnuncio } from "@/actions/anuncios";

/**
 * Ocultar y borrar un anuncio, en un solo componente.
 *
 * Van juntos —y no en dos archivos como en los banners— porque comparten el
 * mismo `useTransition` y el mismo hueco de error: con dos componentes
 * separados, un fallo al ocultar pintaba su mensaje debajo del otro botón y
 * descuadraba la fila.
 */
export default function AccionesAnuncio({
  id,
  activo,
  texto,
}: {
  id: string;
  activo: boolean;
  texto: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Recortado: el mensaje de confirmación con un anuncio de 120 caracteres
  // sería ilegible.
  const resumen = texto.length > 40 ? `${texto.slice(0, 40)}…` : texto;

  function alternar() {
    setError(null);
    startTransition(async () => {
      const resultado = await alternarEstadoAnuncio(id, activo);
      if (!resultado.exito) setError(resultado.error);
    });
  }

  function borrar() {
    const confirmado = window.confirm(
      `¿Eliminar el anuncio "${resumen}"?\n\nEsta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    setError(null);
    startTransition(async () => {
      const resultado = await eliminarAnuncio(id);
      if (!resultado.exito) setError(resultado.error);
    });
  }

  const etiqueta = activo ? "Ocultar" : "Mostrar";
  const IconoEstado = activo ? EyeOff : Eye;

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <span role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={alternar}
          disabled={pending}
          aria-label={`${etiqueta} el anuncio "${resumen}"`}
          title={`${etiqueta} el anuncio`}
          className={
            activo
              ? "flex items-center gap-2 border border-ink-line px-3 py-2 text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              : "flex items-center gap-2 bg-neon px-3 py-2 text-[10px] font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <IconoEstado className="h-3.5 w-3.5" aria-hidden />
          )}
          {etiqueta}
        </button>

        <button
          type="button"
          onClick={borrar}
          disabled={pending}
          aria-label={`Eliminar el anuncio "${resumen}"`}
          title="Eliminar el anuncio"
          className="border border-ink-line p-2 text-neutral-500 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
