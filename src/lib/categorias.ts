/**
 * Categorías del catálogo.
 *
 * Fuente única para el formulario de productos del panel y para la barra de
 * categorías de la tienda. Los valores tienen que coincidir exactamente con lo
 * que se guarda en `productos.categoria`, porque el filtro compara por
 * igualdad: si aquí dijera "POLOS" y en la base pusiera "Poleras", el enlace
 * llevaría a una página vacía.
 */
export const CATEGORIAS = [
  "Tablas",
  "Ruedas",
  "Trucks",
  "Rodamientos",
  "Zapatillas",
  "Poleras",
  "Polos",
  "Pantalones",
  "Gorros",
  "Accesorios",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Slug de URL para una categoría: "Zapatillas" -> "zapatillas".
 *
 * Se separa del valor guardado en la base para que las URLs sean minúsculas,
 * que es la convención y lo que la gente teclea. Si el slug fuera el valor
 * crudo, `/productos/categoria/zapatillas` no encontraría nada mientras que
 * `/productos/categoria/Zapatillas` sí, que es justo el tipo de diferencia
 * invisible que rompe enlaces compartidos.
 *
 * `normalize("NFD")` + quitar diacríticos deja preparado el caso de una
 * categoría futura con tilde ("Protección" -> "proteccion").
 */
export function slugDeCategoria(categoria: string): string {
  return categoria
    .normalize("NFD")
    // Rango U+0300–U+036F: las marcas diacríticas que `normalize("NFD")` acaba
    // de separar de su letra base. Verificado: "Protección" -> "proteccion".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Devuelve la categoría real a partir de su slug, o `null` si no existe. */
export function categoriaDesdeSlug(slug: string): Categoria | null {
  return (
    CATEGORIAS.find((categoria) => slugDeCategoria(categoria) === slug) ?? null
  );
}

/** Ruta pública del listado de una categoría. */
export function rutaDeCategoria(categoria: string): string {
  return `/productos/categoria/${slugDeCategoria(categoria)}`;
}
