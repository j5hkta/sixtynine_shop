import Link from "next/link";

import PaginaLegal, { Lista, Seccion } from "@/components/tienda/PaginaLegal";
import { moneda } from "@/lib/formato";
import { ZONAS_ENVIO } from "@/lib/envio";

export const metadata = {
  title: "Términos y Condiciones",
  description:
    "Condiciones de compra, pago, envío y uso de la tienda Sixty Nine Skate & Apparel.",
};

/*
 * TEXTO DE EJEMPLO.
 *
 * Describe con fidelidad cómo funciona la tienda hoy (pago manual por Yape,
 * reserva de 24 h, tarifas de envío), pero no lo ha revisado nadie con
 * criterio legal. Antes de operar de verdad conviene que lo lea un abogado y
 * que se completen los datos de la empresa (razón social y RUC).
 */
export default function TerminosPage() {
  return (
    <PaginaLegal
      titulo="Términos y Condiciones"
      actualizado="agosto de 2026"
      entradilla="Estas condiciones regulan la compra de productos en Sixty Nine Skate & Apparel. Al realizar un pedido aceptas lo que se describe aquí."
    >
      <Seccion numero={1} titulo="Quiénes somos">
        <p>
          Sixty Nine Skate & Apparel es una tienda peruana de artículos de
          skate y ropa urbana. Operamos principalmente en Lima y realizamos
          envíos a todo el país. La atención al cliente y la coordinación de
          pagos se realizan por WhatsApp.
        </p>
      </Seccion>

      <Seccion numero={2} titulo="Productos y disponibilidad">
        <p>
          Las fotografías son referenciales; pueden existir variaciones menores
          de color según la pantalla. El stock mostrado en el catálogo se
          actualiza automáticamente con cada pedido, pero puede agotarse
          mientras completas tu compra.
        </p>
        <p>
          Si un producto queda sin stock después de que hayas hecho el pedido,
          te contactaremos para ofrecerte un cambio o la devolución íntegra de
          lo pagado.
        </p>
      </Seccion>

      <Seccion numero={3} titulo="Precios">
        <Lista
          items={[
            <>
              Todos los precios están expresados en soles peruanos (PEN) e
              incluyen los impuestos aplicables.
            </>,
            <>
              El precio válido es el que figura en el catálogo al momento de
              confirmar el pedido. Los cambios posteriores no afectan a pedidos
              ya registrados.
            </>,
            <>
              El costo de envío se muestra por separado antes de confirmar y se
              suma al total.
            </>,
          ]}
        />
      </Seccion>

      <Seccion numero={4} titulo="Pago">
        <p>
          El pago es manual: se realiza por Yape o en efectivo. No procesamos
          tarjetas ni emitimos comprobantes electrónicos automáticos.
        </p>
        <p>
          Al confirmar el pedido reservamos las unidades y te mostramos el monto
          exacto y el número al que debes yapear. Si tu pedido incluye artículos
          de skate y de ropa, verás <strong>dos montos y dos números</strong>,
          uno por cada responsable; ambos deben pagarse para procesar el envío.
        </p>
        <p>
          <strong>La reserva dura 24 horas.</strong> Pasado ese plazo sin
          confirmación de pago, el pedido se cancela automáticamente y las
          unidades vuelven al catálogo.
        </p>
        <p>
          Tu pedido queda confirmado cuando nos envías la captura del pago por
          WhatsApp y la verificamos.
        </p>
      </Seccion>

      <Seccion numero={5} titulo="Envíos">
        <p>Las tarifas vigentes son:</p>
        <Lista
          items={[
            <>
              <strong>{ZONAS_ENVIO.lima.etiqueta}:</strong>{" "}
              {moneda.format(ZONAS_ENVIO.lima.costo)}
            </>,
            <>
              <strong>{ZONAS_ENVIO.provincia.etiqueta}:</strong>{" "}
              {moneda.format(ZONAS_ENVIO.provincia.costo)}
            </>,
          ]}
        />
        <p>
          Los plazos de entrega se coordinan por WhatsApp una vez confirmado el
          pago y dependen del destino y del servicio de mensajería. La dirección
          que registres es la que usaremos: revísala antes de confirmar, porque
          un reenvío por dirección incorrecta genera un costo adicional.
        </p>
      </Seccion>

      <Seccion numero={6} titulo="Cambios y devoluciones">
        <p>
          Las condiciones de cambio y devolución se detallan en nuestra{" "}
          <Link
            href="/devoluciones"
            className="font-bold text-black underline underline-offset-4"
          >
            política de cambios y devoluciones
          </Link>
          .
        </p>
      </Seccion>

      <Seccion numero={7} titulo="Datos personales">
        <p>
          Para procesar tu pedido recogemos nombre, DNI, teléfono y dirección de
          envío. Los usamos únicamente para preparar, enviar y coordinar tu
          compra, y no los compartimos con terceros salvo con la empresa de
          mensajería encargada de la entrega.
        </p>
        <p>
          Puedes solicitar la corrección o eliminación de tus datos escribiendo
          a cualquiera de nuestros números de WhatsApp.
        </p>
      </Seccion>

      <Seccion numero={8} titulo="Propiedad intelectual">
        <p>
          Las marcas, logotipos, fotografías y textos de este sitio pertenecen a
          Sixty Nine Skate & Apparel o a sus respectivos titulares. No pueden
          reproducirse con fines comerciales sin autorización.
        </p>
      </Seccion>

      <Seccion numero={9} titulo="Contacto">
        <p>
          Cualquier consulta sobre estas condiciones puede dirigirse a nuestros
          canales de atención por WhatsApp, indicados en la{" "}
          <Link
            href="/devoluciones"
            className="font-bold text-black underline underline-offset-4"
          >
            página de devoluciones
          </Link>
          .
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
