import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "./types";

let cliente: SupabaseClient<Database> | undefined;

/**
 * Cliente con la `service_role` key: omite RLS por completo.
 *
 * Sólo para procesos sin sesión de usuario. Hoy lo usa `/api/reniec`, que
 * atiende a visitantes anónimos y necesita escribir en `rate_limits`, una
 * tabla que ningún cliente puede tocar.
 *
 * PELIGRO: esta clave da acceso total de lectura y escritura a toda la base de
 * datos. Nunca la pongas en una variable `NEXT_PUBLIC_*` ni importes este
 * módulo desde un Client Component — el `import "server-only"` rompe el build
 * si se intenta.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local. " +
          "La service_role key está en Supabase Dashboard > Project Settings > API.",
      );
    }

    cliente = createSupabaseClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cliente;
}
