import Link from "next/link";
import { MessageCircle } from "lucide-react";

import PaginaLegal, { Lista, Seccion } from "@/components/tienda/PaginaLegal";
import { agruparNumero, VENDEDORES } from "@/lib/pago";

export const metadata = {
  title: "Cambios y Devoluciones",
  description:
    "Cómo solicitar un cambio o devolución en Sixty Nine Skate & Apparel. Los cambios se coordinan directamente por WhatsApp.",
};

/*
 * TEXTO DE EJEMPLO. Ver la nota equivalente en `terminos/page.tsx`.
 *
 * Los números salen de `src/lib/pago.ts`, los mismos que ve el comprador en la
 * pantalla de confirmación: así no hay dos sitios que actualizar cuando cambie
 * una línea.
 */
export default function DevolucionesPage() {
  return (
    <PaginaLegal
      titulo="Cambios y Devoluciones"
      actualizado="agosto de 2026"
      entradilla="Todo cambio o devolución se coordina directamente por WhatsApp con la persona responsable de tu producto. No hay formularios ni tickets: nos escribes y lo resolvemos."
    >
      <Seccion numero={1} titulo="Escríbenos directamente">
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

      <Seccion numero={2} titulo="Plazo">
        <p>
          Tienes <strong>7 días calendario</strong> desde que recibes tu pedido
          para solicitar un cambio. Pasado ese plazo no podemos procesarlo,
          salvo que se trate de una falla de fábrica.
        </p>
      </Seccion>

      <Seccion numero={3} titulo="Condiciones del producto">
        <p>Para aceptar un cambio, el producto debe estar:</p>
        <Lista
          items={[
            "Sin uso y sin señales de haber sido montado o rodado.",
            "Con sus etiquetas originales puestas.",
            "En su empaque original, en buen estado.",
            "Acompañado de la captura del Yape o comprobante de la compra.",
          ]}
        />
      </Seccion>

      <Seccion numero={4} titulo="Qué no se cambia">
        <Lista
          items={[
            "Tablas que ya fueron lijadas o montadas.",
            "Ruedas y rodamientos con marcas de rodada.",
            "Productos en oferta o liquidación, salvo falla de fábrica.",
            "Ropa interior, medias y artículos de higiene personal.",
            "Productos dañados por mal uso, golpes o desgaste normal.",
          ]}
        />
      </Seccion>

      <Seccion numero={5} titulo="Cómo funciona el cambio">
        <Lista
          items={[
            "Escríbenos por WhatsApp con tu número de pedido y una foto del producto.",
            "Te confirmamos si aplica y coordinamos el punto de encuentro o el envío de regreso.",
            "Si el cambio es por talla o modelo, ajustamos la diferencia de precio si la hubiera.",
            "Si el producto que quieres ya no tiene stock, puedes elegir otro o recibir la devolución del monto.",
          ]}
        />
        <p>
          El costo del envío de retorno corre por cuenta del cliente, salvo que
          el cambio se deba a un error nuestro o a una falla de fábrica: en ese
          caso lo asumimos nosotros.
        </p>
      </Seccion>

      <Seccion numero={6} titulo="Fallas de fábrica">
        <p>
          Si tu producto presenta un defecto de fabricación, escríbenos apenas
          lo detectes con fotos o video del problema. Revisamos cada caso y, si
          procede, reponemos el producto o devolvemos el monto íntegro, incluido
          el envío.
        </p>
      </Seccion>

      <Seccion numero={7} titulo="Devolución del dinero">
        <p>
          Las devoluciones se realizan por Yape al mismo número desde el que se
          hizo el pago, dentro de los 5 días hábiles siguientes a que recibamos
          y validemos el producto.
        </p>
        <p>
          Puedes consultar el resto de condiciones de compra en nuestros{" "}
          <Link
            href="/terminos"
            className="font-bold text-black underline underline-offset-4"
          >
            términos y condiciones
          </Link>
          .
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
