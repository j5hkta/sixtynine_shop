import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

let cliente: SupabaseClient<Database> | undefined;

/**
 * Cliente anónimo para las páginas públicas de la tienda.
 *
 * A diferencia de `createClient()` de `./server`, este NO lee cookies. Eso es
 * justo lo que permite el renderizado estático: en cuanto un Server Component
 * llama a `cookies()`, Next marca la ruta como dinámica y deja de cachearla,
 * así que toda la tienda se re-renderizaba en cada visita.
 *
 * Sin sesión, las consultas se ejecutan como `anon` y quedan sujetas a la
 * política RLS "Productos visibles para todos" — exactamente el mismo acceso
 * que ya tenía la tienda antes, porque el visitante nunca estaba autenticado.
 *
 * Se cachea en el módulo: al no haber estado por petición, una sola instancia
 * sirve a todas. `persistSession` y `autoRefreshToken` van en `false` porque
 * en el servidor no hay dónde persistir ni sesión que refrescar.
 */
export function createAnonClient(): SupabaseClient<Database> {
  if (!cliente) {
    const { url, anonKey } = getSupabaseEnv();

    cliente = createSupabaseClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cliente;
}
