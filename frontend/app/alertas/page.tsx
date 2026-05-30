"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertTriangle, MapPin, Calendar, CheckCircle2, AlertCircle } from "lucide-react"

interface AlertaSanitaria {
  id: string
  zona: string
  tipo_patron: string
  lotes_involucrados: string[]
  insumo_recurrente: string | null
  periodo_analizado_dias: number
  nivel: string
  recomendacion_automatica: string | null
  created_at: string | null
}

const nivelLabel = (nivel: string) => ({ informativa: "Informativa", preventiva: "Preventiva", critica: "Crítica" }[nivel] ?? nivel)

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaSanitaria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: AlertaSanitaria[] }>("/alertas/")
      .then((res) => setAlertas(res.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const activas = alertas.filter((a) => a.nivel !== "informativa")
  const informativas = alertas.filter((a) => a.nivel === "informativa")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alertas Sanitarias</h1>
        <p className="text-muted-foreground">Información sobre alertas fitosanitarias detectadas en la región</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
            <AlertCircle className="h-5 w-5 text-[oklch(0.75_0.15_85)]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[oklch(0.75_0.15_85)]">{loading ? "—" : activas.length}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informativas</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-[oklch(0.62_0.17_160)]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[oklch(0.62_0.17_160)]">{loading ? "—" : informativas.length}</div>
            <p className="text-xs text-muted-foreground">Solo para seguimiento</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : alertas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-12 w-12 text-[oklch(0.62_0.17_160)]" />
            <div className="text-center">
              <p className="font-medium">No hay alertas sanitarias</p>
              <p className="text-sm text-muted-foreground">La región se encuentra libre de alertas. Usa POST /alertas/analizar para detectar patrones.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[oklch(0.75_0.15_85)]" />Alertas Detectadas
            </CardTitle>
            <CardDescription>Patrones detectados por el motor de análisis</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {alertas.map((alerta) => (
                <AccordionItem
                  key={alerta.id}
                  value={alerta.id}
                  className="rounded-lg border border-[oklch(0.75_0.15_85)]/30 bg-[oklch(0.75_0.15_85)]/5 px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-start gap-3 text-left">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.75_0.15_85)]" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{alerta.tipo_patron}</span>
                          <Badge variant="secondary" className="bg-[oklch(0.75_0.15_85)] text-[oklch(0.3_0.1_85)]">
                            {nivelLabel(alerta.nivel)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Zona: {alerta.zona}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <div className="ml-8 space-y-3">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-4 w-4" />{alerta.zona}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-4 w-4" />Período: {alerta.periodo_analizado_dias} días
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Lotes involucrados: {alerta.lotes_involucrados.length}
                        {alerta.insumo_recurrente && ` • Insumo: ${alerta.insumo_recurrente}`}
                      </p>
                      {alerta.recomendacion_automatica && (
                        <div>
                          <p className="mb-1 text-sm font-medium">Recomendación:</p>
                          <p className="text-sm text-muted-foreground">{alerta.recomendacion_automatica}</p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
