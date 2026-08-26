"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";

/**
 * `useFormStatus` lee el estado del `<form>` padre, así que el formulario puede
 * seguir siendo un Server Component: sólo este botón se hidrata en el cliente.
 * Deshabilitarlo mientras envía evita el doble alta por doble clic.
 */
export default function BotonGuardar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 bg-neon px-6 py-3.5 text-xs font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Guardando...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" aria-hidden />
          {children}
        </>
      )}
    </button>
  );
}
