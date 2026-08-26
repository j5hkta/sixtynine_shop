import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * Cliente de Supabase para el navegador (Client Components).
 *
 * `createBrowserClient` guarda la sesión en cookies (no en localStorage), que
 * es lo que permite a `src/proxy.ts` y a los Server Components leer al usuario.
 *
 * Devuelve un singleton internamente, así que se puede llamar libremente.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
