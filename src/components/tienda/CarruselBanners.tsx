"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useMovimientoReducido } from "@/hooks/useMovimientoReducido";
import { DESTINO_TODO, rutaDeBanner } from "@/lib/banners";

export type BannerPortada = {
  id: string;
  imagen_url: string;
  categoria: string;
};

const INTERVALO_MS = 5000;

/** Margen para que el `scroll` en curso no reescriba el índice a medio camino. */
const REPOSO_SCROLL_MS = 120;

/**
 * Carrusel de banners de la portada.
 *
 * El desplazamiento sigue siendo scroll nativo con `snap`: las flechas y el
 * temporizador sólo llaman a `scrollTo`. Se mantiene así para no perder el
 * gesto de deslizar con el dedo, que es como se navega en móvil, y que una
 * pista movida con `translateX` habría roto.
 *
 * El índice va en estado y también se recalcula al deslizar a mano, para que
 * las flechas sepan desde dónde avanzan aunque nadie las haya tocado.
 */
export default function CarruselBanners({
  banners,
}: {
  banners: BannerPortada[];
}) {
  const total = banners.length;
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const pistaRef = useRef<HTMLDivElement>(null);
  const movimientoReducido = useMovimientoReducido();

  const irA = useCallback(
    (destino: number) => {
      const pista = pistaRef.current;
      if (!pista || total === 0) return;

      // Módulo con corrección de signo: en JS, -1 % 3 es -1, no 2.
      const normalizado = ((destino % total) + total) % total;

      pista.scrollTo({
        left: pista.clientWidth * normalizado,
        behavior: movimientoReducido ? "auto" : "smooth",
      });
      setIndice(normalizado);
    },
    [total, movimientoReducido],
  );

  // Rotación automática. `indice` está en las dependencias a propósito: cada
  // cambio rearma el temporizador, así que pulsar una flecha da los 5 s
  // completos antes del salto siguiente en lugar de heredar lo que quedara.
  useEffect(() => {
    if (pausado || movimientoReducido || total < 2) return;

    const temporizador = setInterval(() => irA(indice + 1), INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [indice, pausado, movimientoReducido, total, irA]);

  // Sincroniza el índice cuando se desliza con el dedo o el trackpad. El
  // `setState` vive dentro del temporizador, no en el cuerpo del efecto.
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista || total < 2) return;

    let reposo: ReturnType<typeof setTimeout>;

    function alDesplazar() {
      clearTimeout(reposo);
      reposo = setTimeout(() => {
        const ancho = pista!.clientWidth;
        if (ancho === 0) return;
        setIndice(Math.round(pista!.scrollLeft / ancho));
      }, REPOSO_SCROLL_MS);
    }

    pista.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      pista.removeEventListener("scroll", alDesplazar);
      clearTimeout(reposo);
    };
  }, [total]);

  if (total === 1) {
    return <BannerEnlace banner={banners[0]} />;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      // También al enfocar: quien navega con teclado no pasa el ratón por
      // encima, y no debería perder el banner que está leyendo.
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div
        ref={pistaRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-hide"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Promociones destacadas"
        tabIndex={0}
      >
        {banners.map((banner, posicion) => (
          <div
            key={banner.id}
            className="min-w-full snap-center"
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${posicion + 1} de ${total}`}
          >
            <BannerEnlace banner={banner} />
          </div>
        ))}
      </div>

      <Flecha
        direccion="anterior"
        onClick={() => irA(indice - 1)}
        posicion="left-2 sm:left-4"
      />
      <Flecha
        direccion="siguiente"
        onClick={() => irA(indice + 1)}
        posicion="right-2 sm:right-4"
      />

      {/* Puntos: sin ellos no hay forma de saber cuántos banners hay ni en
          cuál estás, y el carrusel parece moverse solo sin motivo. */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:bottom-5">
        {banners.map((banner, posicion) => (
          <span
            key={banner.id}
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              posicion === indice ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Flecha({
  direccion,
  onClick,
  posicion,
}: {
  direccion: "anterior" | "siguiente";
  onClick: () => void;
  posicion: string;
}) {
  const Icono = direccion === "anterior" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        direccion === "anterior" ? "Banner anterior" : "Banner siguiente"
      }
      className={`absolute top-1/2 ${posicion} z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:h-11 sm:w-11`}
    >
      <Icono className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
    </button>
  );
}

function BannerEnlace({ banner }: { banner: BannerPortada }) {
  const destino =
    banner.categoria === DESTINO_TODO
      ? "todo el catálogo"
      : banner.categoria.toLowerCase();

  return (
    <Link href={rutaDeBanner(banner.categoria)} className="block w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.imagen_url}
        // El texto alternativo dice adónde lleva, que es lo único que un lector
        // de pantalla puede aprovechar de una imagen promocional.
        alt={`Ver ${destino}`}
        className="h-auto w-full object-cover"
      />
    </Link>
  );
}
