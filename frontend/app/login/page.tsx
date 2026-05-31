"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Leaf, Tractor, ShoppingCart } from "lucide-react";
import type { UserRole } from "@/src/data/mock";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("productor");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - accepts any credentials
    login(
      email ||
        (role === "productor" ? "cooperativa@demo.com" : "comprador@demo.com"),
      role,
    );
    router.push(role === "productor" ? "/dashboard" : "/cooperativas");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Leaf className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">TrazaTech</h1>
          <p className="text-sm text-muted-foreground">
            Trazabilidad alimentaria
          </p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa a tu cuenta para gestionar la trazabilidad de tus productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role selection */}
            <div className="space-y-3">
              <Label>Tipo de usuario</Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="productor"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-input p-4 transition-colors hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="productor"
                    id="productor"
                    className="sr-only"
                  />
                  <Tractor className="h-8 w-8 text-primary" />
                  <span className="font-medium">Productor</span>
                  <span className="text-center text-xs text-muted-foreground">
                    Registra y gestiona lotes
                  </span>
                </Label>
                <Label
                  htmlFor="comprador"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-input p-4 transition-colors hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="comprador"
                    id="comprador"
                    className="sr-only"
                  />
                  <ShoppingCart className="h-8 w-8 text-primary" />
                  <span className="font-medium">Comprador</span>
                  <span className="text-center text-xs text-muted-foreground">
                    Explora cooperativas
                  </span>
                </Label>
              </RadioGroup>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder={
                  role === "productor"
                    ? "cooperativa@demo.com"
                    : "comprador@demo.com"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Cualquier contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Demo: cualquier credencial funciona
              </p>
            </div>

            <Button type="submit" className="w-full">
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Plataforma de trazabilidad para cooperativas agrícolas de Santa Cruz,
        Bolivia
      </p>
    </div>
  );
}
