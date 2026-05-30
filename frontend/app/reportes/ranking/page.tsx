"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import BotonDescarga from "@/components/BotonDescarga"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Trophy } from "lucide-react"

interface RankingEntry {
  posicion: number
  cooperativa: string
  municipio: string
  total_lotes: number
  tasa_aprobacion: number
  ultimo_lote: string
}

interface RankingData { ranking: RankingEntry[]; periodo_analizado_dias: number }

export default function RankingPage() {
  const [data, setData] = useState<RankingData | null>(null)
  const [periodo, setPeriodo] = useState("90")
  const [municipio, setMunicipio] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ periodo_dias: periodo })
    if (municipio.trim()) params.append("municipio", municipio.trim())
    // ranking is public — use fetch directly (no API key needed)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/reportes/ranking?${params}`)
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [periodo, municipio])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ranking de Cooperativas</h1>
          <p className="text-muted-foreground">Clasificación por tasa de aprobación — vista pública</p>
        </div>
        <BotonDescarga endpoint={`/reportes/ranking/excel?periodo_dias=${periodo}${municipio ? `&municipio=${municipio}` : ""}`}
          filename="ranking_cooperativas.xlsx" />
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="60">Últimos 60 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
        <Input className="w-48" placeholder="Filtrar por municipio…" value={municipio}
          onChange={(e) => setMunicipio(e.target.value)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Clasificación</CardTitle>
          <CardDescription>Ordenadas por tasa de aprobación descendente</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data || data.ranking.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay datos disponibles para este período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {["#", "Cooperativa", "Municipio", "Lotes", "% Aprobación", "Último Lote"].map((h) => (
                      <th key={h} className="pb-3 text-left text-sm font-medium text-muted-foreground pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.ranking.map((r) => (
                    <tr key={r.posicion} className={r.posicion === 1 ? "bg-primary/5" : ""}>
                      <td className="py-3 pr-4 font-bold text-lg">{r.posicion}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.cooperativa}</span>
                          {r.posicion === 1 && <Badge className="bg-primary text-primary-foreground text-xs">Mejor certificada</Badge>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.municipio}</td>
                      <td className="py-3 pr-4">{r.total_lotes}</td>
                      <td className="py-3 pr-4 font-bold text-[oklch(0.62_0.17_160)]">{r.tasa_aprobacion}%</td>
                      <td className="py-3 text-muted-foreground text-sm">
                        {r.ultimo_lote ? new Date(r.ultimo_lote).toLocaleDateString("es-BO") : "—"}
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
