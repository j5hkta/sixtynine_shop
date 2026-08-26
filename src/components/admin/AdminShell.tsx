"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

/**
 * Carcasa del panel: mantiene el estado del drawer en móvil y compone
 * Sidebar + Header alrededor del contenido de cada página.
 *
 * `children` llega desde `src/app/admin/layout.tsx` (Server Component), así que
 * las páginas del panel siguen renderizándose en el servidor.
 */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el drawer al navegar a otra sección (incluido atrás/adelante del
  // navegador). Se ajusta durante el render en lugar de en un efecto para no
  // provocar un render en cascada.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200">
      {/* Fondo oscurecido detrás del drawer en móvil */}
      <div
        onClick={() => setSidebarOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="md:pl-64">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
