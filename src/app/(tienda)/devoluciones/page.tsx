import Link from "next/link";
import { MessageCircle, XCircle } from "lucide-react";

import PaginaLegal, { Lista, Seccion } from "@/components/tienda/PaginaLegal";
import { AGENCIAS, UMBRAL_ENVIO_GRATIS } from "@/lib/envio";
import { moneda } from "@/lib/formato";
import { agruparNumero, VENDEDORES } from "@/lib/pago";

export const metadata = {
  title: "Envíos y Devoluciones",
  description:
    "Política de envíos por agencia (Shalom u Olva) de Sixty Nine Skate & Apparel. No aceptamos devoluciones ni reembolsos.",
};

/*
 * TEXTO DE EJEMPLO. Ver la nota equivalente en `terminos/page.tsx`.
 *
 * Ojo con el punto 1: negar toda devolución es una decisión comercial del
 * cliente, no una postura legal verificada. En Perú, el Código de Protección
 * y Defensa del Consumidor obliga al proveedor a responder por productos
 * defectuosos con independencia de lo que diga esta página, así que conviene
 * que un abogado revise la redacción antes de operar.
 */
export default function DevolucionesPage() {
  return (
    <PaginaLegal
      titulo="Envíos y Devoluciones"
      actualizado="agosto de 2026"
      entradilla="Enviamos exclusivamente por agencia (Shalom u Olva) a todo el Perú. No aceptamos devoluciones ni cambios: revisa bien tu talla y tu modelo antes de confirmar."
    >
      <Seccion numero={1} titulo="No aceptamos devoluciones">
        <div className="flex items-start gap-3 border-2 border-black bg-neutral-50 p-5">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p className="font-bold text-black">
            Todas las ventas son finales. No realizamos devoluciones, cambios de
            talla, cambios de modelo ni reembolsos de dinero.
          </p>
        </div>

        <p>
          Trabajamos con stock reducido y precios de liquidación, y por eso cada
          unidad que sale ya no vuelve al catálogo. Antes de confirmar tu pedido:
        </p>

        <Lista
          items={[
            "Revisa la talla en la ficha del producto y compárala con una prenda que ya tengas.",
            "Mira todas las fotos: el color puede variar ligeramente según tu pantalla.",
            "Si tienes cualquier duda, escríbenos por WhatsApp ANTES de pagar. Respondemos rápido.",
          ]}
        />

        <p>
          Una vez confirmado el pago, el pedido entra en preparación y no se
          puede modificar ni anular.
        </p>
      </Seccion>

      <Seccion numero={2} titulo="Envío exclusivo por agencia">
        <p>
          No hacemos entregas a domicilio ni contamos con delivery propio. Todos
          los pedidos viajan por agencia y se recogen en el local que elijas al
          momento de comprar:
        </p>

        <Lista
          items={[
            <>
              <strong>{AGENCIAS.shalom.etiqueta}</strong>
            </>,
            <>
              <strong>{AGENCIAS.olva.etiqueta}</strong>
            </>,
          ]}
        />

        <p>
          En el checkout eliges la agencia y escribes la sede donde vas a
          recoger. Si no sabes cuál te queda mejor, pon tu distrito y lo
          coordinamos por WhatsApp.
        </p>
      </Seccion>

      <Seccion numero={3} titulo="Costo del flete">
        <Lista
          items={[
            <>
              <strong>
                Pedidos mayores a {moneda.format(UMBRAL_ENVIO_GRATIS)}:
              </strong>{" "}
              el flete corre por nuestra cuenta. No pagas nada extra al recoger.
            </>,
            <>
              <strong>
                Pedidos de {moneda.format(UMBRAL_ENVIO_GRATIS)} o menos:
              </strong>{" "}
              el flete se paga en destino, es decir, directamente en la agencia
              al momento de recoger tu paquete.
            </>,
          ]}
        />

        <p>
          El monto del flete lo fija la agencia según el destino y el peso del
          paquete, así que no lo cobramos ni lo mostramos en la web. El total
          que yapeas cubre únicamente los productos.
        </p>
      </Seccion>

      <Seccion numero={4} titulo="Plazos y seguimiento">
        <p>
          Despachamos dentro de las 24 a 48 horas hábiles siguientes a la
          confirmación de tu pago. El tiempo de tránsito depende de la agencia y
          del destino.
        </p>
        <p>
          Cuando el paquete sale, cargamos el número de seguimiento y la clave
          de recojo en tu pedido. Puedes consultarlos cuando quieras en{" "}
          <Link
            href="/seguimiento"
            className="font-bold text-black underline underline-offset-4"
          >
            seguimiento
          </Link>{" "}
          con tu número de pedido.
        </p>
        <p>
          Para recoger necesitas tu DNI y los datos que aparecen en esa página.
        </p>
      </Seccion>

      <Seccion numero={5} titulo="Paquetes dañados en tránsito">
        <p>
          Revisa el paquete delante del personal de la agencia antes de
          retirarlo. Si llega abierto o con daños visibles, no lo recibas y
          escríbenos de inmediato con fotos: los reclamos por daño en tránsito
          los gestiona la agencia y sólo proceden en el momento de la entrega.
        </p>
      </Seccion>

      <Seccion numero={6} titulo="Escríbenos">
        <p>
          Tenemos dos números según el tipo de producto. Escribe al que
          corresponda con tu <strong>número de pedido</strong> a la mano.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(["skates", "ropa"] as const).map((clave) => {
            const vendedor = VENDEDORES[clave];
            return (
              <a
                key={clave}
                href={`https://wa.me/51${vendedor.numero}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 border border-neutral-300 bg-white p-5 transition-colors hover:border-black"
              >
                <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
                  {vendedor.etiqueta}
                </span>
                <span className="font-mono text-lg font-black text-black">
                  {agruparNumero(vendedor.numero)}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Escribir por WhatsApp
                </span>
              </a>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Tablas, ruedas, trucks, rodamientos y accesorios van al número de
          Skates. Polos, poleras, pantalones, gorros y zapatillas, al de Ropa.
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
