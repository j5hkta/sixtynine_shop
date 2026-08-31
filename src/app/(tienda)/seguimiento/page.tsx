import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import { AGENCIAS, esAgenciaValida } from "@/lib/envio";
import { fecha, moneda } from "@/lib/formato";
import { createAnonClient } from "@/lib/supabase/anon";

export const metadata = {
  title: "Seguimiento de pedido",
  description: "Consulta el estado de tu pedido con tu número de orden.",
  robots: { index: true, follow: true },
};

type Estado = "pendiente" | "confirmado" | "enviado" | "entregado" | "cancelado";

/** Cómo se le presenta al comprador cada estado interno. */
const PRESENTACION: Record<
  Estado,
  { titulo: string; detalle: string; icono: typeof Clock; clase: string }
> = {
  pendiente: {
    titulo: "Pendiente de Pago",
    detalle:
      "Todavía no registramos tu yapeo. Recuerda que la reserva dura 1 hora desde que hiciste el pedido.",
    icono: Clock,
    clase: "border-amber-400 bg-amber-50 text-amber-900",
  },
  confirmado: {
    titulo: "Pago Confirmado / Preparando",
    detalle:
      "Recibimos tu pago y estamos alistando el paquete para llevarlo a la agencia.",
    icono: CheckCircle2,
    clase: "border-black bg-neutral-50 text-black",
  },
  enviado: {
    titulo: "Enviado",
    detalle: "Tu paquete ya está en la agencia. Abajo tienes los datos de recojo.",
    icono: Truck,
    clase: "border-black bg-black text-white",
  },
  entregado: {
    titulo: "Entregado",
    detalle: "Recogiste tu pedido. ¡Gracias por comprar con nosotros!",
    icono: PackageCheck,
    clase: "border-black bg-neutral-50 text-black",
  },
  cancelado: {
    titulo: "Cancelado",
    detalle:
      "Este pedido se canceló. Si fue por tiempo de reserva vencido, puedes volver a hacerlo desde el catálogo.",
    icono: XCircle,
    clase: "border-neutral-300 bg-neutral-100 text-neutral-600",
  },
};

/**
 * Deja el término listo para buscar y decide si merece la pena consultar.
 *
 * Ya no se exige un UUID perfecto: vale el código corto de 8 caracteres que le
 * damos al comprador, con o sin `#`, en mayúsculas o minúsculas, y con los
 * espacios que arrastre al copiar y pegar.
 *
 * El mínimo de 8 no es cosmético. Como la consulta casa por prefijo, un término
 * más corto identificaría a varios pedidos a la vez; `buscar_pedido_publico`
 * también lo rechaza en el servidor, esto sólo evita el viaje.
 */
