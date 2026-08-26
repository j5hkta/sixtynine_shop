import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Navegación del panel administrativo. Fuente única para el Sidebar y el Header. */
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
];

/**
 * `/admin` sólo se marca activo en coincidencia exacta; el resto de secciones
 * también se activan en sus rutas hijas (ej. `/admin/productos/nuevo`).
 */
export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Título de la sección actual, usado por el Header. */
export function getActiveNavLabel(pathname: string): string {
  return (
    adminNav.find((item) => isNavItemActive(item, pathname))?.label ?? "Admin"
  );
}
