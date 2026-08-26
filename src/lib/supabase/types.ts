/**
 * Tipado de la base de datos de "Sixty Nine Skate & Apparel Store".
 * Debe mantenerse en sincronía con `supabase/schema.sql`.
 *
 * Cuando el proyecto crezca puedes regenerar este tipo con:
 *   npx supabase gen types typescript --project-id <TU_PROJECT_ID> > src/lib/supabase/types.ts
 */
export type EstadoProducto = "activo" | "borrador" | "agotado";

export type Database = {
  public: {
    Tables: {
      productos: {
        Row: {
          id: string;
          creado_en: string;
          titulo: string;
          descripcion: string | null;
          precio: number;
          stock: number;
          categoria: string | null;
          tallas: string[] | null;
          imagenes: string[] | null;
          estado: EstadoProducto;
        };
        Insert: {
          id?: string;
          creado_en?: string;
          titulo: string;
          descripcion?: string | null;
          precio: number;
          stock?: number;
          categoria?: string | null;
          tallas?: string[] | null;
          imagenes?: string[] | null;
          estado?: EstadoProducto;
        };
        Update: {
          id?: string;
          creado_en?: string;
          titulo?: string;
          descripcion?: string | null;
          precio?: number;
          stock?: number;
          categoria?: string | null;
          tallas?: string[] | null;
          imagenes?: string[] | null;
          estado?: EstadoProducto;
        };
        Relations: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Atajos de tipo para usar en componentes y en el panel administrativo. */
export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type ProductoInsert =
  Database["public"]["Tables"]["productos"]["Insert"];
export type ProductoUpdate =
  Database["public"]["Tables"]["productos"]["Update"];
