import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Es `async` porque en el App Router `cookies()` devuelve una promesa. Hay que
 * crear un cliente nuevo en cada request: nunca compartir la instancia entre
 * peticiones, porque las cookies (y por tanto la sesión) son distintas.
 *
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. Se ignora sin
          // riesgo porque `src/proxy.ts` refresca la sesión en cada request a
          // una ruta protegida y sí escribe las cookies en la respuesta.
        }
      },
    },
  });
}
