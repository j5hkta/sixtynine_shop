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
      {/* La barra de progreso ya no vive aquí: cada zona monta la suya con su
          propio color (negra en la tienda, neón en el panel), porque una única
          instancia global obligaría a elegir un color que se pierde sobre uno
          de los dos fondos. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
