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
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/src/components/ui/status-badge"
import { useVoiceInput } from "@/hooks/use-voice-input"
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Loader2, AlertTriangle,
  Mic, MicOff, HelpCircle,
} from "lucide-react"

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

// ─── Parseo de fechas ──────────────────────────────────────────────────────────

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
}

const NUMEROS: Record<string, string> = {
  primero: "01", uno: "01", dos: "02", tres: "03", cuatro: "04", cinco: "05",
  seis: "06", siete: "07", ocho: "08", nueve: "09", diez: "10", once: "11",
  doce: "12", trece: "13", catorce: "14", quince: "15",
  "dieciséis": "16", dieciseis: "16", diecisiete: "17", dieciocho: "18",
  diecinueve: "19", veinte: "20", veintiuno: "21",
  "veintidós": "22", veintidos: "22", "veintitrés": "23", veintitres: "23",
  veinticuatro: "24", veinticinco: "25", "veintiséis": "26", veintiseis: "26",
  veintisiete: "27", veintiocho: "28", veintinueve: "29",
  treinta: "30", "treinta y uno": "31",
}

function parseDate(fragment: string): string {
  const clean = fragment.replace(/^(?:el|la|los|del?|al)\s+/i, "").trim()
  if (!clean) return ""

  // ISO: 2026-06-15
  const iso = clean.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // DD/MM/YYYY o DD-MM-YYYY
  const numeric = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`

  const t = clean.toLowerCase()
    .replace(/\bdel\b/g, "de")
    .replace(/\bal\b/g, "de")

  let day = ""
  let month = ""
  let year = new Date().getFullYear().toString()

  // Mes — busca primero (no depende del orden)
  for (const [mes, num] of Object.entries(MESES)) {
    if (t.includes(mes)) { month = num; break }
  }

  // Día — intenta número primero, luego palabra
  const numDay = t.match(/\b(\d{1,2})\b/)
  if (numDay && parseInt(numDay[1]) <= 31) {
    day = numDay[1].padStart(2, "0")
  } else {
    // Ordena por longitud descendente para evitar matches parciales
    const sorted = Object.entries(NUMEROS).sort((a, b) => b[0].length - a[0].length)
    for (const [word, num] of sorted) {
      if (t.includes(word)) { day = num; break }
    }
  }

  // Año
  const yearMatch = t.match(/\b(20\d{2})\b/)
  if (yearMatch) year = yearMatch[1]

  if (day && month) return `${year}-${month}-${day}`
  return ""
}

// ─── Parseo del transcript por segmentos ───────────────────────────────────────

type ParsedFields = Partial<{
  cultivo: string; parcela: string; fechaSiembra: string
  fechaCosecha: string; almacenamiento: string
}>

function capitalizar(s: string) {
  return s.replace(/^[\s,.:;]+|[\s,.:;]+$/g, "")
    .replace(/^./, (c) => c.toUpperCase())
}

/** Palabras clave de campos principales */
const FIELD_KEYWORDS = [
  { tag: "siembra",        re: /\bfecha\s+de\s+siembra\b|\bsiembra\b/i },
  { tag: "cosecha",        re: /\bfecha\s+de\s+cosecha\b|\bcosecha\b/i },
  { tag: "almacenamiento", re: /\balmacen(?:amiento)?\b/i },
  { tag: "parcela",        re: /\bparcela\b/i },
  { tag: "cultivo",        re: /\bcultivo\b/i },
  // "insumo" se incluye solo como delimitador de límite, no como campo
  { tag: "insumo",         re: /\binsumo\b/i },
]

// Palabras que NO son nombres de productos (se filtran del rawNombre)
const PRODUCT_SKIP = new Set([
  "de","el","la","del","al","y","a","con","los","las","un","una",
  "enero","febrero","marzo","abril","mayo","junio","julio","agosto",
  "septiembre","octubre","noviembre","diciembre",
  "cultivo","parcela","siembra","cosecha","almacenamiento","almacen",
  "fecha","registrar","lote","insumo","aplicar","aplique","use","apliqu",
  "dosis",
])

type KwHit = { tag: string; start: number; end: number }

function encontrarKeywords(text: string, keywords: typeof FIELD_KEYWORDS): KwHit[] {
  const hits: KwHit[] = []
  for (const { tag, re } of keywords) {
    const r = new RegExp(re.source, "gi")
    let m: RegExpExecArray | null
    while ((m = r.exec(text)) !== null) {
      hits.push({ tag, start: m.index, end: m.index + m[0].length })
    }
  }
  hits.sort((a, b) => a.start - b.start)
  // Eliminar solapamientos
  const clean: KwHit[] = []
  for (const h of hits) {
    if (clean.length === 0 || h.start >= clean[clean.length - 1].end) clean.push(h)
  }
  return clean
}

function segmentar(text: string, hits: KwHit[]): Array<{ tag: string; content: string }> {
  return hits.map((h, i) => {
    const nextStart = i + 1 < hits.length ? hits[i + 1].start : text.length
    const raw = text.slice(h.end, nextStart)
    const content = raw.replace(/^[\s,.:;]+|[\s,.:;]+$/g, "")
    return { tag: h.tag, content }
  })
}

/** Detecta insumos buscando "dosis" en el texto y extrayendo el nombre del producto
 *  que aparece entre el keyword anterior y la palabra "dosis". Funciona con o sin
 *  la palabra "insumo" como trigger. */
function detectarInsumos(text: string, fieldHits: KwHit[]): InsumoForm[] {
  const insumos: InsumoForm[] = []

  // Recopilar todas las posiciones de "dosis" primero (serán límites adicionales)
  const dosisPosiciones: KwHit[] = []
  const dosisPreScan = /\bdosis\b/gi
  let pre: RegExpExecArray | null
  while ((pre = dosisPreScan.exec(text)) !== null) {
    dosisPosiciones.push({ tag: "dosis", start: pre.index, end: pre.index + pre[0].length })
  }

  // Todos los límites: keywords de campo + posiciones de "dosis"
  const todosLimites: KwHit[] = [...fieldHits, ...dosisPosiciones]

  const dosisRe = /\bdosis\b/gi
  let m: RegExpExecArray | null

  while ((m = dosisRe.exec(text)) !== null) {
    const dosisStart = m.index
    const dosisEnd = m.index + m[0].length

    // Límite izquierdo: el final del keyword/dosis más cercano ANTES de este "dosis"
    const prevEnd = todosLimites
      .filter((h) => h.end <= dosisStart)
      .reduce((max, h) => (h.end > max ? h.end : max), 0)

    // Texto entre el keyword anterior y "dosis" = nombre del insumo
    // Filtramos números, palabras de fecha y keywords que no son nombre de producto
    const rawWords = text.slice(prevEnd, dosisStart)
      .replace(/^[\s,.:;]+|[\s,.:;]+$/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !/^\d/.test(w) && !PRODUCT_SKIP.has(w.toLowerCase()))

    const rawNombre = rawWords.join(" ")
    if (!rawNombre) continue  // sin nombre → saltar

    // Límite derecho: el siguiente keyword/dosis
    const nextStart = todosLimites
      .filter((h) => h.start >= dosisEnd)
      .reduce((min, h) => (h.start < min ? h.start : min), text.length)

    const rawDosis = text.slice(dosisEnd, nextStart)
      .replace(/^[\s,.:;]+|[\s,.:;]+$/g, "")

    // Extraer el número de la dosis (puede venir con unidades: "0.5 l/ha")
    // Solo número + unidades agronómicas cortas (no captura nombres de productos)
    const dosisMatch = rawDosis.match(/^([\d.,]+(?:\s*(?:l|g|mg|kg|ml|cc|t|ton|l\/ha|kg\/ha|g\/ha|ml\/ha|cc\/ha|lha|kgha))?)/)
    const dosis = dosisMatch ? dosisMatch[1].trim() : rawDosis.split(/\s/)[0] || ""

    // Fecha de aplicación: acepta "aplicado el X", "aplicación X", "fecha de aplicación X"
    const fechaM = rawDosis.match(
      /(?:fecha(?:\s+de\s+)?aplicaci[oó]n|aplicaci[oó]n|aplicado\s+(?:el\s+)?)\s*(.+)/i
    )
    const fecha = fechaM ? parseDate(fechaM[1].trim()) : ""

    insumos.push({ nombre: capitalizar(rawNombre), dosis, fecha })
  }

  return insumos
}

function parsearTranscript(
  transcript: string,
  cultivos: string[],
): { fields: ParsedFields; insumos: InsumoForm[]; detected: string[] } {
  const t = transcript.toLowerCase()
  const fields: ParsedFields = {}
  const detected: string[] = []

  // Cultivo: buscar en todo el texto aunque no haya keyword
  for (const c of cultivos) {
    if (t.includes(c.toLowerCase())) {
      fields.cultivo = c
      detected.push("cultivo")
      break
    }
  }

  // Segmentar campos principales
  const hits = encontrarKeywords(t, FIELD_KEYWORDS)
  const segments = segmentar(t, hits)

  for (const { tag, content } of segments) {
    if (!content) continue

    if (tag === "cultivo" && !fields.cultivo) {
      for (const c of cultivos) {
        if (content.includes(c.toLowerCase())) {
          fields.cultivo = c
          if (!detected.includes("cultivo")) detected.push("cultivo")
          break
        }
      }
    }
    if (tag === "parcela" && !fields.parcela) {
      fields.parcela = capitalizar(content)
      detected.push("parcela")
    }
    if (tag === "siembra" && !fields.fechaSiembra) {
      const d = parseDate(content)
      if (d) { fields.fechaSiembra = d; detected.push("fechaSiembra") }
    }
    if (tag === "cosecha" && !fields.fechaCosecha) {
      const d = parseDate(content)
      if (d) { fields.fechaCosecha = d; detected.push("fechaCosecha") }
    }
    if (tag === "almacenamiento" && !fields.almacenamiento) {
      fields.almacenamiento = capitalizar(content)
      detected.push("almacenamiento")
    }
  }

  // Insumos: detección directa por patrón "X dosis Y"
  const insumos = detectarInsumos(t, hits)
  if (insumos.length > 0) detected.push("insumos")

  return { fields, insumos, detected }
}

// ─── Componente principal ──────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  cultivo: "Cultivo",
  parcela: "Parcela",
  fechaSiembra: "Fecha siembra",
  fechaCosecha: "Fecha cosecha",
  almacenamiento: "Almacenamiento",
  insumos: "Insumos",
}

export default function NuevoLotePage() {
  const router = useRouter()
  const [cooperativas, setCooperativas] = useState<Cooperativa[]>([])
  const [resultado, setResultado] = useState<AnalisisResultado | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [lastDetected, setLastDetected] = useState<string[]>([])
  const [formData, setFormData] = useState({
    cooperativa_id: "",
    cultivo: "",
    parcela: "",
    fechaSiembra: "",
    fechaCosecha: "",
    almacenamiento: "",
  })
  const [insumos, setInsumos] = useState<InsumoForm[]>([{ nombre: "", dosis: "", fecha: "" }])

  const { state: voiceState, transcript, error: voiceError, startRecording, stopRecording } = useVoiceInput()

  useEffect(() => {
    api.get<{ data: Cooperativa[] }>("/cooperativas/")
      .then((res) => setCooperativas(res.data ?? []))
      .catch(() => {})
  }, [])

  // Auto-fill cuando llega el transcript
  useEffect(() => {
    if (voiceState !== "done" || !transcript) return

    const { fields, insumos: parsedInsumos, detected } = parsearTranscript(transcript, cultivos)

    setFormData((prev) => ({
      ...prev,
      ...(fields.cultivo !== undefined ? { cultivo: fields.cultivo } : {}),
      ...(fields.parcela !== undefined ? { parcela: fields.parcela } : {}),
      ...(fields.fechaSiembra ? { fechaSiembra: fields.fechaSiembra } : {}),
      ...(fields.fechaCosecha ? { fechaCosecha: fields.fechaCosecha } : {}),
      ...(fields.almacenamiento !== undefined ? { almacenamiento: fields.almacenamiento } : {}),
    }))

    if (parsedInsumos.length > 0) setInsumos(parsedInsumos)

    setLastDetected(detected)
  }, [voiceState, transcript])

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
              <p className="text-sm text-muted-foreground">No se detectaron alertas. El lote cumple todos los requisitos.</p>
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

      {/* ── Panel de voz ──────────────────────────────────────────────────── */}
      <Card className={`border-2 transition-colors ${
        voiceState === "recording" ? "border-red-400 bg-red-50 dark:bg-red-950/20" :
        voiceState === "done" ? "border-primary/40 bg-primary/5" :
        "border-dashed border-muted-foreground/30"
      }`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                voiceState === "recording" ? "bg-red-100 dark:bg-red-900/40" :
                voiceState === "done" ? "bg-primary/10" : "bg-muted"
              }`}>
                {voiceState === "processing"
                  ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  : voiceState === "recording"
                  ? <MicOff className="h-5 w-5 text-red-500" />
                  : <Mic className={`h-5 w-5 ${voiceState === "done" ? "text-primary" : "text-muted-foreground"}`} />}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {voiceState === "idle" && "Dictado por voz"}
                  {voiceState === "recording" && "Grabando… habla ahora"}
                  {voiceState === "processing" && "Transcribiendo con Deepgram…"}
                  {voiceState === "done" && "¡Listo! Revisa los campos rellenados"}
                  {voiceState === "error" && "Error al grabar"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {voiceState === "idle" && "Pulsa el botón y dicta los datos del lote en voz alta"}
                  {voiceState === "recording" && "Pulsa 'Detener' cuando termines de hablar"}
                  {voiceState === "processing" && "Espera un momento…"}
                  {voiceState === "done" && lastDetected.length > 0
                    ? `Campos detectados: ${lastDetected.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`
                    : voiceState === "done" ? "No se detectaron campos — intenta de nuevo"
                    : ""}
                  {voiceState === "error" && (voiceError ?? "No se pudo acceder al micrófono")}
                </p>

                {/* Transcript */}
                {voiceState === "done" && transcript && (
                  <p className="mt-2 text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                    "{transcript}"
                  </p>
                )}

                {/* Badges de campos detectados */}
                {voiceState === "done" && lastDetected.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lastDetected.map((f) => (
                      <Badge key={f} variant="secondary" className="gap-1 text-xs bg-primary/10 text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        {FIELD_LABELS[f] ?? f}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowGuide((v) => !v)}
                title="¿Qué puedo decir?"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              {voiceState === "recording" ? (
                <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={stopRecording}>
                  <MicOff className="h-4 w-4" />Detener
                </Button>
              ) : voiceState === "processing" ? (
                <Button type="button" variant="outline" size="sm" disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />Procesando
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={startRecording}>
                  <Mic className="h-4 w-4" />
                  {voiceState === "done" ? "Dictar de nuevo" : "Iniciar dictado"}
                </Button>
              )}
            </div>
          </div>

          {/* Guía de uso */}
          {showGuide && (
            <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1 border">
              <p className="font-medium text-foreground">¿Qué puedes decir?</p>
              <p>Di los datos en cualquier orden usando estas palabras clave:</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li><span className="font-medium text-foreground">Cultivo</span> — "cultivo tomate"</li>
                <li><span className="font-medium text-foreground">Parcela</span> — "parcela norte A-12"</li>
                <li><span className="font-medium text-foreground">Siembra</span> — "siembra primero de marzo" o "siembra 1 de marzo de 2026"</li>
                <li><span className="font-medium text-foreground">Cosecha</span> — "cosecha 15 de junio de 2026"</li>
                <li><span className="font-medium text-foreground">Insumo</span> — "insumo Decis dosis 0.5 aplicado el 10 de mayo de 2026"</li>
                <li><span className="font-medium text-foreground">Almacenamiento</span> — "almacenamiento cámara fría a 10 grados"</li>
              </ul>
              <p className="mt-1 text-xs">Ejemplo completo: <em>"Cultivo tomate, parcela norte A-12, siembra 1 de marzo, cosecha 15 de junio de 2026, insumo Decis dosis 0.5 aplicado el 10 de mayo, insumo Mancozeb dosis 2.0 aplicado el 20 de mayo, almacenamiento cámara fría."</em></p>
            </div>
          )}
        </CardContent>
      </Card>

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
                <Label className="flex items-center gap-1.5">
                  Cultivo
                  {lastDetected.includes("cultivo") && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </Label>
                <Select value={formData.cultivo} onValueChange={(v) => setFormData((p) => ({ ...p, cultivo: v }))}>
                  <SelectTrigger className={lastDetected.includes("cultivo") ? "border-primary/50 ring-1 ring-primary/20" : ""}>
                    <SelectValue placeholder="Selecciona un cultivo" />
                  </SelectTrigger>
                  <SelectContent>{cultivos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcela" className="flex items-center gap-1.5">
                  Parcela
                  {lastDetected.includes("parcela") && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </Label>
                <Input
                  id="parcela" name="parcela"
                  placeholder="Ej: Parcela Norte A-12"
                  value={formData.parcela}
                  onChange={handleInputChange}
                  className={lastDetected.includes("parcela") ? "border-primary/50 ring-1 ring-primary/20" : ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaSiembra" className="flex items-center gap-1.5">
                  Fecha de Siembra
                  {lastDetected.includes("fechaSiembra") && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </Label>
                <Input
                  id="fechaSiembra" name="fechaSiembra" type="date"
                  value={formData.fechaSiembra}
                  onChange={handleInputChange}
                  className={lastDetected.includes("fechaSiembra") ? "border-primary/50 ring-1 ring-primary/20" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaCosecha" className="flex items-center gap-1.5">
                  Fecha de Cosecha *
                  {lastDetected.includes("fechaCosecha") && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </Label>
                <Input
                  id="fechaCosecha" name="fechaCosecha" type="date"
                  value={formData.fechaCosecha}
                  onChange={handleInputChange}
                  required
                  className={lastDetected.includes("fechaCosecha") ? "border-primary/50 ring-1 ring-primary/20" : ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insumos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Insumos Aplicados
              {lastDetected.includes("insumos") && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </CardTitle>
            <CardDescription>Fertilizantes, pesticidas y otros insumos utilizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insumos.map((insumo, index) => (
              <div
                key={index}
                className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end transition-colors ${
                  lastDetected.includes("insumos") ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex-1 space-y-2">
                  <Label>Nombre del Insumo</Label>
                  <Input
                    placeholder="Ej: Decis, Mancozeb"
                    value={insumo.nombre}
                    onChange={(e) => handleInsumoChange(index, "nombre", e.target.value)}
                  />
                </div>
                <div className="w-full space-y-2 sm:w-36">
                  <Label>Dosis</Label>
                  <Input
                    placeholder="Ej: 0.5 l/ha"
                    value={insumo.dosis}
                    onChange={(e) => handleInsumoChange(index, "dosis", e.target.value)}
                  />
                </div>
                <div className="w-full space-y-2 sm:w-40">
                  <Label>Fecha de aplicación</Label>
                  <Input
                    type="date"
                    value={insumo.fecha}
                    onChange={(e) => handleInsumoChange(index, "fecha", e.target.value)}
                  />
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => insumos.length > 1 && setInsumos(insumos.filter((_, i) => i !== index))}
                  disabled={insumos.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button" variant="outline" className="w-full"
              onClick={() => setInsumos([...insumos, { nombre: "", dosis: "", fecha: "" }])}
            >
              <Plus className="mr-2 h-4 w-4" />Agregar otro insumo
            </Button>
          </CardContent>
        </Card>

        {/* Almacenamiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Condiciones de Almacenamiento
              {lastDetected.includes("almacenamiento") && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="almacenamiento"
              placeholder="Ej: Cámara fría a 10°C, humedad relativa 85%"
              value={formData.almacenamiento}
              onChange={handleInputChange}
              rows={3}
              className={lastDetected.includes("almacenamiento") ? "border-primary/50 ring-1 ring-primary/20" : ""}
            />
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
