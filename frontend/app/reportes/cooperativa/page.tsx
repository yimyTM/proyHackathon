"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import BotonDescarga from "@/components/BotonDescarga"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react"

interface Cooperativa { id: string; nombre: string }
interface ReporteData {
  resumen: Record<string, number>
  insumos_problematicos: { insumo: string; alertas: number }[]
  tendencia_mensual: { mes: string; APTO: number; OBSERVADO: number; NO_APTO: number }[]
}

export default function ReporteCooperativaPage() {
  const [cooperativas, setCooperativas] = useState<Cooperativa[]>([])
  const [coopId, setCoopId] = useState("")
  const [periodo, setPeriodo] = useState("30")
  const [data, setData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<{ data: Cooperativa[] }>("/cooperativas/")
      .then((r) => { setCooperativas(r.data ?? []); if (r.data?.[0]) setCoopId(r.data[0].id) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!coopId) return
    setLoading(true)
    api.get<{ data: ReporteData }>(`/reportes/cooperativa/${coopId}?periodo_dias=${periodo}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [coopId, periodo])

  const total = data ? Object.values(data.resumen).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporte de Inocuidad</h1>
          <p className="text-muted-foreground">Estado de los lotes de tu cooperativa</p>
        </div>
        {coopId && (
          <BotonDescarga endpoint={`/reportes/cooperativa/${coopId}/excel?periodo_dias=${periodo}`}
            filename="reporte_inocuidad.xlsx" label="Descargar Excel" />
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Select value={coopId} onValueChange={setCoopId}>
            <SelectTrigger><SelectValue placeholder="Selecciona cooperativa" /></SelectTrigger>
            <SelectContent>{cooperativas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="60">Últimos 60 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !data || total === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay lotes registrados en este período</CardContent></Card>
      ) : (
        <>
          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aptos</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-[oklch(0.62_0.17_160)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[oklch(0.62_0.17_160)]">{data.resumen["APTO"] ?? 0}</div>
                <p className="text-xs text-muted-foreground">{total > 0 ? Math.round(((data.resumen["APTO"] ?? 0) / total) * 100) : 0}% del total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Observados</CardTitle>
                <AlertTriangle className="h-5 w-5 text-[oklch(0.75_0.15_85)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[oklch(0.75_0.15_85)]">{data.resumen["OBSERVADO"] ?? 0}</div>
                <p className="text-xs text-muted-foreground">{total > 0 ? Math.round(((data.resumen["OBSERVADO"] ?? 0) / total) * 100) : 0}% del total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">No Aptos</CardTitle>
                <XCircle className="h-5 w-5 text-[oklch(0.55_0.22_25)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[oklch(0.55_0.22_25)]">{data.resumen["NO APTO"] ?? 0}</div>
                <p className="text-xs text-muted-foreground">{total > 0 ? Math.round(((data.resumen["NO APTO"] ?? 0) / total) * 100) : 0}% del total</p>
              </CardContent>
            </Card>
          </div>

          {/* Tendencia */}
          {data.tendencia_mensual.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Tendencia Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.tendencia_mensual}>
                    <XAxis dataKey="mes" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="APTO" fill="oklch(0.62 0.17 160)" />
                    <Bar dataKey="OBSERVADO" fill="oklch(0.75 0.15 85)" />
                    <Bar dataKey="NO_APTO" fill="oklch(0.55 0.22 25)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Insumos problemáticos */}
          {data.insumos_problematicos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Insumos con Alertas</CardTitle>
                <CardDescription>Insumos que generaron más observaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead><tr className="border-b"><th className="pb-2 text-left text-sm font-medium text-muted-foreground">Insumo</th><th className="pb-2 text-right text-sm font-medium text-muted-foreground">Alertas</th></tr></thead>
                  <tbody className="divide-y">
                    {data.insumos_problematicos.map((ins, i) => (
                      <tr key={i}><td className="py-2">{ins.insumo}</td><td className="py-2 text-right font-medium">{ins.alertas}</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
