import Link from "next/link";
import { AlertTriangle, Search, Users, X } from "lucide-react";

import { fecha, moneda } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Clientes",
};

/** Tope de pedidos que se agrupan por página. */
const LIMITE_PEDIDOS = 1000;

type Cliente = {
  dni: string;
  nombre: string;
  telefono: string;
  ultimoPedido: string;
  pedidos: number;
  gastado: number;
};

/** Ver el comentario de `limpiarBusqueda` en `admin/pedidos/page.tsx`. */
function limpiarBusqueda(valor: string): string {
  return valor
    .replace(/[%_\\,()"']/g, "")
    .trim()
    .slice(0, 60);
}

/**
 * Deriva la lista de clientes a partir de `pedidos`.
 *
 * No hay tabla de usuarios: quien compra lo hace sin cuenta, así que el DNI es
 * lo más parecido a un identificador estable que tenemos. Se agrupa por él y se
 * conserva el nombre y el teléfono del pedido MÁS RECIENTE, que es el dato
 * bueno si alguien cambió de número entre una compra y otra.
 *
 * La agrupación se hace en JS porque PostgREST no expone `group by`. Con el
 * volumen de esta tienda sobra; si crece a miles de pedidos, conviene una vista
 * SQL o un `distinct on (cliente_dni)`.
 */
function agrupar(
  filas: {
    cliente_dni: string;
    cliente_nombre: string;
    cliente_telefono: string;
    creado_en: string;
    total: number;
    estado: string;
  }[],
): Cliente[] {
  const porDni = new Map<string, Cliente>();

  // Las filas llegan ordenadas por fecha descendente, así que la primera
  // aparición de cada DNI ya es su pedido más reciente.
  for (const fila of filas) {
    const existente = porDni.get(fila.cliente_dni);
    const cuenta = fila.estado !== "cancelado" ? fila.total : 0;

    if (existente) {
      existente.pedidos += 1;
      existente.gastado += cuenta;
      continue;
    }

    porDni.set(fila.cliente_dni, {
      dni: fila.cliente_dni,
      nombre: fila.cliente_nombre,
      telefono: fila.cliente_telefono,
      ultimoPedido: fila.creado_en,
      pedidos: 1,
      gastado: cuenta,
    });
  }

  return [...porDni.values()];
}

export default async function ClientesPage({
  searchParams,
}: PageProps<"/admin/clientes">) {
  const params = await searchParams;
  const buscarCrudo = typeof params.buscar === "string" ? params.buscar : "";
  const buscar = limpiarBusqueda(buscarCrudo);

  const supabase = await createClient();

  let consulta = supabase
    .from("pedidos")
    .select("cliente_dni, cliente_nombre, cliente_telefono, creado_en, total, estado");

  if (buscar) {
    consulta = consulta.or(
      `cliente_nombre.ilike.%${buscar}%,cliente_dni.ilike.%${buscar}%`,
    );
  }

  const { data, error } = await consulta
    .order("creado_en", { ascending: false })
    .limit(LIMITE_PEDIDOS);

  const clientes = agrupar(data ?? []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Directorio
        </p>
        <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
          Clientes
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />

        <p className="mt-4 text-sm text-neutral-500">
          {clientes.length}{" "}
          {clientes.length === 1 ? "cliente único" : "clientes únicos"},
          agrupados por DNI a partir de los pedidos.
        </p>
      </header>

      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          action="/admin/clientes"
          method="get"
          role="search"
          className="flex items-center gap-2"
        >
          <div className="relative">
            <label htmlFor="buscar" className="sr-only">
              Buscar por nombre o DNI
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600"
              aria-hidden
            />
            <input
              id="buscar"
              name="buscar"
              type="search"
              defaultValue={buscarCrudo}
              placeholder="Nombre o DNI..."
              className="w-52 border border-ink-line bg-ink-soft py-2 pr-3 pl-9 text-sm text-neutral-200 transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="border border-ink-line bg-ink-soft px-4 py-2 text-[11px] font-bold tracking-[0.15em] text-neutral-400 uppercase transition-colors hover:border-neon/50 hover:text-neon"
          >
            Buscar
          </button>
        </form>

        {buscar && (
          <Link
            href="/admin/clientes"
            className="inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.15em] text-neutral-500 uppercase transition-colors hover:text-neon"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpiar
          </Link>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudieron cargar los clientes: {error.message}
        </p>
      )}

      {!error && clientes.length === 0 && (
        <div className="flex flex-col items-center border border-dashed border-ink-line bg-ink-soft px-6 py-16 text-center">
          <Users className="h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-4 text-sm font-bold tracking-wide text-white uppercase">
            {buscar ? "Sin coincidencias" : "Todavía no hay clientes"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {buscar
              ? "Ningún cliente coincide con la búsqueda."
              : "Aparecerán aquí en cuanto alguien complete un pedido."}
          </p>
        </div>
      )}

      {clientes.length > 0 && (
        <div className="overflow-x-auto border border-ink-line bg-ink-soft">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left">
                {["Nombre", "DNI", "Teléfono", "Último pedido", "Pedidos", "Gastado"].map(
                  (columna) => (
                    <th
                      key={columna}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
                    >
                      {columna}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr
                  key={cliente.dni}
                  className="border-b border-ink-line/60 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="max-w-xs truncate px-4 py-4 font-bold text-white">
                    {cliente.nombre}
                  </td>

                  <td className="px-4 py-4 font-mono text-xs whitespace-nowrap text-neutral-300">
                    {cliente.dni}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <a
                      href={`https://wa.me/51${cliente.telefono}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-neutral-300 transition-colors hover:text-neon"
                    >
                      {cliente.telefono}
                    </a>
                  </td>

                  <td className="px-4 py-4 text-xs whitespace-nowrap text-neutral-400">
                    {fecha.format(new Date(cliente.ultimoPedido))}
                  </td>

                  <td className="px-4 py-4 font-mono text-neutral-300">
                    {cliente.pedidos}
                  </td>

                  <td className="px-4 py-4 font-mono font-bold whitespace-nowrap text-white">
                    {moneda.format(cliente.gastado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
