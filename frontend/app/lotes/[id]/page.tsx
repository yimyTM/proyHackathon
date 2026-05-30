"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { api, normalizeEstado } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { QRModal } from "@/src/components/lotes/qr-modal"
import { ArrowLeft, QrCode, Share2, Calendar, MapPin, Leaf, Droplets, AlertTriangle, Package } from "lucide-react"

interface LoteDetalle {
  lote_id: string
  cultivo: string
  parcela: string | null
  fecha_siembra: string | null
  fecha_cosecha: string
  almacenamiento: string | null
  estado: string
  cooperativa_id: string | null
  insumos: { nombre: string; dosis: number; fecha_aplicacion: string }[]
  alertas: { insumo: string; tipo: string; detalle: string; fuente_normativa: string; dias_requeridos: number | null; dias_transcurridos: number | null }[]
}

interface PageProps { params: Promise<{ id: string }> }

export default function LoteDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [lote, setLote] = useState<LoteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    api.get<{ data: LoteDetalle }>(`/lotes/${id}`)
      .then((res) => setLote(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = async () => {
    const url = `${window.location.origin}/trazabilidad/${id}`
    if (navigator.share) {
      try { await navigator.share({ title: `Lote ${id}`, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      alert("Enlace copiado al portapapeles")
    }
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
    </div>
  )

  if (error || !lote) return (
    <div className="space-y-4">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Volver
      </Link>
      <Card><CardContent className="pt-6 text-destructive">{error ?? "Lote no encontrado"}</CardContent></Card>
    </div>
  )

  const estadoNorm = normalizeEstado(lote.estado)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Volver a mis lotes
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{lote.lote_id.slice(0, 8).toUpperCase()}</h1>
              <StatusBadge estado={estadoNorm} size="lg" />
            </div>
            <p className="text-muted-foreground">{lote.cultivo}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowQR(true)}>
              <QrCode className="mr-2 h-4 w-4" />Ver QR
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />Compartir
            </Button>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {lote.alertas.length > 0 && (
        <Card className="border-[oklch(0.75_0.15_85)] bg-[oklch(0.75_0.15_85)]/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[oklch(0.4_0.1_85)]">
              <AlertTriangle className="h-5 w-5" />Alertas Detectadas ({lote.alertas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lote.alertas.map((alerta, i) => (
              <div key={i} className="rounded-lg bg-background p-3 border border-[oklch(0.75_0.15_85)]/30">
                <p className="font-medium text-foreground">{alerta.tipo}</p>
                <p className="text-sm text-muted-foreground">{alerta.detalle}</p>
                {alerta.dias_requeridos != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Carencia: {alerta.dias_transcurridos}d transcurridos / {alerta.dias_requeridos}d requeridos • {alerta.fuente_normativa}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />Información del Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Leaf className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div><p className="text-sm font-medium text-muted-foreground">Cultivo</p><p>{lote.cultivo}</p></div>
            </div>
            {lote.parcela && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div><p className="text-sm font-medium text-muted-foreground">Parcela</p><p>{lote.parcela}</p></div>
              </div>
            )}
            {lote.fecha_siembra && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Siembra</p>
                  <p>{new Date(lote.fecha_siembra).toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Cosecha</p>
                <p>{new Date(lote.fecha_cosecha).toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />Condiciones de Almacenamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{lote.almacenamiento ?? "No especificado"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Insumos */}
      <Card>
        <CardHeader>
          <CardTitle>Insumos Aplicados</CardTitle>
          <CardDescription>Registro de fertilizantes, pesticidas y otros insumos utilizados</CardDescription>
        </CardHeader>
        <CardContent>
          {lote.insumos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin insumos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Insumo</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Dosis</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Fecha de Aplicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lote.insumos.map((ins, i) => (
                    <tr key={i}>
                      <td className="py-3">{ins.nombre}</td>
                      <td className="py-3">{ins.dosis}</td>
                      <td className="py-3">{new Date(ins.fecha_aplicacion).toLocaleDateString("es-BO", { year: "numeric", month: "short", day: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <QRModal isOpen={showQR} onClose={() => setShowQR(false)} loteCodigo={lote.lote_id.slice(0, 8).toUpperCase()} loteId={lote.lote_id} />
    </div>
  )
}
