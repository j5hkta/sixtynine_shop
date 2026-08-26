"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, X } from "lucide-react";

import { adminNav, isNavItemActive } from "@/lib/admin-nav";

type AdminSidebarProps = {
  /** Sólo aplica en móvil: en `md+` el sidebar es fijo y siempre visible. */
  open: boolean;
  onClose: () => void;
};

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-line bg-ink transition-transform duration-300 ease-out md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Navegación del panel administrativo"
    >
      {/* Marca */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-line px-5">
        <span className="flex h-9 w-9 items-center justify-center bg-neon font-mono text-sm font-black text-ink">
          69
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-black tracking-widest text-white uppercase">
            Sixty Nine
          </span>
          <span className="block text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
            Skate &amp; Apparel
          </span>
        </span>

        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-neutral-500 transition-colors hover:text-neon md:hidden"
          aria-label="Cerrar navegación"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <p className="px-3 pb-3 text-[10px] font-bold tracking-[0.2em] text-neutral-600 uppercase">
          Gestión
        </p>

        <ul className="space-y-1">
          {adminNav.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors ${
                    active
                      ? "bg-neon/10 text-neon"
                      : "text-neutral-400 hover:bg-white/5 hover:text-neon"
                  }`}
                >
                  {/* Barra indicadora de sección activa */}
                  <span
                    className={`absolute inset-y-0 left-0 w-0.5 bg-neon transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden
                  />
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pie */}
      <div className="shrink-0 border-t border-ink-line p-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase transition-colors hover:text-neon"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          Ver tienda
        </Link>
      </div>
    </aside>
  );
}
