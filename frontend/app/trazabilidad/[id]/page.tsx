import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { Leaf, MapPin, Calendar, Droplets, BadgeCheck, Store, AlertTriangle } from "lucide-react"

interface PublicLote {
  lote_id: string
  cultivo: string
  parcela: string | null
  fecha_siembra: string | null
  fecha_cosecha: string
  almacenamiento: string | null
  estado: string
  cooperativa: string | null
  municipio: string | null
  insumos: { nombre: string; dosis: number; fecha_aplicacion: string }[]
  alertas: { tipo: string; detalle: string }[]
}

async function fetchLotePublico(id: string): Promise<PublicLote | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/public/lote/${id}`,
      { cache: "no-store" }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

function normalizeEstado(estado: string): "APTO" | "OBSERVADO" | "NO_APTO" {
  if (estado === "NO APTO" || estado === "NO_APTO") return "NO_APTO"
  if (estado === "OBSERVADO") return "OBSERVADO"
  return "APTO"
}

interface PageProps { params: Promise<{ id: string }> }

export default async function TrazabilidadPage({ params }: PageProps) {
  const { id } = await params
  const lote = await fetchLotePublico(id)
  if (!lote) notFound()

  const estadoNorm = normalizeEstado(lote.estado)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">TrazaAlimento</h1>
              <p className="text-xs text-muted-foreground">Trazabilidad verificada</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Estado del lote */}
        <Card className="overflow-hidden">
          <div className="bg-primary/10 px-6 py-8 text-center">
            <StatusBadge estado={estadoNorm} size="lg" />
            <h2 className="mt-4 text-2xl font-bold">{lote.lote_id.slice(0, 8).toUpperCase()}</h2>
            <p className="text-muted-foreground">{lote.cultivo}</p>
          </div>
          {lote.alertas.length > 0 && (
            <div className="border-t border-border bg-[oklch(0.75_0.15_85)]/10 px-6 py-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.6_0.15_85)]" />
                <div>
                  <p className="font-medium text-[oklch(0.4_0.1_85)]">
                    {lote.alertas.length} alerta{lote.alertas.length !== 1 ? "s" : ""} detectada{lote.alertas.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {lote.alertas.map((a, i) => (
                      <li key={i} className="text-sm text-[oklch(0.45_0.1_85)]">{a.tipo}: {a.detalle}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Cooperativa */}
        {lote.cooperativa && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-5 w-5 text-primary" />Cooperativa Productora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{lote.cooperativa}</p>
                    <Badge className="bg-primary text-primary-foreground">
                      <BadgeCheck className="mr-1 h-3 w-3" />Certificada
                    </Badge>
                  </div>
                  {lote.municipio && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />{lote.municipio}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalles de producción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Leaf className="h-5 w-5 text-primary" />Detalles de Producción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
              {lote.almacenamiento && (
                <div className="flex items-start gap-3">
                  <Droplets className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div><p className="text-sm font-medium text-muted-foreground">Almacenamiento</p><p>{lote.almacenamiento}</p></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Insumos */}
        {lote.insumos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insumos Aplicados</CardTitle>
              <CardDescription>Registro completo de fertilizantes y agroquímicos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lote.insumos.map((ins, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="font-medium">{ins.nombre}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Dosis: {ins.dosis}</span>
                      <span>Aplicado: {new Date(ins.fecha_aplicacion).toLocaleDateString("es-BO", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pb-8 text-center">
          <p className="text-sm text-muted-foreground">
            Información verificada por <span className="font-medium text-primary">TrazaAlimento</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Plataforma de trazabilidad alimentaria para cooperativas agrícolas de Santa Cruz, Bolivia
          </p>
        </div>
      </main>
    </div>
  )
}
