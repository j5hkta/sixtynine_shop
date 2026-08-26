import type { Metadata } from "next";

import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: {
    template: "%s | Admin - Sixty Nine",
    default: "Panel Administrativo | Sixty Nine",
  },
  description:
    "Panel administrativo de Sixty Nine Skate & Apparel Store: productos, pedidos y clientes.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
