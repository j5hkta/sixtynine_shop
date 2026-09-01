"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, LogIn, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

function mensajeDeError(mensaje: string): string {
  if (mensaje === "Invalid login credentials") {
    return "Email o contraseña incorrectos.";
  }
  if (mensaje === "Email not confirmed") {
    return "Debes confirmar tu email antes de ingresar.";
  }
  return mensaje;
}

/** `redirectTo` llega ya saneado desde `src/app/acceso-x69-privado/page.tsx`. */
export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(mensajeDeError(signInError.message));
        setLoading(false);
        return;
      }

      // `refresh()` obliga a los Server Components a releer la cookie de sesión
      // recién escrita; sin esto el panel podría renderizarse aún sin usuario.
      router.replace(redirectTo);
      router.refresh();
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "No se pudo conectar con Supabase.",
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-ink-line bg-ink-soft py-3 pr-4 pl-10 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 bg-neon py-3.5 text-sm font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
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
