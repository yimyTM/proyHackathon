"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/src/contexts/auth-context"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  AlertTriangle,
  User,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: ("productor" | "comprador")[]
}

const navItems: NavItem[] = [
  {
    label: "Lotes",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["productor"],
  },
  {
    label: "Registrar",
    href: "/lotes/nuevo",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["productor"],
  },
  {
    label: "Catálogo",
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
    label: "Perfil",
    href: "/perfil",
    icon: <User className="h-5 w-5" />,
    roles: ["productor", "comprador"],
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around py-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
