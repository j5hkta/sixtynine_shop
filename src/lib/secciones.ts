import { rutaDeCategoria } from "./categorias";

/**
 * Franjas de la portada.
 *
 * Fuente única para el desplegable del panel y para el orden en que la portada
 * las pinta. Los valores tienen que coincidir con la restricción
 * `productos_seccion_portada_valida` de `supabase/secciones_portada.sql`.
 */
export const SECCIONES_PORTADA = [
  "tablas",
  "completos",
  "ropa",
  "proteccion",
  "ninguna",
] as const;

export type SeccionPortada = (typeof SECCIONES_PORTADA)[number];

/** La que se muestra en la portada, en el orden en que aparecen. */
export const SECCIONES_VISIBLES = [
  "tablas",
  "completos",
  "ropa",
  "proteccion",
] as const satisfies readonly SeccionPortada[];

export function esSeccionValida(valor: string): valor is SeccionPortada {
  return (SECCIONES_PORTADA as readonly string[]).includes(valor);
}

type DatosSeccion = {
  /** Etiqueta del desplegable del panel. */
  etiqueta: string;
  /** Encabezado de la franja en la portada. */
  titulo: string;
  /**
   * Destino del enlace «Ver todo». La sección de ropa no lo usa: allí depende
   * de la pestaña activa, y eso sólo lo sabe el componente en el cliente.
   */
  verTodo: string | null;
};

export const DATOS_SECCION: Record<SeccionPortada, DatosSeccion> = {
  tablas: {
    etiqueta: "Tablas",
    titulo: "Tablas",
    verTodo: rutaDeCategoria("Tablas"),
  },
  completos: {
    etiqueta: "Completos",
    titulo: "Completos",
    verTodo: rutaDeCategoria("Completos"),
  },
  ropa: {
    etiqueta: "Ropa y Accesorios",
    titulo: "Ropa y Accesorios",
    verTodo: null,
  },
  proteccion: {
    etiqueta: "Cascos y Protecciones",
    titulo: "Cascos y Protecciones",
    verTodo: rutaDeCategoria("Cascos y Protecciones"),
  },
  ninguna: {
    etiqueta: "Ninguna — no aparece en la portada",
    titulo: "",
    verTodo: null,
  },
};

/**
 * Pestañas de la franja de ropa, en orden.
 *
 * Son categorías reales del catálogo: el filtro compara contra
 * `producto.categoria`, así que cualquier cambio aquí tiene que existir en
 * `CATEGORIAS`.
 */
export const PESTANAS_ROPA = [
  "Polos",
  "Poleras",
  "Pantalones",
  "Gorros",
] as const;
