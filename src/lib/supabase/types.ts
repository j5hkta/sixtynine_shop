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
/** Valor JSON arbitrario, para las columnas y parámetros `jsonb`. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

import type { SeccionPortada } from "@/lib/secciones";

/**
 * Estado del producto. GENERADO por la base a partir del inventario
 * (ver `supabase/estado_automatico.sql`): nunca se escribe desde la app.
 */
export type EstadoProducto = "activo" | "agotado";

/** Roles de `public.perfiles` (ver `supabase/roles_schema.sql`). */
export type RolUsuario = "cliente" | "admin";

/** Estados de `public.pedidos` (ver `supabase/pedidos_schema.sql`). */
export type EstadoPedido =
  "pendiente" | "confirmado" | "enviado" | "entregado" | "cancelado";

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
          /** Precio tachado. Null = sin descuento. Ver `marketing_descuentos.sql`. */
          precio_original: number | null;
          /** Unidades por talla. Ver `supabase/inventario_variantes.sql`. */
          inventario_tallas: Record<string, number>;
          /** Columna GENERADA: suma de `inventario_tallas`. Nunca se escribe. */
          stock_total: number;
          categoria: string | null;
          imagenes: string[] | null;
          /** Columna GENERADA a partir de `inventario_tallas`. Solo lectura. */
          estado: EstadoProducto;
          /** Ver `supabase/secciones_portada.sql`. */
          seccion_portada: SeccionPortada;
        };
        Insert: {
          id?: string;
          creado_en?: string;
          titulo: string;
          descripcion?: string | null;
          precio: number;
          precio_original?: number | null;
          inventario_tallas?: Record<string, number>;
          categoria?: string | null;
          imagenes?: string[] | null;
          seccion_portada?: SeccionPortada;
        };
        Update: {
          id?: string;
          creado_en?: string;
          titulo?: string;
          descripcion?: string | null;
          precio?: number;
          precio_original?: number | null;
          inventario_tallas?: Record<string, number>;
          categoria?: string | null;
          imagenes?: string[] | null;
          seccion_portada?: SeccionPortada;
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
      pedidos: {
        Row: {
          id: string;
          creado_en: string;
          cliente_nombre: string;
          cliente_telefono: string;
          cliente_dni: string;
          direccion_envio: string;
          total: number;
          costo_envio: number;
          zona_envio: string | null;
          agencia: string | null;
          sede_agencia: string | null;
          tracking_numero: string | null;
          tracking_clave: string | null;
          estado: EstadoPedido;
        };
        Insert: {
          id?: string;
          creado_en?: string;
          cliente_nombre: string;
          cliente_telefono: string;
          cliente_dni: string;
          direccion_envio: string;
          total: number;
          costo_envio?: number;
          zona_envio?: string | null;
          agencia?: string | null;
          sede_agencia?: string | null;
          tracking_numero?: string | null;
          tracking_clave?: string | null;
          estado?: EstadoPedido;
        };
        Update: {
          id?: string;
          creado_en?: string;
          cliente_nombre?: string;
          cliente_telefono?: string;
          cliente_dni?: string;
          direccion_envio?: string;
          total?: number;
          costo_envio?: number;
          zona_envio?: string | null;
          agencia?: string | null;
          sede_agencia?: string | null;
          tracking_numero?: string | null;
          tracking_clave?: string | null;
          estado?: EstadoPedido;
        };
        Relationships: [];
      };
      pedidos_items: {
        Row: {
          id: string;
          pedido_id: string;
          producto_id: string;
          cantidad: number;
          precio_unitario: number;
          talla_seleccionada: string | null;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          producto_id: string;
          cantidad: number;
          precio_unitario: number;
          talla_seleccionada?: string | null;
        };
        Update: {
          id?: string;
          pedido_id?: string;
          producto_id?: string;
          cantidad?: number;
          precio_unitario?: number;
          talla_seleccionada?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_items_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_items_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Ver `supabase/marketing_descuentos.sql`. Barra superior de la tienda. */
      anuncios: {
        Row: {
          id: string;
          texto: string;
          url_destino: string | null;
          orden: number;
          activo: boolean;
          creado_en: string;
        };
        Insert: {
          id?: string;
          texto: string;
          url_destino?: string | null;
          orden?: number;
          activo?: boolean;
          creado_en?: string;
        };
        Update: {
          id?: string;
          texto?: string;
          url_destino?: string | null;
          orden?: number;
          activo?: boolean;
          creado_en?: string;
        };
        Relationships: [];
      };
      /** Ver `supabase/banners.sql`. Carrusel de la portada. */
      banners: {
        Row: {
          id: string;
          imagen_url: string;
          categoria: string;
          orden: number;
          activo: boolean;
          creado_en: string;
        };
        Insert: {
          id?: string;
          imagen_url: string;
          categoria?: string;
          orden?: number;
          activo?: boolean;
          creado_en?: string;
        };
        Update: {
          id?: string;
          imagen_url?: string;
          categoria?: string;
          orden?: number;
          activo?: boolean;
          creado_en?: string;
        };
        Relationships: [];
      };
      /**
       * Modelo antiguo de banner único, sustituido por `banners`. La tabla
       * sigue existiendo con los datos que ya tenía; `supabase/banners.sql`
       * copió su imagen a la nueva. Ya no se lee desde la aplicación.
       */
      configuracion_tienda: {
        Row: {
          id: number;
          banner_imagen: string | null;
          banner_link: string | null;
        };
        Insert: {
          id: number;
          banner_imagen?: string | null;
          banner_link?: string | null;
        };
        Update: {
          id?: number;
          banner_imagen?: string | null;
          banner_link?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      /**
       * Ver `supabase/envios_agencia.sql`. Devuelve el id del pedido.
       * `p_agencia` es 'shalom' u 'olva'; el flete no se cobra en la web, así
       * que la función siempre guarda `costo_envio = 0`.
       */
      procesar_checkout: {
        Args: {
          p_cliente_nombre: string;
          p_cliente_telefono: string;
          p_cliente_dni: string;
          p_direccion_envio: string;
          p_items: Json;
          p_agencia: string;
          p_sede_agencia: string;
        };
        Returns: string;
      };
      /**
       * Definida en `supabase/consulta_pedido_publico.sql` y redefinida por
       * `supabase/envios_agencia.sql`, que es la versión vigente. Devuelve una
       * fila (o ninguna). Nada del cliente: ni nombre, ni DNI, ni teléfono.
       */
      obtener_resumen_pedido: {
        Args: { p_id: string };
        Returns: {
          total: number;
          costo_envio: number;
          estado: string;
          creado_en: string;
          agencia: string | null;
          sede_agencia: string | null;
          tracking_numero: string | null;
          tracking_clave: string | null;
        }[];
      };
      /**
       * Ver `supabase/seguimiento_flexible.sql`. Igual que
       * `obtener_resumen_pedido` pero aceptando el código corto que ve el
       * comprador, no sólo el UUID entero. Devuelve el `id` completo para que
       * la página no tenga que confiar en lo que se tecleó en el buscador.
       */
      buscar_pedido_publico: {
        Args: { p_termino: string };
        Returns: {
          id: string;
          total: number;
          costo_envio: number;
          estado: string;
          creado_en: string;
          agencia: string | null;
          sede_agencia: string | null;
          tracking_numero: string | null;
          tracking_clave: string | null;
        }[];
      };
      /** Líneas del pedido, para repartir el cobro entre los dos vendedores. */
      obtener_items_pedido: {
        Args: { p_id: string };
        Returns: {
          titulo: string;
          categoria: string | null;
          cantidad: number;
          precio_unitario: number;
        }[];
      };
      /**
       * Ver `supabase/rate_limit.sql`. `true` si la petición se permite.
       * Sólo ejecutable con la `service_role` key.
       */
      verificar_rate_limit: {
        Args: {
          p_ip: string;
          p_max: number;
          p_ventana_segundos: number;
        };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/**
 * Atajos de tipo para usar en componentes y en el panel administrativo.
 *
 * Sólo los que alguien usa: un atajo sin consumidores es una definición que
 * nadie revisa cuando cambia el esquema. Añadir los que falten es una línea.
 */
export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type ProductoInsert =
  Database["public"]["Tables"]["productos"]["Insert"];
export type ProductoUpdate =
  Database["public"]["Tables"]["productos"]["Update"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
