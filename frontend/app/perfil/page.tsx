"use client"

import { useAuth } from "@/src/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Building2, LogOut } from "lucide-react"

export default function PerfilPage() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Información de tu cuenta
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de Usuario</CardTitle>
          <CardDescription>
            Información básica de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">{user.name}</p>
              <Badge variant="secondary" className="mt-1 capitalize">
                {user.role === "productor" ? "Productor" : "Comprador"}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Correo electrónico</p>
                <p className="text-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo de cuenta</p>
                <p className="text-foreground capitalize">
                  {user.role === "productor"
                    ? "Productor / Cooperativa"
                    : "Comprador"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Nota:</span> Esta es una versión demo de TrazaAlimento.
            La información mostrada es de ejemplo y no representa datos reales de producción.
          </p>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={logout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Cerrar sesión
      </Button>
    </div>
  )
}
