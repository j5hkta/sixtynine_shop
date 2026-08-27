import Link from "next/link";
import { AlertTriangle, Eye, Inbox, Search, X } from "lucide-react";

import BadgeEstadoPedido from "@/components/admin/BadgeEstadoPedido";
import SelectorEstadoPedido from "@/components/admin/SelectorEstadoPedido";
import { ESTADOS_PEDIDO } from "@/lib/pedidos";
import { fecha, moneda } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/lib/supabase/types";

export const metadata = {
  title: "Pedidos",
};

const COLUMNAS = ["ID", "Cliente", "Fecha", "Total", "Estado"];

/** Tope de filas por consulta, para que el listado no crezca sin control. */
const LIMITE = 100;

/**
 * Limpia el término de búsqueda.
 *
 * Además de los comodines de LIKE (`%`, `_`), hay que quitar comas y
 * paréntesis: el filtro `.or()` de PostgREST usa esos caracteres como
 * separadores de su propia sintaxis, y una coma en la búsqueda partiría la
 * condición en dos y devolvería resultados absurdos.
 */
function limpiarBusqueda(valor: string): string {
  return valor
    .replace(/[%_\\,()"']/g, "")
    .trim()
    .slice(0, 60);
}

function esEstado(valor: string): valor is EstadoPedido {
  return (ESTADOS_PEDIDO as readonly string[]).includes(valor);
}

/** Construye una URL del listado conservando el resto de filtros. */
function enlace(estado: string | null, buscar: string): string {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (buscar) params.set("buscar", buscar);
  const query = params.toString();
  return query ? `/admin/pedidos?${query}` : "/admin/pedidos";
}

export default async function PedidosPage({
  searchParams,
}: PageProps<"/admin/pedidos">) {
  const params = await searchParams;

  const estadoCrudo =
    typeof params.estado === "string" ? params.estado : "todos";
  const estado = esEstado(estadoCrudo) ? estadoCrudo : null;

  const buscarCrudo = typeof params.buscar === "string" ? params.buscar : "";
  const buscar = limpiarBusqueda(buscarCrudo);

  const supabase = await createClient();

  let consulta = supabase
    .from("pedidos")
    .select(
      "id, creado_en, cliente_nombre, cliente_telefono, cliente_dni, direccion_envio, total, estado",
    );

  if (estado) {
    consulta = consulta.eq("estado", estado);
  }

  if (buscar) {
    consulta = consulta.or(
      `cliente_nombre.ilike.%${buscar}%,cliente_dni.ilike.%${buscar}%`,
    );
  }

  const { data: pedidos, error } = await consulta
    .order("creado_en", { ascending: false })
    .limit(LIMITE);

  const filas = pedidos ?? [];
  const hayFiltro = Boolean(estado || buscar);

  const ingresos = filas
    .filter((p) => p.estado !== "cancelado")
    .reduce((suma, p) => suma + p.total, 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Ventas
        </p>
        <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
          Pedidos
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />

        {filas.length > 0 && (
          <p className="mt-4 text-sm text-neutral-500">
            {filas.length} {filas.length === 1 ? "pedido" : "pedidos"} ·{" "}
            <span className="font-mono text-neutral-300">
              {moneda.format(ingresos)}
            </span>{" "}
            sin contar cancelados.
            {filas.length === LIMITE && (
              <span className="text-neutral-600">
                {" "}
                Mostrando los {LIMITE} más recientes.
              </span>
            )}
          </p>
        )}
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <nav aria-label="Filtrar por estado">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Chip href={enlace(null, buscar)} activo={estado === null}>
                Todos
              </Chip>
            </li>
            {ESTADOS_PEDIDO.map((opcion) => (
              <li key={opcion}>
                <Chip
                  href={enlace(opcion, buscar)}
                  activo={estado === opcion}
                >
                  {opcion}
                </Chip>
              </li>
            ))}
          </ul>
        </nav>

        {/* Formulario GET: sin JS de cliente, el navegador arma el query param. */}
        <form
          action="/admin/pedidos"
          method="get"
          role="search"
          className="ml-auto flex items-center gap-2"
        >
          {estado && <input type="hidden" name="estado" value={estado} />}

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
      </div>

      {hayFiltro && (
        <div className="flex flex-wrap items-center gap-3 border border-ink-line bg-ink-soft px-4 py-3 text-sm">
          <span className="text-neutral-500">
            Filtrando
            {estado ? (
              <>
                {" "}
                por estado <span className="text-neon">{estado}</span>
              </>
            ) : null}
            {buscar ? (
              <>
                {estado ? " y" : ""} por{" "}
                <span className="text-neon">«{buscar}»</span>
              </>
            ) : null}
            .
          </span>

          <Link
            href="/admin/pedidos"
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.15em] text-neutral-500 uppercase transition-colors hover:text-neon"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpiar
          </Link>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudieron cargar los pedidos: {error.message}
        </p>
      )}

      {!error && filas.length === 0 && (
        <div className="flex flex-col items-center border border-dashed border-ink-line bg-ink-soft px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-4 text-sm font-bold tracking-wide text-white uppercase">
            {hayFiltro ? "Sin coincidencias" : "Todavía no hay pedidos"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {hayFiltro
              ? "Ningún pedido cumple con los filtros aplicados."
              : "Aparecerán aquí en cuanto alguien complete el checkout."}
          </p>
          {hayFiltro && (
            <Link
              href="/admin/pedidos"
              className="mt-6 bg-neon px-5 py-3 text-[11px] font-black tracking-[0.15em] text-ink uppercase transition-colors hover:bg-white"
            >
              Ver todos los pedidos
            </Link>
          )}
        </div>
      )}

      {filas.length > 0 && (
        <div className="overflow-x-auto border border-ink-line bg-ink-soft">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left">
                {COLUMNAS.map((columna) => (
                  <th
                    key={columna}
                    scope="col"
                    className="px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase"
                  >
                    {columna}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {filas.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="border-b border-ink-line/60 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-4 font-mono text-xs font-bold whitespace-nowrap text-neon">
                    #{pedido.id.slice(0, 8).toUpperCase()}
                  </td>

                  <td className="max-w-xs px-4 py-4">
                    <p className="truncate font-bold text-white">
                      {pedido.cliente_nombre}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">
                      {pedido.cliente_telefono} · DNI {pedido.cliente_dni}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-600">
                      {pedido.direccion_envio}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-xs whitespace-nowrap text-neutral-400">
                    {fecha.format(new Date(pedido.creado_en))}
                  </td>

                  <td className="px-4 py-4 font-mono font-bold whitespace-nowrap text-white">
                    {moneda.format(pedido.total)}
                  </td>

                  <td className="px-4 py-4">
                    <BadgeEstadoPedido estado={pedido.estado} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <SelectorEstadoPedido
                        id={pedido.id}
                        estado={pedido.estado}
                      />

                      <Link
                        href={`/admin/pedidos/${pedido.id}`}
                        aria-label={`Ver detalle del pedido ${pedido.id.slice(0, 8).toUpperCase()}`}
                        title="Ver detalle"
                        className="border border-ink-line p-2 text-neutral-500 transition-colors hover:border-neon/50 hover:bg-neon/10 hover:text-neon"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
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

function Chip({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`inline-block border px-3 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
        activo
          ? "border-neon bg-neon text-ink"
          : "border-ink-line text-neutral-400 hover:border-neon/50 hover:text-neon"
      }`}
    >
      {children}
    </Link>
  );
}
