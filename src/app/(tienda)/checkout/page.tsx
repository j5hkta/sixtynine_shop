"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import { procesarPedido } from "@/actions/checkout";
import {
  AGENCIAS,
  CLAVES_AGENCIA,
  esAgenciaValida,
  textoEnvio,
  type Agencia,
} from "@/lib/envio";
import { moneda } from "@/lib/formato";
import { TALLA_UNICA } from "@/lib/validacion";
import { useCarrito, useHidratado, useTotalPrecio } from "@/store/carrito";

const inputClase =
  "w-full border border-neutral-400 bg-white px-4 py-3 text-sm text-black transition-colors placeholder:text-neutral-400 focus:border-black focus:outline-none";

const labelClase =
  "block text-[11px] font-bold tracking-[0.2em] text-neutral-600 uppercase";

const ayudaClase = "text-xs text-neutral-400";

export default function CheckoutPage() {
  const router = useRouter();
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  const subtotal = useTotalPrecio();

  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [agencia, setAgencia] = useState<Agencia | "">("");
  const [consultandoDni, setConsultandoDni] = useState(false);

  // Evita repetir la consulta del mismo DNI si el usuario borra y reescribe el
  // último dígito, que dispararía el fetch en cada pulsación.
  const ultimoDniConsultado = useRef<string | null>(null);

  // El flete no entra en el total: se paga en la agencia, o lo asume la tienda
  // si el pedido supera el umbral.
  const total = subtotal;

  function alCambiarDni(valor: string) {
    const soloDigitos = valor.replace(/\D/g, "").slice(0, 8);
    setDni(soloDigitos);

    if (soloDigitos.length !== 8 || ultimoDniConsultado.current === soloDigitos) {
      return;
    }

    ultimoDniConsultado.current = soloDigitos;
    setConsultandoDni(true);

    // Autocompletado silencioso: si la consulta falla, el comprador escribe el
    // nombre a mano y no se le muestra ningún error. No es un paso obligatorio.
    fetch(`/api/reniec?dni=${soloDigitos}`)
      .then((r) => r.json())
      .then((datos: { ok?: boolean; nombreCompleto?: string }) => {
        // El usuario pudo seguir escribiendo mientras llegaba la respuesta.
        if (datos?.ok && datos.nombreCompleto) {
          setNombre(datos.nombreCompleto);
        }
      })
      .catch(() => {
        /* silencio deliberado */
      })
      .finally(() => setConsultandoDni(false));
  }

  function handleSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!esAgenciaValida(agencia)) {
      setError("Selecciona la agencia por la que quieres recibir tu pedido.");
      return;
    }

    // Se captura antes de entrar en la transición: dentro del callback async
    // `evento.currentTarget` ya sería null.
    const formData = new FormData(evento.currentTarget);
    setError(null);

    iniciarEnvio(async () => {
      const resultado = await procesarPedido(formData, items);

      if (!resultado.exito) {
        setError(resultado.error);
        return;
      }

      // El carrito se vacía en la pantalla de éxito, no aquí: si el navegador
      // se cierra a mitad de la navegación, el comprador conserva su selección.
      router.push(`/checkout/exito?id=${resultado.pedidoId}`);
    });
  }

  // Mismo motivo que en /carrito: hasta que `persist` rehidrata, el servidor y
  // el cliente no coinciden.
  if (!hidratado) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="h-10 w-56 animate-pulse bg-neutral-100" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="h-96 animate-pulse bg-neutral-100" />
          <div className="h-64 animate-pulse bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-6">
        <span className="flex h-20 w-20 items-center justify-center border border-neutral-200 bg-white text-neutral-400">
          <ShoppingBag className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-8 text-3xl font-black tracking-tighter text-black uppercase">
          No hay nada que pagar
        </h1>
        <span className="mt-4 block h-1 w-16 bg-black" aria-hidden />
        <Link
          href="/productos"
          className="mt-10 bg-black px-8 py-4 text-xs font-black tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-80"
        >
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Link
        href="/carrito"
        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver al carrito
      </Link>

      <header className="mt-6">
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Último paso
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tighter text-black uppercase sm:text-5xl">
          Checkout
        </h1>
        <span className="mt-4 block h-1 w-16 bg-black" aria-hidden />
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6 border border-neutral-200 bg-white p-6 sm:p-8"
        >
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Datos de envío
          </h2>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {/* DNI primero: al completarlo se rellena el nombre solo. */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dni" className={labelClase}>
                DNI
              </label>
              <div className="relative">
                <input
                  id="dni"
                  name="dni"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={8}
                  value={dni}
                  onChange={(e) => alCambiarDni(e.target.value)}
                  placeholder="12345678"
                  aria-describedby="dni-ayuda"
                  className={`${inputClase} font-mono`}
                />
                {consultandoDni && (
                  <Loader2
                    className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400"
                    aria-hidden
                  />
                )}
              </div>
              <p id="dni-ayuda" className={ayudaClase}>
                8 dígitos. Completamos tu nombre automáticamente.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="telefono" className={labelClase}>
                Teléfono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                required
                autoComplete="tel-national"
                placeholder="987654321"
                aria-describedby="telefono-ayuda"
                className={`${inputClase} font-mono`}
              />
              <p id="telefono-ayuda" className={ayudaClase}>
                Celular de 9 dígitos que empiece en 9.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="nombre" className={labelClase}>
              Nombre Completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez Quispe"
              className={inputClase}
            />
            <p className={ayudaClase}>
              Puedes corregirlo si no coincide con tu documento.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClase}>Agencia de envío</legend>

            <div className="grid gap-3 sm:grid-cols-2">
              {CLAVES_AGENCIA.map((clave) => (
                <label
                  key={clave}
                  className={`flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors ${
                    agencia === clave
                      ? "border-black bg-black text-white"
                      : "border-neutral-400 bg-white text-black hover:border-black"
                  }`}
                >
                  <input
                    type="radio"
                    name="agencia"
                    value={clave}
                    checked={agencia === clave}
                    onChange={() => {
                      setAgencia(clave);
                      setError(null);
                    }}
                    className="h-4 w-4 accent-black"
                  />
                  <span className="font-bold">{AGENCIAS[clave].etiqueta}</span>
                </label>
              ))}
            </div>

            <p className={ayudaClase}>
              Enviamos únicamente por agencia. Recoges tu pedido en el local que
              elijas.
            </p>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="sede_agencia" className={labelClase}>
              Sede de la Agencia
            </label>
            <input
              id="sede_agencia"
              name="sede_agencia"
              type="text"
              required
              maxLength={120}
              placeholder="Ej: Shalom Av. Aviación 2534, La Victoria"
              aria-describedby="sede-ayuda"
              className={inputClase}
            />
            <p id="sede-ayuda" className={ayudaClase}>
              El local exacto donde vas a recogerlo. Si no lo sabes, escribe el
              distrito y lo coordinamos por WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="direccion" className={labelClase}>
              Ciudad / Distrito
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              required
              maxLength={80}
              autoComplete="address-level2"
              placeholder="Ej: Miraflores, Lima"
              className={inputClase}
            />
            <p className={ayudaClase}>
              A dónde va el paquete. La dirección exacta la pone la agencia.
            </p>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 bg-black py-4 text-xs font-black tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Registrando pedido...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Confirmar Pedido
              </>
            )}
          </button>

          <p className={ayudaClase}>
            Al confirmar reservamos tu pedido y te damos las instrucciones para yapear.
          </p>
        </form>

        {/* Resumen */}
        <aside className="border border-neutral-200 bg-white p-6 lg:sticky lg:top-24">
          <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
            Tu pedido
          </h2>

          <ul className="mt-6 space-y-4 border-b border-neutral-200 pb-6">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-black">
                    {item.titulo}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {item.talla && item.talla !== TALLA_UNICA
                      ? `Talla ${item.talla} · `
                      : ""}
                    {item.cantidad} u.
                  </span>
                </span>
                <span className="shrink-0 font-mono text-black">
                  {moneda.format(item.precio * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 border-b border-neutral-200 pb-6 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="font-mono text-black">
                {moneda.format(subtotal)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">
                Envío
                {agencia && (
                  <span className="block text-xs text-neutral-400">
                    {AGENCIAS[agencia].etiqueta}
                  </span>
                )}
              </dt>
              <dd className="text-right text-xs font-bold text-black">
                {textoEnvio(subtotal)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-600 uppercase">
              Total
            </span>
            <span className="font-mono text-2xl font-black text-black">
              {moneda.format(total)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-neutral-400">
            Los precios y el stock se vuelven a verificar contra el catálogo al
            confirmar. El total no incluye el flete de la agencia.
          </p>
        </aside>
      </div>
    </div>
  );
}
