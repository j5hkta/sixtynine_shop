/**
 * Lectura y validación de las credenciales públicas de Supabase.
 *
 * Next.js sólo sustituye `process.env.NEXT_PUBLIC_*` en el bundle cuando se
 * accede de forma estática, por eso no se desestructura `process.env`.
 *
 * Se valida dentro de una función (y no en el ámbito del módulo) para que el
 * error se lance al usar el cliente y no durante el `next build`.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Define NEXT_PUBLIC_SUPABASE_URL y " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y reinicia el servidor de desarrollo.",
    );
  }

  return { url, anonKey };
}
