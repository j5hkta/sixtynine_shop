import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Tipado de la base de datos de "Sixty Nine Skate & Apparel Store".
 * Debe mantenerse en sincronía con `supabase/schema.sql`.
 *
 * Cuando el proyecto crezca puedes regenerar este tipo con:
 *   npx supabase gen types typescript --project-id <TU_PROJECT_ID> > src/lib/database.types.ts
 */
export type EstadoProducto = 'activo' | 'borrador' | 'agotado'

export type Database = {
  public: {
    Tables: {
      productos: {
        Row: {
          id: string
          creado_en: string
          titulo: string
          descripcion: string | null
          precio: number
          stock: number
          categoria: string | null
          tallas: string[] | null
          imagenes: string[] | null
          estado: EstadoProducto
        }
        Insert: {
          id?: string
          creado_en?: string
          titulo: string
          descripcion?: string | null
          precio: number
          stock?: number
          categoria?: string | null
          tallas?: string[] | null
          imagenes?: string[] | null
          estado?: EstadoProducto
        }
        Update: {
          id?: string
          creado_en?: string
          titulo?: string
          descripcion?: string | null
          precio?: number
          stock?: number
          categoria?: string | null
          tallas?: string[] | null
          imagenes?: string[] | null
          estado?: EstadoProducto
        }
        Relations: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

/** Atajos de tipo para usar en componentes y en el panel administrativo. */
export type Producto = Database['public']['Tables']['productos']['Row']
export type ProductoInsert = Database['public']['Tables']['productos']['Insert']
export type ProductoUpdate = Database['public']['Tables']['productos']['Update']

// Next.js sólo reemplaza `process.env.NEXT_PUBLIC_*` cuando se accede de forma
// estática, por eso no se desestructura `process.env`.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Define NEXT_PUBLIC_SUPABASE_URL y ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y reinicia el servidor de desarrollo.'
  )
}

/**
 * Cliente de Supabase tipado y compartido (anon key: sólo lectura pública + RLS).
 * Se cachea en `globalThis` para no crear una instancia nueva en cada recarga
 * en caliente durante el desarrollo.
 */
const globalForSupabase = globalThis as unknown as {
  supabase?: SupabaseClient<Database>
}

export const supabase: SupabaseClient<Database> =
  globalForSupabase.supabase ?? createClient<Database>(supabaseUrl, supabaseAnonKey)

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase
}

export default supabase
