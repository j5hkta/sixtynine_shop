"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { eliminarBanner } from "@/actions/banners";

export default function BotonEliminarBanner({
  id,
  destino,
}: {
  id: string;
  destino: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmado = window.confirm(
      `¿Eliminar el banner de "${destino}"?\n\nEsta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    setError(null);
    startTransition(async () => {
      // El fallo llega como dato: un `throw` se vería como el error #441.
      const resultado = await eliminarBanner(id);
      if (!resultado.ok) setError(resultado.error);
    });
  }

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
        aria-label={`Eliminar el banner de ${destino}`}
        title={`Eliminar el banner de ${destino}`}
        className="border border-ink-line p-2 text-neutral-500 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
