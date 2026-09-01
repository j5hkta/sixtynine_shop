import { headers } from "next/headers";
import Link from "next/link";
import { AlertTriangle, SearchX } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import { comprobarLimite, ipDeCabeceras } from "@/lib/rate-limit";
import { createAnonClient } from "@/lib/supabase/anon";

export const metadata = {
  title: "Buscar",
  robots: { index: false, follow: true },
};

const MIN_CARACTERES = 2;
const MAX_RESULTADOS = 60;

/**
 * Cupo de búsquedas por IP.
 *
 * Alto a propósito. Es el único punto de lectura pública sin caché —el resto
 * del catálogo se sirve con ISR y no toca Supabase en cada visita—, así que un
 * bucle aquí sí consume cuota de lectura. Treinta por minuto no las alcanza
 * nadie tecleando, y un raspador queda cortado en dos segundos.
 *
 * Ojo al coste: la comprobación es en sí misma una escritura en la base. Con
 * este umbral sólo se paga en búsquedas reales, que son pocas, y a cambio se
 * acota el peor caso, que era ilimitado.
 */
const MAX_BUSQUEDAS = 30;
const VENTANA_SEGUNDOS = 60;

/**
 * Prepara el término para `ilike`.
 *
 * `%` y `_` son comodines de LIKE en Postgres: sin quitarlos, buscar "%" o "_"
 * devolvería el catálogo entero. Se eliminan en vez de escaparlos porque
 * PostgREST no expone la cláusula ESCAPE, y nadie busca esos caracteres.
 */
function limpiarTermino(valor: string): string {
  return valor
    .replace(/[%_\\]/g, "")
    .trim()
    .slice(0, 80);
}

async function buscarProductos(termino: string) {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id, titulo, precio, precio_original, categoria, imagenes")
      .eq("estado", "activo")
      // Los agotados salen de los resultados solos, sin que nadie los toque.
      .gt("stock", 0)
      .ilike("titulo", `%${termino}%`)
      .order("creado_en", { ascending: false })
      .limit(MAX_RESULTADOS);

    if (error) throw error;

    return { productos: data ?? [], error: null as string | null };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido.";
    console.error("[tienda] Falló la búsqueda:", mensaje);
    return { productos: [], error: mensaje };
  }
}

export default async function BuscarPage({
  searchParams,
}: PageProps<"/buscar">) {
  // Leer `searchParams` hace esta ruta dinámica, y aquí es lo correcto: el
  // término es distinto en cada visita, no hay nada que prerenderizar.
  const params = await searchParams;
  const crudo = typeof params.q === "string" ? params.q : "";
  const termino = limpiarTermino(crudo);
  const consultaValida = termino.length >= MIN_CARACTERES;

  // Se comprueba sólo cuando la consulta iba a llegar a la base: escribir en
  // `rate_limits` por cada visita a /buscar sin término sería pagar el coste
  // sin evitar ninguna lectura.
  //
  // Falla ABIERTO: si el limitador no responde, se busca igual. Dejar el
  // buscador de la tienda inservible porque falta una variable de entorno es
  // peor que la lectura de más que se quería ahorrar.
  const limite = consultaValida
    ? await comprobarLimite(
        "buscar",
        ipDeCabeceras(await headers()),
        MAX_BUSQUEDAS,
        VENTANA_SEGUNDOS,
      )
    : "permitido";

  const excedido = limite === "excedido";

  const { productos, error } =
    consultaValida && !excedido
      ? await buscarProductos(termino)
      : { productos: [], error: null };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="border-b border-neutral-200 pb-6">
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Búsqueda
        </p>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-black uppercase sm:text-3xl">
          {crudo.trim() ? (
            <>
              Resultados para:{" "}
              <span className="font-normal normal-case">
                &laquo;{crudo.trim()}&raquo;
              </span>
            </>
          ) : (
            "¿Qué estás buscando?"
          )}
        </h1>

        {consultaValida && !error && !excedido && (
          <p className="mt-2 text-sm text-neutral-500">
            {productos.length}{" "}
            {productos.length === 1 ? "resultado" : "resultados"}
            {productos.length === MAX_RESULTADOS
              ? " (mostrando los primeros)"
              : ""}
            .
          </p>
        )}
      </header>

      {excedido && (
        <p
          role="alert"
          className="mt-10 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Has hecho muchas búsquedas seguidas. Espera un minuto e inténtalo de
          nuevo.
        </p>
      )}

      {!consultaValida && (
        <p className="mt-10 border border-dashed border-neutral-300 px-6 py-20 text-center text-sm text-neutral-500">
          Escribe al menos {MIN_CARACTERES} caracteres en el buscador de arriba.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-10 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo completar la búsqueda: {error}
        </p>
      )}

      {consultaValida && !error && !excedido && productos.length === 0 && (
        <div className="mt-10 flex flex-col items-center border border-dashed border-neutral-300 px-6 py-20 text-center">
          <SearchX className="h-8 w-8 text-neutral-300" aria-hidden />
          <p className="mt-4 text-sm font-bold tracking-wide text-black uppercase">
            Sin resultados
          </p>
          <p className="mt-2 max-w-sm text-sm text-neutral-500">
            No encontramos nada que coincida con &laquo;{termino}&raquo;. Prueba
            con otra palabra o mira el catálogo completo.
          </p>
          <Link
            href="/productos"
            className="mt-8 bg-black px-6 py-3 text-[11px] font-bold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-80"
          >
            Ver todo el catálogo
          </Link>
        </div>
      )}

      {productos.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
