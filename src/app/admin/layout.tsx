import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    template: "%s | Admin - Sixty Nine",
    default: "Panel Administrativo | Sixty Nine",
  },
  description:
    "Panel administrativo de Sixty Nine Skate & Apparel Store: productos, pedidos y clientes.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  // `src/proxy.ts` ya filtra a los visitantes sin sesión, pero la doc de Next
  // advierte que el proxy es sólo una comprobación optimista: la verificación
  // que realmente protege el panel es esta, en el servidor.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
