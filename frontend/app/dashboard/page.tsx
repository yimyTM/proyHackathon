"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, normalizeEstado } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { Package, CheckCircle2, AlertTriangle, XCircle, Plus, ChevronRight, Leaf } from "lucide-react"

interface LoteResumen {
  lote_id: string
  cultivo: string
  parcela: string | null
  fecha_cosecha: string
  estado: string
  cooperativa_id: string | null
  cooperativa_nombre: string | null
  n_alertas: number
}

export default function DashboardPage() {
  const [lotes, setLotes] = useState<LoteResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ data: LoteResumen[] }>("/lotes/")
      .then((res) => setLotes(res.data ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalLotes = lotes.length
  const lotesAptos = lotes.filter((l) => normalizeEstado(l.estado) === "APTO").length
  const lotesObservados = lotes.filter((l) => normalizeEstado(l.estado) === "OBSERVADO").length
  const lotesNoAptos = lotes.filter((l) => normalizeEstado(l.estado) === "NO_APTO").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Lotes</h1>
          <p className="text-muted-foreground">Gestiona la trazabilidad de tus productos agrícolas</p>
        </div>
        <Button asChild>
          <Link href="/lotes/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Registrar nuevo lote
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Lotes</CardTitle>
                <Package className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalLotes}</div>
                <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lotes Aptos</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-[oklch(0.62_0.17_160)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[oklch(0.62_0.17_160)]">{lotesAptos}</div>
                <p className="text-xs text-muted-foreground">Listos para comercializar</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">En Observación</CardTitle>
                <AlertTriangle className="h-5 w-5 text-[oklch(0.75_0.15_85)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[oklch(0.75_0.15_85)]">{lotesObservados}</div>
                <p className="text-xs text-muted-foreground">Requieren atención</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">No Aptos</CardTitle>
                <XCircle className="h-5 w-5 text-[oklch(0.55_0.22_25)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[oklch(0.55_0.22_25)]">{lotesNoAptos}</div>
                <p className="text-xs text-muted-foreground">Con problemas detectados</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Lotes recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes Recientes</CardTitle>
          <CardDescription>Últimos lotes registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error} — asegurate que el backend esté corriendo en localhost:8000
            </div>
          ) : lotes.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Leaf className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">No hay lotes registrados</p>
                <p className="text-sm text-muted-foreground">Registrá tu primer lote para comenzar</p>
              </div>
              <Button asChild><Link href="/lotes/nuevo"><Plus className="mr-2 h-4 w-4" />Registrar lote</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              {lotes.map((lote) => (
                <Link
                  key={lote.lote_id}
                  href={`/lotes/${lote.lote_id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Leaf className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{lote.lote_id.slice(0, 8).toUpperCase()}</p>
                        <StatusBadge estado={normalizeEstado(lote.estado)} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {lote.cultivo} • {lote.cooperativa_nombre ?? "Sin cooperativa"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lote.n_alertas > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {lote.n_alertas} alerta{lote.n_alertas !== 1 ? "s" : ""}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
