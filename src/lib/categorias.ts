/**
 * Categorías del catálogo.
 *
 * Fuente única para el formulario de productos del panel y para la barra de
 * categorías de la tienda. Los valores tienen que coincidir exactamente con lo
 * que se guarda en `productos.categoria`, porque el filtro del catálogo compara
 * por igualdad: si aquí dijera "POLOS" y en la base pusiera "Poleras", el
 * enlace llevaría a una página vacía.
 */
export const CATEGORIAS = [
  "Tablas",
  "Ruedas",
  "Trucks",
  "Rodamientos",
  "Zapatillas",
  "Poleras",
  "Polerones",
  "Gorros",
  "Accesorios",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export function esCategoriaValida(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor);
}
