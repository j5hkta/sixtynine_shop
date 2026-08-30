import type { Metadata } from "next";

/**
 * Layout mínimo cuyo único cometido es aportar metadata: `page.tsx` es un
 * Client Component y los Client Components no pueden exportar `metadata`.
 */
export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los artículos de tu carrito antes de pagar.",
  robots: { index: false, follow: false },
};

export default function CarritoLayout({
  children,
}: LayoutProps<"/carrito">) {
  return children;
}
