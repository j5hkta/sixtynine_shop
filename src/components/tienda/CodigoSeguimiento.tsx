"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Muestra el UUID completo del pedido y ofrece copiarlo al portapapeles.
 *
 * `navigator.clipboard` sólo existe en contextos seguros (https o localhost).
 * En http plano no está definido y la promesa falla, así que el fallback
 * selecciona el texto para que baste con Ctrl+C: preferimos eso a un botón que
 * no hace nada y no lo dice.
 */
export default function CodigoSeguimiento({ id }: { id: string }) {
  const [estado, setEstado] = useState<"listo" | "copiado" | "manual">("listo");
  const codigoRef = useRef<HTMLElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copiar() {
    if (temporizador.current) clearTimeout(temporizador.current);

    try {
      await navigator.clipboard.writeText(id);
      setEstado("copiado");
      temporizador.current = setTimeout(() => setEstado("listo"), 2500);
    } catch {
      // Sin portapapeles: dejamos el código seleccionado y lo avisamos.
      const nodo = codigoRef.current;
      if (nodo) {
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        const seleccion = window.getSelection();
        seleccion?.removeAllRanges();
        seleccion?.addRange(rango);
      }
      setEstado("manual");
    }
  }

  return (
    <div className="mt-8 border-2 border-black bg-neutral-50 p-5 text-left sm:p-6">
      <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
        Tu código de seguimiento
      </h2>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code
          ref={codigoRef}
          className="flex-1 border border-neutral-300 bg-white px-4 py-3 font-mono text-sm font-bold break-all text-black select-all sm:text-base"
        >
          {id}
        </code>

        <button
          type="button"
          onClick={copiar}
          aria-label="Copiar código de seguimiento"
          className="flex shrink-0 items-center justify-center gap-2 bg-black px-6 py-3 text-xs font-black tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-80"
        >
          {estado === "copiado" ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copiar
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
        Este es tu código de seguimiento. Cópialo y guárdalo para consultar el
        estado de tu envío en nuestra web.
      </p>

      {estado === "manual" && (
        <p role="status" className="mt-2 text-xs text-neutral-500">
          Tu navegador no nos deja copiar automáticamente. Ya lo dejamos
          seleccionado: pulsa Ctrl+C (o Cmd+C).
        </p>
      )}
    </div>
  );
}
