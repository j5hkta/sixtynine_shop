import Link from "next/link";

import { DESTINO_TODO, rutaDeBanner } from "@/lib/banners";

export type BannerPortada = {
  id: string;
  imagen_url: string;
  categoria: string;
};

/**
 * Carrusel de banners de la portada.
 *
 * Sin JavaScript: es scroll nativo con `snap`, así que funciona en cuanto llega
 * el HTML y no añade nada al bundle. Se desliza con el dedo en móvil y con
 * trackpad, rueda horizontal o teclado en escritorio.
 *
 * Con un solo banner no se monta el carrusel — un contenedor de scroll con un
 * único hijo sólo añade comportamiento raro (rebote, foco desplazable) sin
 * aportar nada.
 */
export default function CarruselBanners({
  banners,
}: {
  banners: BannerPortada[];
}) {
  if (banners.length === 1) {
    return <BannerEnlace banner={banners[0]} />;
  }

  return (
    <div
      // `overscroll-x-contain` evita que al llegar al último banner el gesto
      // siga hacia atrás en el historial del navegador.
      className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-hide"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
      tabIndex={0}
    >
      {banners.map((banner, indice) => (
        <div
          key={banner.id}
          className="min-w-full snap-center"
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${indice + 1} de ${banners.length}`}
        >
          <BannerEnlace banner={banner} />
        </div>
      ))}
    </div>
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
