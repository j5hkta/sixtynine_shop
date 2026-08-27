import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Sixty Nine",
    default: "Sixty Nine Skate & Apparel Store",
  },
  description:
    "Tablas, ruedas, zapatillas y ropa para los que viven sobre cuatro ruedas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Barra de progreso en cada navegación del router. Va en el layout
            raíz para cubrir tienda, panel y login con una sola instancia.
            Trae su propio "use client", así que este layout sigue siendo
            Server Component. */}
        <NextTopLoader
          color="#FFE600"
          height={3}
          showSpinner={false}
          shadow="0 0 12px #FFE600, 0 0 5px #FFE600"
          easing="ease"
          speed={250}
        />
        {children}
      </body>
    </html>
  );
}
