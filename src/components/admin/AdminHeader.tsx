"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";

import { getActiveNavLabel } from "@/lib/admin-nav";

type AdminHeaderProps = {
  onMenuClick: () => void;
};

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-ink-line bg-ink/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="text-neutral-400 transition-colors hover:text-neon md:hidden"
        aria-label="Abrir navegación"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h2 className="text-sm font-bold tracking-[0.2em] text-white uppercase">
        {getActiveNavLabel(pathname)}
      </h2>

      <div className="ml-auto flex items-center gap-3">
        <label className="relative hidden sm:block">
          <span className="sr-only">Buscar</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Buscar..."
            className="w-44 border border-ink-line bg-ink-soft py-2 pr-3 pl-9 text-sm text-neutral-200 transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none lg:w-64"
          />
        </label>

        <button
          type="button"
          className="relative border border-ink-line bg-ink-soft p-2 text-neutral-400 transition-colors hover:border-neon hover:text-neon"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-neon"
            aria-hidden
          />
        </button>

        <div className="flex items-center gap-2 border-l border-ink-line pl-3">
          <span className="flex h-8 w-8 items-center justify-center bg-neon font-mono text-xs font-black text-ink">
            SN
          </span>
          <span className="hidden leading-tight lg:block">
            <span className="block text-xs font-bold text-white">Admin</span>
            <span className="block text-[10px] tracking-wider text-neutral-500 uppercase">
              Sixty Nine
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
