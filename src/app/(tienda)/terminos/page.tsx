import Link from "next/link";

import PaginaLegal, { Lista, Seccion } from "@/components/tienda/PaginaLegal";
import { moneda } from "@/lib/formato";
import { AGENCIAS, UMBRAL_ENVIO_GRATIS } from "@/lib/envio";

export const metadata = {
  title: "Términos y Condiciones",
  description:
    "Condiciones de compra, pago, envío y uso de la tienda Sixty Nine Skate & Apparel.",
};

/*
 * TEXTO DE EJEMPLO.
 *
 * Describe con fidelidad cómo funciona la tienda hoy (pago manual por Yape,
 * reserva de 1 h, envío por agencia), pero no lo ha revisado nadie con
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
          te contactaremos para ofrecerte otro artículo de valor equivalente o
          un vale de compra.
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
              El total no incluye el flete de la agencia: ese costo se abona al
              recoger el paquete, salvo que el pedido supere el umbral de envío
              gratis.
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
          de skate y de ropa, te mostramos{" "}
          <strong>un único monto y dos números</strong>: puedes yaparlo
          completo a cualquiera de los dos.
        </p>
        <p>
          <strong>La reserva dura 1 hora.</strong> Pasado ese plazo sin
          confirmación de pago, el pedido se cancela automáticamente y las
          unidades vuelven al catálogo.
        </p>
        <p>
          Tu pedido queda confirmado cuando nos envías la captura del pago por
          WhatsApp y la verificamos.
        </p>
      </Seccion>

      <Seccion numero={5} titulo="Envíos">
        <p>
          Enviamos <strong>exclusivamente por agencia</strong> a todo el Perú.
          No hacemos entregas a domicilio. Al comprar eliges entre{" "}
          {AGENCIAS.shalom.etiqueta} y {AGENCIAS.olva.etiqueta}, e indicas la
          sede donde recogerás el paquete.
        </p>

        <Lista
          items={[
            <>
              <strong>
                Pedidos mayores a {moneda.format(UMBRAL_ENVIO_GRATIS)}:
              </strong>{" "}
              el flete lo asume la tienda.
            </>,
            <>
              <strong>
                Pedidos de {moneda.format(UMBRAL_ENVIO_GRATIS)} o menos:
              </strong>{" "}
              flete con pago en destino, es decir, se abona en la agencia al
              recoger.
            </>,
          ]}
        />

        <p>
          El importe del flete lo fija la agencia según destino y peso, por eso
          no se cobra en la web: el total que pagas cubre sólo los productos.
          Despachamos entre 24 y 48 horas hábiles tras confirmar el pago, y
          cargamos el número de seguimiento y la clave de recojo en{" "}
          <Link
            href="/seguimiento"
            className="font-bold text-black underline underline-offset-4"
          >
            seguimiento
          </Link>
          .
        </p>
      </Seccion>

      <Seccion numero={6} titulo="Ventas finales">
        <p>
          <strong>
            No aceptamos devoluciones, cambios ni reembolsos de dinero.
          </strong>{" "}
          Todas las ventas son finales. Revisa tu talla, tu modelo y las fotos
          antes de confirmar, y escríbenos por WhatsApp si tienes cualquier duda
          previa a la compra.
        </p>
        <p>
          Los detalles y las excepciones por daño en tránsito están en la
          página de{" "}
          <Link
            href="/devoluciones"
            className="font-bold text-black underline underline-offset-4"
          >
            envíos y devoluciones
          </Link>
          .
        </p>
      </Seccion>

      <Seccion numero={7} titulo="Datos personales">
        <p>
          Para procesar tu pedido recogemos nombre, DNI, teléfono, ciudad o
          distrito y la sede de agencia elegida. Los usamos únicamente para
          preparar y despachar tu compra, y no los compartimos con terceros
          salvo con la agencia encargada de la entrega.
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
            página de envíos
          </Link>
          .
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
