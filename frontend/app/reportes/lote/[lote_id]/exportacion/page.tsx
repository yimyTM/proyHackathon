"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import BotonDescarga from "@/components/BotonDescarga"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { ArrowLeft, FileText } from "lucide-react"

interface InsumoFicha {
  nombre_comercial: string
  principio_activo: string
  dosis_aplicada: number
  dosis_maxima: number | null
  fecha_aplicacion: string
  dias_hasta_cosecha: number
  carencia_requerida: number | null
  cumple_carencia: string
  cumple_dosis: string
}

interface FichaData {
  lote: { id: string; cultivo: string; parcela: string | null; fecha_cosecha: string; estado: string; cooperativa: string }
  tabla_insumos: InsumoFicha[]
  normativa: string
  generado_en: string
}

function normalizeEstado(e: string): "APTO" | "OBSERVADO" | "NO_APTO" {
  if (e === "NO APTO" || e === "NO_APTO") return "NO_APTO"
  if (e === "OBSERVADO") return "OBSERVADO"
  return "APTO"
}

interface PageProps { params: Promise<{ lote_id: string }> }

export default function FichaExportacionPage({ params }: PageProps) {
  const { lote_id } = use(params)
  const [data, setData] = useState<FichaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ data: FichaData }>(`/reportes/lote/${lote_id}/exportacion`)
      .then((r) => setData(r.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [lote_id])

  if (loading) return (
    <div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-48 w-full" /></div>
  )

  if (error || !data) return (
    <div className="space-y-4">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Volver
      </Link>
      <p className="text-destructive">{error ?? "No se pudo cargar la ficha"}</p>
    </div>
  )

  const { lote, tabla_insumos, normativa } = data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Volver
          </Link>
          <h1 className="text-2xl font-bold">Ficha de Exportación</h1>
          <p className="text-muted-foreground">{lote.cooperativa} — Lote {lote.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex gap-2">
          <BotonDescarga endpoint={`/reportes/lote/${lote_id}/excel`} filename={`ficha_${lote_id}.xlsx`} label="Excel" />
          <BotonDescarga endpoint={`/reportes/lote/${lote_id}/pdf`} filename={`ficha_${lote_id}.pdf`} label="PDF" />
        </div>
      </div>

      {/* Estado */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-bold text-lg">{lote.cultivo} — {lote.parcela ?? "Sin parcela"}</p>
                <p className="text-sm text-muted-foreground">Cosecha: {new Date(lote.fecha_cosecha).toLocaleDateString("es-BO")}</p>
              </div>
            </div>
            <StatusBadge estado={normalizeEstado(lote.estado)} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de insumos */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla de Insumos</CardTitle>
          <CardDescription>{normativa}</CardDescription>
        </CardHeader>
        <CardContent>
          {tabla_insumos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Este lote no tiene insumos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Insumo", "Principio Activo", "Dosis Aplicada", "Dosis Máx.", "F. Aplicación", "Días Cosecha", "Carencia", "✓ Carencia", "✓ Dosis"].map((h) => (
                      <th key={h} className="pb-3 text-left font-medium text-muted-foreground pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tabla_insumos.map((ins, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 font-medium">{ins.nombre_comercial}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{ins.principio_activo}</td>
                      <td className="py-2 pr-3">{ins.dosis_aplicada}</td>
                      <td className="py-2 pr-3">{ins.dosis_maxima ?? "—"}</td>
                      <td className="py-2 pr-3">{new Date(ins.fecha_aplicacion).toLocaleDateString("es-BO")}</td>
                      <td className="py-2 pr-3">{ins.dias_hasta_cosecha}</td>
                      <td className="py-2 pr-3">{ins.carencia_requerida ?? "—"}</td>
                      <td className={`py-2 pr-3 font-bold text-base ${ins.cumple_carencia === "✓" ? "text-[oklch(0.62_0.17_160)]" : ins.cumple_carencia === "✗" ? "text-[oklch(0.55_0.22_25)]" : "text-muted-foreground"}`}>
                        {ins.cumple_carencia}
                      </td>
                      <td className={`py-2 font-bold text-base ${ins.cumple_dosis === "✓" ? "text-[oklch(0.62_0.17_160)]" : ins.cumple_dosis === "✗" ? "text-[oklch(0.55_0.22_25)]" : "text-muted-foreground"}`}>
                        {ins.cumple_dosis}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
