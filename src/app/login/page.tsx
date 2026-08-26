import type { Metadata } from "next";

import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar | Sixty Nine Skate & Apparel",
  description: "Acceso al panel administrativo de Sixty Nine Skate & Apparel.",
  robots: { index: false, follow: false },
};

/**
 * Sólo se aceptan rutas internas para evitar un open redirect: un `redirectTo`
 * como `//evil.com` o `https://evil.com` mandaría al usuario fuera del sitio.
 */
function safeRedirect(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const redirectTo = safeRedirect((await searchParams).redirectTo);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-12">
      {/* Textura de fondo: rejilla tenue + halo neón */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-neon/10 blur-[100px]"
      />

      <div className="relative w-full max-w-sm">
        {/* Marca */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center bg-neon font-mono text-4xl font-black text-ink">
            69
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-white uppercase">
            Sixty Nine
          </h1>
          <p className="mt-1 text-[11px] font-medium tracking-[0.3em] text-neutral-500 uppercase">
            Skate &amp; Apparel
          </p>
          <span className="mt-5 h-1 w-16 bg-neon" aria-hidden />
        </div>

        {/* Formulario */}
        <div className="border border-ink-line bg-ink-soft p-6 sm:p-8">
          <h2 className="mb-6 text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Acceso al panel
          </h2>

          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Área restringida. Sólo personal autorizado.
        </p>
      </div>
    </div>
  );
}
