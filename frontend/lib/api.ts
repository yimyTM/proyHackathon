const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ""

const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...baseHeaders, ...(options.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const body = await res.json()
      msg = body.error || body.detail || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  download: async (endpoint: string, filename: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: baseHeaders })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}

/** "NO APTO" (backend) → "NO_APTO" (frontend badge) */
export function normalizeEstado(estado: string): "APTO" | "OBSERVADO" | "NO_APTO" {
  if (estado === "NO APTO" || estado === "NO_APTO") return "NO_APTO"
  if (estado === "OBSERVADO") return "OBSERVADO"
  return "APTO"
}

/** Extrae el número flotante de "2.5 kg/ha" → 2.5 */
export function parseDosis(dosis: string): number {
  const m = dosis.match(/[\d]+[.,]?[\d]*/)
  return m ? parseFloat(m[0].replace(",", ".")) : 0.0
}
