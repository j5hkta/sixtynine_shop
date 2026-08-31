import { CATEGORIAS, rutaDeCategoria } from "./categorias";

/**
 * Destino de un banner.
 *
 * `banners.categoria` guarda o bien el nombre exacto de una categoría del
 * catálogo ("Tablas"), o bien este valor especial para el catálogo completo.
 * Se usa un centinela en vez de `null` porque la columna es `not null` y
 * porque "Todo" es una opción real del desplegable, no la ausencia de dato.
 */
export const DESTINO_TODO = "Todo";

/** Opciones del desplegable del panel, con el catálogo entero primero. */
export const DESTINOS_BANNER: { valor: string; etiqueta: string }[] = [
  { valor: DESTINO_TODO, etiqueta: "Todo el catálogo" },
  ...CATEGORIAS.map((categoria) => ({ valor: categoria, etiqueta: categoria })),
];

export function esDestinoValido(valor: string): boolean {
  return (
    valor === DESTINO_TODO ||
    (CATEGORIAS as readonly string[]).includes(valor)
  );
}

/**
 * Ruta pública a la que lleva un banner.
 *
 * `rutaDeCategoria` ya se encarga del slug en minúsculas, así que "Tablas"
 * produce `/productos/categoria/tablas`.
 *
 * Una categoría que no esté en `CATEGORIAS` cae en `/productos` en lugar de
 * generar un enlace roto: las rutas de categoría se prerenderizan con
 * `dynamicParams = false`, así que un slug desconocido daría un 404. Puede
 * pasar si alguien edita la fila a mano o si se retira una categoría del
 * catálogo teniendo banners que apuntaban a ella.
 */
export function rutaDeBanner(categoria: string): string {
  if (categoria === DESTINO_TODO || !esDestinoValido(categoria)) {
    return "/productos";
  }

  return rutaDeCategoria(categoria);
}
