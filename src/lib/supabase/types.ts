/**
 * Tipado de la base de datos de "Sixty Nine Skate & Apparel Store".
 * Debe mantenerse en sincronía con `supabase/schema.sql` y
 * `supabase/roles_schema.sql`.
 *
 * La forma de este tipo la impone `GenericSchema` de postgrest-js: cada tabla
 * necesita `Row`, `Insert`, `Update` y `Relationships` (en plural; con
 * cualquier otro nombre la tabla deja de satisfacer la restricción y las
 * consultas resuelven a `never`).
 *
 * Cuando el proyecto crezca puedes regenerar este tipo con:
 *   npx supabase gen types typescript --project-id <TU_PROJECT_ID> > src/lib/supabase/types.ts
 */
export type EstadoProducto = "activo" | "borrador" | "agotado";

/** Roles de `public.perfiles` (ver `supabase/roles_schema.sql`). */
export type RolUsuario = "cliente" | "admin";

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
        Relationships: [];
      };
      perfiles: {
        Row: {
          id: string;
          rol: RolUsuario;
          creado_en: string;
        };
        Insert: {
          id: string;
          rol?: RolUsuario;
          creado_en?: string;
        };
        Update: {
          id?: string;
          rol?: RolUsuario;
          creado_en?: string;
        };
        // `auth.users` vive fuera del esquema `public`, así que no se puede
        // hacer join con PostgREST desde aquí; la FK se documenta sin más.
        Relationships: [
          {
            foreignKeyName: "perfiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Atajos de tipo para usar en componentes y en el panel administrativo. */
export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type ProductoInsert =
  Database["public"]["Tables"]["productos"]["Insert"];
export type ProductoUpdate =
  Database["public"]["Tables"]["productos"]["Update"];
export type Perfil = Database["public"]["Tables"]["perfiles"]["Row"];
