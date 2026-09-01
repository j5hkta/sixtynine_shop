import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const NOMBRE = "Sixty Nine Skate & Apparel";

const DESCRIPCION =
  "Tablas, ruedas, trucks, zapatillas y ropa para los que viven sobre cuatro ruedas. Envíos a todo el Perú.";

/**
 * Base para resolver las URLs absolutas de Open Graph.
 *
 * WhatsApp e Instagram necesitan una URL completa de la imagen: sin
 * `metadataBase`, `/logo.png` viajaría como ruta relativa y la vista previa
 * saldría en blanco. Se valida aquí para que una variable mal escrita no tumbe
 * el build con un error de `new URL()` sin contexto.
 */
function baseDelSitio(): URL {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;

  if (configurada) {
    try {
      return new URL(configurada);
    } catch {
      console.error(
        `[metadata] NEXT_PUBLIC_SITE_URL no es una URL válida ("${configurada}"). ` +
          "Se usa http://localhost:3000 y las vistas previas apuntarán ahí.",
      );
    }
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: baseDelSitio(),

  title: {
    template: `%s | ${NOMBRE}`,
    default: `${NOMBRE} Store`,
  },
  description: DESCRIPCION,

  applicationName: NOMBRE,
  keywords: [
    "skate",
    "skateboard",
    "tablas",
    "ruedas",
    "trucks",
    "zapatillas",
    "ropa urbana",
    "Perú",
    "Lima",
  ],

  openGraph: {
    type: "website",
    siteName: NOMBRE,
    locale: "es_PE",
    url: "/",
    title: `${NOMBRE} Store`,
    description: DESCRIPCION,
    images: [
      {
        // Relativa a `metadataBase`. El logo es cuadrado (500×500): en
        // WhatsApp se ve como miniatura, no como banner apaisado.
        url: "/logo.png",
        width: 500,
        height: 500,
        alt: NOMBRE,
      },
    ],
  },

  twitter: {
    card: "summary",
    title: `${NOMBRE} Store`,
    description: DESCRIPCION,
    images: ["/logo.png"],
  },

  // El panel y el checkout ya se marcan `noindex` en sus propios layouts.
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
     * `overflow-x-hidden` va en <html> y NO en <body>, a propósito.
     *
     * El overflow del elemento raíz se propaga al viewport, así que puesto aquí
     * recorta el scroll horizontal sin convertir a nadie en contenedor de
     * scroll. Puesto en <body>, en cambio, body sí pasa a ser contenedor de
     * scroll (al no ser `visible` en un eje, el otro pasa a `auto`), y entonces
     * el Navbar `sticky top-0` de la tienda se ancla al scrollport de body en
     * lugar de al viewport: dejaría de quedarse fijo al bajar.
     *
     * Es una red de seguridad, no el arreglo. Lo que desbordaba en el carrito
     * está corregido en su sitio; esto sólo evita que un descuadre futuro se
     * traduzca en una franja blanca a la derecha.
     */
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      {/* La barra de progreso ya no vive aquí: cada zona monta la suya con su
          propio color (negra en la tienda, neón en el panel), porque una única
          instancia global obligaría a elegir un color que se pierde sobre uno
          de los dos fondos. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
