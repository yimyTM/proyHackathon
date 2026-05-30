"use client"

import { useAuth } from "@/src/contexts/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Public routes that don't need authentication
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname.startsWith("/trazabilidad/")

  useEffect(() => {
    if (!isAuthenticated && !isPublicRoute) {
      router.push("/login")
    }
  }, [isAuthenticated, isPublicRoute, router])

  // Show content without shell for public routes
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
