"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { eliminarProducto } from "@/actions/productos";

export default function BotonEliminarProducto({
  id,
  titulo,
}: {
  id: string;
  titulo: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmado = window.confirm(
      `¿Eliminar "${titulo}"?\n\nEsta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarProducto(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
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
        aria-label={`Eliminar ${titulo}`}
        title={`Eliminar ${titulo}`}
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
