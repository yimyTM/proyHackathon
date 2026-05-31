"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  AlertTriangle,
  User,
  LogOut,
  Leaf,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: ("productor" | "comprador")[];
}

const navItems: NavItem[] = [
  {
    label: "Mis Lotes",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["productor"],
  },
  {
    label: "Registrar Lote",
    href: "/lotes/nuevo",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["productor"],
  },
  {
    label: "Cooperativas",
    href: "/cooperativas",
    icon: <Store className="h-5 w-5" />,
    roles: ["comprador"],
  },
  {
    label: "Alertas",
    href: "/alertas",
    icon: <AlertTriangle className="h-5 w-5" />,
    roles: ["productor", "comprador"],
  },
  {
    label: "Mi inocuidad",
    href: "/reportes/cooperativa",
    icon: <BarChart2 className="h-5 w-5" />,
    roles: ["productor"],
  },
  {
    label: "Mapa de riesgo",
    href: "/reportes/zonas",
    icon: <BarChart2 className="h-5 w-5" />,
    roles: ["comprador"],
  },
  {
    label: "Ranking",
    href: "/reportes/ranking",
    icon: <BarChart2 className="h-5 w-5" />,
    roles: ["comprador"],
  },
  {
    label: "Mi Perfil",
    href: "/perfil",
    icon: <User className="h-5 w-5" />,
    roles: ["productor", "comprador"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false,
  );

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">
          TrazaTech
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-sidebar-foreground">
            {user?.name}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
