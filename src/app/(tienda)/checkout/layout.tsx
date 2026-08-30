import type { Metadata } from "next";

/** `page.tsx` es Client Component y no puede exportar `metadata`. */
export const metadata: Metadata = {
  title: "Checkout",
  description: "Completa tus datos para cerrar el pedido por WhatsApp.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: LayoutProps<"/checkout">) {
  return children;
}
