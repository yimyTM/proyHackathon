"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import BotonDescarga from "@/components/BotonDescarga"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"

interface Zona {
  municipio: string
  total_lotes: number
  aptos: number
  observados: number
  no_aptos: number
  tasa_aprobacion: number
}

interface ReporteZonasData {
  zonas: Zona[]
  periodo_analizado_dias: number
  generado_en: string
}

function nivelBadge(tasa: number) {
  if (tasa >= 80) return <Badge className="bg-[oklch(0.62_0.17_160)] text-white">Bajo riesgo</Badge>
  if (tasa >= 50) return <Badge className="bg-[oklch(0.75_0.15_85)] text-[oklch(0.3_0.1_85)]">Riesgo medio</Badge>
  return <Badge className="bg-[oklch(0.55_0.22_25)] text-white">Alto riesgo</Badge>
}

export default function ReporteZonasPage() {
  const [data, setData] = useState<ReporteZonasData | null>(null)
  const [periodo, setPeriodo] = useState("60")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get<{ data: ReporteZonasData }>(`/reportes/zonas?periodo_dias=${periodo}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [periodo])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa de Riesgo por Zona</h1>
          <p className="text-muted-foreground">Tasa de aprobación por municipio</p>
        </div>
        <BotonDescarga endpoint={`/reportes/zonas/excel?periodo_dias=${periodo}`} filename="mapa_riesgo_zonas.xlsx" />
      </div>

      <div className="flex items-center gap-4">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="60">Últimos 60 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Datos basados en registros de cooperativas en TrazaAlimento</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Municipios</CardTitle>
          <CardDescription>Ordenados por tasa de aprobación (mayor a menor)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data || data.zonas.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay lotes registrados en este período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {["Municipio", "Total", "Aptos", "Observados", "No Aptos", "% Aprobación", "Nivel"].map((h) => (
                      <th key={h} className="pb-3 text-left text-sm font-medium text-muted-foreground pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.zonas.map((z, i) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 font-medium">{z.municipio}</td>
                      <td className="py-3 pr-4">{z.total_lotes}</td>
                      <td className="py-3 pr-4 text-[oklch(0.62_0.17_160)]">{z.aptos}</td>
                      <td className="py-3 pr-4 text-[oklch(0.75_0.15_85)]">{z.observados}</td>
                      <td className="py-3 pr-4 text-[oklch(0.55_0.22_25)]">{z.no_aptos}</td>
                      <td className="py-3 pr-4 font-bold">{z.tasa_aprobacion}%</td>
                      <td className="py-3">{nivelBadge(z.tasa_aprobacion)}</td>
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
