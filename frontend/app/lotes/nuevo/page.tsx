"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, parseDosis, normalizeEstado } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { ArrowLeft, Plus, Trash2, CheckCircle2, Loader2, AlertTriangle } from "lucide-react"

interface InsumoForm { nombre: string; dosis: string; fecha: string }

interface Cooperativa { id: string; nombre: string; municipio: string }

interface AnalisisResultado {
  lote_id: string
  estado: string
  total_insumos_analizados: number
  insumos_sin_datos_lmr: string[]
  alertas: { insumo: string; tipo: string; detalle: string; fuente_normativa: string }[]
}

const cultivos = ["Tomate", "Pimiento", "Pepino", "Lechuga", "Zanahoria", "Cebolla", "Frutilla", "Melón", "Sandía", "Papa", "Maiz", "Soja", "Arroz"]

export default function NuevoLotePage() {
  const router = useRouter()
  const [cooperativas, setCooperativas] = useState<Cooperativa[]>([])
  const [resultado, setResultado] = useState<AnalisisResultado | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    cooperativa_id: "",
    cultivo: "",
    parcela: "",
    fechaSiembra: "",
    fechaCosecha: "",
    almacenamiento: "",
  })
  const [insumos, setInsumos] = useState<InsumoForm[]>([{ nombre: "", dosis: "", fecha: "" }])

  useEffect(() => {
    api.get<{ data: Cooperativa[] }>("/cooperativas/")
      .then((res) => setCooperativas(res.data ?? []))
      .catch(() => { /* silencioso si el backend no tiene cooperativas */ })
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const handleInsumoChange = (index: number, field: keyof InsumoForm, value: string) => {
    const next = [...insumos]
    next[index][field] = value
    setInsumos(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setApiError(null)
    try {
      const body = {
        cooperativa_id: formData.cooperativa_id || null,
        cultivo: formData.cultivo,
        parcela: formData.parcela || null,
        fecha_siembra: formData.fechaSiembra || null,
        fecha_cosecha: formData.fechaCosecha,
        almacenamiento: formData.almacenamiento || null,
        insumos: insumos
          .filter((i) => i.nombre.trim())
          .map((i) => ({
            nombre: i.nombre,
            dosis: parseDosis(i.dosis),
            fecha_aplicacion: i.fecha,
          })),
      }
      const res = await api.post<{ data: AnalisisResultado; error: string | null }>("/lotes/", body)
      if (res.error) throw new Error(res.error)
      setResultado(res.data)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Error al analizar el lote")
    } finally {
      setSubmitting(false)
    }
  }

  if (resultado) {
    const estadoNorm = normalizeEstado(resultado.estado)
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Volver a mis lotes
        </Link>
        <Card className={estadoNorm === "APTO" ? "border-[oklch(0.62_0.17_160)]" : estadoNorm === "OBSERVADO" ? "border-[oklch(0.75_0.15_85)]" : "border-[oklch(0.55_0.22_25)]"}>
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${estadoNorm === "APTO" ? "bg-[oklch(0.62_0.17_160)]/10" : "bg-[oklch(0.75_0.15_85)]/10"}`}>
              {estadoNorm === "APTO"
                ? <CheckCircle2 className="h-10 w-10 text-[oklch(0.62_0.17_160)]" />
                : <AlertTriangle className="h-10 w-10 text-[oklch(0.75_0.15_85)]" />}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Lote Analizado</h2>
              <p className="mt-2 text-muted-foreground">{resultado.total_insumos_analizados} insumo(s) evaluados contra la tabla LMR</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Resultado:</span>
              <StatusBadge estado={estadoNorm} size="lg" />
            </div>
            {resultado.alertas.length > 0 && (
              <div className="w-full space-y-2">
                {resultado.alertas.map((a, i) => (
                  <div key={i} className="rounded-lg bg-muted p-3">
                    <p className="font-medium text-sm">{a.tipo} — {a.insumo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.detalle}</p>
                  </div>
                ))}
              </div>
            )}
            {resultado.alertas.length === 0 && (
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">No se detectaron alertas. El lote cumple todos los requisitos.</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setResultado(null)}>Registrar otro lote</Button>
              <Button onClick={() => router.push(`/lotes/${resultado.lote_id}`)}>Ver detalle</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Volver a mis lotes
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Registrar Nuevo Lote</h1>
          <p className="text-muted-foreground">Ingresa la información del lote para generar su trazabilidad</p>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader><CardTitle>Información Básica</CardTitle><CardDescription>Datos generales del lote</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {cooperativas.length > 0 && (
              <div className="space-y-2">
                <Label>Cooperativa</Label>
                <Select value={formData.cooperativa_id} onValueChange={(v) => setFormData((p) => ({ ...p, cooperativa_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona tu cooperativa" /></SelectTrigger>
                  <SelectContent>
                    {cooperativas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre} — {c.municipio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cultivo</Label>
                <Select value={formData.cultivo} onValueChange={(v) => setFormData((p) => ({ ...p, cultivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un cultivo" /></SelectTrigger>
                  <SelectContent>{cultivos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcela">Parcela</Label>
                <Input id="parcela" name="parcela" placeholder="Ej: Parcela Norte A-12" value={formData.parcela} onChange={handleInputChange} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaSiembra">Fecha de Siembra</Label>
                <Input id="fechaSiembra" name="fechaSiembra" type="date" value={formData.fechaSiembra} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaCosecha">Fecha de Cosecha *</Label>
                <Input id="fechaCosecha" name="fechaCosecha" type="date" value={formData.fechaCosecha} onChange={handleInputChange} required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insumos */}
        <Card>
          <CardHeader><CardTitle>Insumos Aplicados</CardTitle><CardDescription>Fertilizantes, pesticidas y otros insumos utilizados</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {insumos.map((insumo, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label>Nombre del Insumo</Label>
                  <Input placeholder="Ej: Decis, Mancozeb, NPK 15-15-15" value={insumo.nombre} onChange={(e) => handleInsumoChange(index, "nombre", e.target.value)} />
                </div>
                <div className="w-full space-y-2 sm:w-36">
                  <Label>Dosis</Label>
                  <Input placeholder="Ej: 0.5 l/ha" value={insumo.dosis} onChange={(e) => handleInsumoChange(index, "dosis", e.target.value)} />
                </div>
                <div className="w-full space-y-2 sm:w-40">
                  <Label>Fecha de aplicación</Label>
                  <Input type="date" value={insumo.fecha} onChange={(e) => handleInsumoChange(index, "fecha", e.target.value)} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => insumos.length > 1 && setInsumos(insumos.filter((_, i) => i !== index))}
                  disabled={insumos.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => setInsumos([...insumos, { nombre: "", dosis: "", fecha: "" }])}>
              <Plus className="mr-2 h-4 w-4" />Agregar otro insumo
            </Button>
          </CardContent>
        </Card>

        {/* Almacenamiento */}
        <Card>
          <CardHeader><CardTitle>Condiciones de Almacenamiento</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="almacenamiento" placeholder="Ej: Cámara fría a 10°C, humedad relativa 85%" value={formData.almacenamiento} onChange={handleInputChange} rows={3} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" disabled={submitting || !formData.cultivo || !formData.fechaCosecha}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Analizando..." : "Analizar lote"}
          </Button>
        </div>
      </form>
    </div>
  )
}
