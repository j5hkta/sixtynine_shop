import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * A partir de Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts` y la
 * función exportada debe llamarse `proxy`. Corre en runtime `nodejs`.
 *
 * Responsabilidades:
 *  1. Refrescar el token de sesión de Supabase y escribirlo en la respuesta.
 *  2. Expulsar a `/login` a quien no tenga sesión al entrar a `/admin/*`.
 */
export async function proxy(request: NextRequest) {
  // Se reasigna dentro de `setAll` para arrastrar las cookies refrescadas.
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Cabeceras anti-caché que exige @supabase/ssr: una respuesta con
        // `Set-Cookie` de sesión jamás debe quedar cacheada en un CDN, o un
        // visitante podría recibir la sesión de otro.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // `getUser()` valida el token contra Supabase (a diferencia de `getSession()`,
  // que sólo lee la cookie). Debe llamarse antes de generar la respuesta para
  // que un refresco de token alcance a escribirse.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
