"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { api, normalizeEstado } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { ArrowLeft, MapPin, Mail, BadgeCheck, Store, Leaf, Eye } from "lucide-react"

interface Cooperativa { id: string; nombre: string; municipio: string; producto_principal: string | null; contacto_email: string | null }
interface LoteResumen { lote_id: string; cultivo: string; fecha_cosecha: string; estado: string; n_alertas: number }

interface PageProps { params: Promise<{ id: string }> }

export default function CooperativaDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [coop, setCoop] = useState<Cooperativa | null>(null)
  const [lotes, setLotes] = useState<LoteResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ data: Cooperativa }>(`/cooperativas/${id}`),
      api.get<{ data: LoteResumen[] }>(`/cooperativas/${id}/lotes`),
    ])
      .then(([coopRes, lotesRes]) => {
        setCoop(coopRes.data)
        setLotes(lotesRes.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!coop) return (
    <div className="space-y-4">
      <Link href="/cooperativas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Volver al catálogo
      </Link>
      <Card><CardContent className="pt-6 text-destructive">Cooperativa no encontrada</CardContent></Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <Link href="/cooperativas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Volver al catálogo
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Store className="h-16 w-16 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold">{coop.nombre}</h1>
                  <Badge className="bg-primary text-primary-foreground">
                    <BadgeCheck className="mr-1 h-3 w-3" />Certificada
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />{coop.municipio}
                </div>
                {coop.contacto_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />{coop.contacto_email}
                  </div>
                )}
              </div>
              {coop.producto_principal && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Producto principal</p>
                  <Badge variant="secondary">{coop.producto_principal}</Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Disponibles</CardTitle>
          <CardDescription>Lotes de producción con trazabilidad verificada</CardDescription>
        </CardHeader>
        <CardContent>
          {lotes.length > 0 ? (
            <div className="space-y-3">
              {lotes.map((lote) => (
                <div key={lote.lote_id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Leaf className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lote.lote_id.slice(0, 8).toUpperCase()}</p>
                        <StatusBadge estado={normalizeEstado(lote.estado)} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {lote.cultivo} • Cosecha: {new Date(lote.fecha_cosecha).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/trazabilidad/${lote.lote_id}`}>
                      <Eye className="mr-2 h-4 w-4" />Ver trazabilidad
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <Leaf className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">No hay lotes disponibles</p>
                <p className="text-sm text-muted-foreground">Esta cooperativa aún no tiene lotes registrados</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
