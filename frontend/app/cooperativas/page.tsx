"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { MapPin, BadgeCheck, ChevronRight, Store } from "lucide-react"

interface Cooperativa {
  id: string
  nombre: string
  municipio: string
  producto_principal: string | null
  contacto_email: string | null
}

const productosDisponibles = ["Tomate", "Pimiento", "Pepino", "Lechuga", "Zanahoria", "Cebolla", "Frutilla", "Melón", "Sandía"]

export default function CooperativasPage() {
  const [cooperativas, setCooperativas] = useState<Cooperativa[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos")
  const [filtroProducto, setFiltroProducto] = useState("todos")

  useEffect(() => {
    api.get<{ data: Cooperativa[] }>("/cooperativas/")
      .then((res) => setCooperativas(res.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const municipios = useMemo(() => [...new Set(cooperativas.map((c) => c.municipio))], [cooperativas])

  const filtradas = useMemo(() => cooperativas.filter((c) => {
    const matchMunicipio = filtroMunicipio === "todos" || c.municipio === filtroMunicipio
    const matchProducto = filtroProducto === "todos" || (c.producto_principal?.toLowerCase().includes(filtroProducto.toLowerCase()) ?? false)
    return matchMunicipio && matchProducto
  }), [cooperativas, filtroMunicipio, filtroProducto])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cooperativas Certificadas</h1>
        <p className="text-muted-foreground">Explora cooperativas agrícolas con trazabilidad verificada</p>
      </div>

      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Municipio</Label>
              <Select value={filtroMunicipio} onValueChange={setFiltroMunicipio}>
                <SelectTrigger><SelectValue placeholder="Todos los municipios" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los municipios</SelectItem>
                  {municipios.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={filtroProducto} onValueChange={setFiltroProducto}>
                <SelectTrigger><SelectValue placeholder="Todos los productos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los productos</SelectItem>
                  {productosDisponibles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtradas.length} cooperativa{filtradas.length !== 1 ? "s" : ""} encontrada{filtradas.length !== 1 ? "s" : ""}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((coop) => (
              <Link key={coop.id} href={`/cooperativas/${coop.id}`} className="group">
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader className="pb-3">
                    <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-primary/10">
                      <Store className="h-12 w-12 text-primary" />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{coop.nombre}</CardTitle>
                      <Badge className="shrink-0 bg-primary text-primary-foreground">
                        <BadgeCheck className="mr-1 h-3 w-3" />Certificada
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />{coop.municipio}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {coop.producto_principal && (
                      <Badge variant="secondary" className="text-xs">{coop.producto_principal}</Badge>
                    )}
                    <div className="mt-4 flex items-center justify-end text-sm text-muted-foreground group-hover:text-primary">
                      Ver detalles<ChevronRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {filtradas.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Store className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">No se encontraron cooperativas</p>
                  <p className="text-sm text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
