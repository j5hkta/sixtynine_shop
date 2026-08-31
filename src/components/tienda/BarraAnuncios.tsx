"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useMovimientoReducido } from "@/hooks/useMovimientoReducido";

export type AnuncioBarra = {
  id: string;
  texto: string;
  url_destino: string | null;
};

const INTERVALO_MS = 3000;

/**
 * Barra de anuncios sobre el Navbar.
 *
 * Franja negra fina que rota mensajes cortos. Se pausa al pasar el ratón o al
 * enfocar con el teclado: si cambia mientras alguien lee, el mensaje se pierde.
 *
 * La altura es fija (`h-9`) y el texto se trunca en una línea. Sin eso, un
 * anuncio largo en móvil crecería a dos o tres líneas y empujaría el Navbar y
 * todo lo demás hacia abajo cada vez que rotara.
 */
export default function BarraAnuncios({
  anuncios,
}: {
  anuncios: AnuncioBarra[];
}) {
  const total = anuncios.length;
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const movimientoReducido = useMovimientoReducido();

  const irA = useCallback(
    (destino: number) => {
      if (total === 0) return;
      setIndice(((destino % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (pausado || movimientoReducido || total < 2) return;

    const temporizador = setInterval(() => irA(indice + 1), INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [indice, pausado, movimientoReducido, total, irA]);

  if (total === 0) return null;

  // Si el índice se sale de rango tras borrar un anuncio, se cae al primero en
  // lugar de pintar un hueco.
  const anuncio = anuncios[indice] ?? anuncios[0];
  const hayVarios = total > 1;

  return (
    <div
      className="bg-black text-white"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-1 px-2 sm:px-6">
        {hayVarios && (
          <FlechaMini direccion="anterior" onClick={() => irA(indice - 1)} />
        )}

        {/* `aria-live="polite"` anuncia el cambio sin interrumpir; el lector de
            pantalla no se queda con el primer mensaje para siempre. */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className="min-w-0 flex-1 truncate text-center text-[11px] font-bold tracking-[0.1em] uppercase sm:text-xs sm:tracking-[0.15em]"
        >
          {anuncio.url_destino ? (
            <Link
              href={anuncio.url_destino}
              className="underline-offset-4 hover:underline"
            >
              {anuncio.texto}
            </Link>
          ) : (
            anuncio.texto
          )}
        </p>

        {hayVarios && (
          <FlechaMini direccion="siguiente" onClick={() => irA(indice + 1)} />
        )}
      </div>
    </div>
  );
}

function FlechaMini({
  direccion,
  onClick,
}: {
  direccion: "anterior" | "siguiente";
  onClick: () => void;
}) {
  const Icono = direccion === "anterior" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        direccion === "anterior" ? "Anuncio anterior" : "Anuncio siguiente"
      }
      className="flex h-6 w-6 shrink-0 items-center justify-center text-white/50 transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-white focus-visible:outline-none"
    >
      <Icono className="h-4 w-4" aria-hidden />
    </button>
  );
}
