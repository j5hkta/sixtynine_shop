"use client";

import { useActionState } from "react";
import { AlertTriangle, Loader2, Lock, LogIn, Mail } from "lucide-react";

import { iniciarSesion } from "@/actions/auth";

/**
 * Formulario de acceso al panel.
 *
 * Envía a una Server Action en lugar de llamar a `signInWithPassword()` desde
 * el navegador. El motivo es el contador de intentos por IP: hecho en el
 * cliente, cada intento va directo a Supabase y no hay dónde ponerlo.
 *
 * Como es un `<form action={...}>` de verdad, funciona incluso antes de que
 * hidrate el JavaScript.
 *
 * `redirectTo` llega ya saneado desde `src/app/acceso-x69-privado/page.tsx`, y
 * la acción lo vuelve a validar porque el campo oculto es reescribible.
 */
export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [estado, enviar, pendiente] = useActionState(iniciarSesion, undefined);

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {estado?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {estado.error}
        </p>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
        >
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600"
            aria-hidden
          />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={160}
            placeholder="admin@sixtynine.pe"
            className="w-full border border-ink-line bg-ink-soft py-3 pr-4 pl-10 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
        >
          Contraseña
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600"
            aria-hidden
          />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            maxLength={200}
            placeholder="••••••••"
            className="w-full border border-ink-line bg-ink-soft py-3 pr-4 pl-10 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pendiente}
        className="flex w-full items-center justify-center gap-2 bg-neon py-3.5 text-sm font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendiente ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Verificando...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden />
            Ingresar al Panel
          </>
        )}
      </button>
    </form>
  );
}