function normalizarTermino(valor: string): string | null {
  const limpio = valor
    .trim()
    .replace(/\s+/g, "")
    .replace(/^#+/, "")
    .toLowerCase();

  return /^[0-9a-f-]{8,36}$/.test(limpio) ? limpio : null;
}

async function cargarPedido(termino: string) {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .rpc("buscar_pedido_publico", { p_termino: termino })
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (e) {
    console.error(
      "[seguimiento] No se pudo leer el pedido:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export default async function SeguimientoPage({
  searchParams,
}: PageProps<"/seguimiento">) {
  const params = await searchParams;
  const idCrudo = typeof params.id === "string" ? params.id.trim() : "";

  const buscado = idCrudo.length > 0;
  const termino = normalizarTermino(idCrudo);
  const pedido = termino ? await cargarPedido(termino) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <header>
        <h1 className="text-3xl font-black tracking-tighter text-black uppercase sm:text-4xl">
          Seguimiento
        </h1>
        <span className="mt-4 block h-1 w-16 bg-black" aria-hidden />
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          Ingresa el código de seguimiento que te dimos al confirmar la compra.
          Puedes pegarlo completo o escribir sólo los primeros 8 caracteres, con
          o sin el <span className="font-mono font-bold text-black">#</span>.
        </p>
      </header>

      {/* Formulario GET: sin JS, el navegador arma el query param. */}
      <form
        action="/seguimiento"
        method="get"
        role="search"
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <label htmlFor="id" className="sr-only">
            Código de seguimiento
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            id="id"
            name="id"
            type="text"
            defaultValue={idCrudo}
            placeholder="D8D30EB3 o el código completo"
            className="w-full border border-neutral-400 bg-white py-3 pr-3 pl-9 font-mono text-sm text-black transition-colors placeholder:text-neutral-400 focus:border-black focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="bg-black px-8 py-3 text-xs font-black tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-80"
        >
          Buscar
        </button>
      </form>

      {buscado && !termino && (
        <p
          role="alert"
          className="mt-8 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Ese código no tiene la forma que esperamos. Escribe al menos los 8
          primeros caracteres, tal como aparecen en tu confirmación.
        </p>
      )}

      {buscado && termino && !pedido && (
        <p
          role="alert"
          className="mt-8 flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No encontramos ningún pedido con ese código. Prueba a pegarlo completo
          o escríbenos por WhatsApp.
        </p>
      )}

      {pedido && <Resultado pedido={pedido} />}

      {!buscado && (
        <p className="mt-10 border border-dashed border-neutral-300 px-6 py-12 text-center text-sm text-neutral-500">
          Escribe tu número de pedido arriba para ver en qué estado está.
        </p>
      )}
    </div>
  );
}

function Resultado({
  pedido,
}: {
  pedido: {
    /** Viene de la base de datos, no del buscador: el término pudo ser un prefijo. */
    id: string;
    total: number;
    estado: string;
    creado_en: string;
    agencia: string | null;
    sede_agencia: string | null;
    tracking_numero: string | null;
    tracking_clave: string | null;
  };
}) {
  const estado = (
    Object.keys(PRESENTACION).includes(pedido.estado)
      ? pedido.estado
      : "pendiente"
  ) as Estado;

  const p = PRESENTACION[estado];
  const Icono = p.icono;

  const nombreAgencia =
    pedido.agencia && esAgenciaValida(pedido.agencia)
      ? AGENCIAS[pedido.agencia].etiqueta
      : null;

  // El paquete puede estar en la agencia sin que el admin haya cargado todavía
  // los códigos: se distingue "enviado sin datos" de "enviado con datos" en vez
  // de mostrar celdas vacías.
  const hayTracking = Boolean(pedido.tracking_numero || pedido.tracking_clave);

  return (
    <section className="mt-8">
      <div className={`flex items-start gap-4 border-2 p-6 ${p.clase}`}>
        <Icono className="mt-0.5 h-7 w-7 shrink-0" aria-hidden />
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase">
            {p.titulo}
          </h2>
          <p className="mt-2 text-sm leading-relaxed opacity-90">{p.detalle}</p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-neutral-500">Pedido</dt>
          <dd className="text-right font-mono font-bold text-black">
            #{pedido.id.slice(0, 8).toUpperCase()}
            <span className="block text-[10px] font-normal break-all text-neutral-400">
              {pedido.id}
            </span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-neutral-500">Fecha</dt>
          <dd className="text-black">
            {fecha.format(new Date(pedido.creado_en))}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-neutral-500">Total</dt>
          <dd className="font-mono font-bold text-black">
            {moneda.format(pedido.total)}
          </dd>
        </div>
        {nombreAgencia && (
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-neutral-500">Agencia</dt>
            <dd className="text-right text-black">
              {nombreAgencia}
              {pedido.sede_agencia && (
                <span className="block text-xs text-neutral-500">
                  {pedido.sede_agencia}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {estado === "enviado" && (
        <div className="mt-6 border-2 border-black bg-white p-6">
          <h3 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Datos de recojo
          </h3>

          {hayTracking ? (
            <>
              <dl className="mt-5 space-y-4">
                {pedido.tracking_numero && (
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
                      Número de seguimiento
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-black break-all text-black">
                      {pedido.tracking_numero}
                    </dd>
                  </div>
                )}

                {pedido.tracking_clave && (
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
                      Clave de recojo
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-black break-all text-black">
                      {pedido.tracking_clave}
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-5 text-xs leading-relaxed text-neutral-500">
                Presenta tu DNI y estos datos en{" "}
                {nombreAgencia ?? "la agencia"}
                {pedido.sede_agencia ? ` (${pedido.sede_agencia})` : ""}.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              Tu paquete ya salió, pero todavía no cargamos los códigos de
              recojo. Vuelve a consultar en un rato o escríbenos por WhatsApp.
            </p>
          )}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/productos"
          className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase underline-offset-4 hover:text-black hover:underline"
        >
          Seguir comprando
        </Link>
      </div>
    </section>
  );
}
