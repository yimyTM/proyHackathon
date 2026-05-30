"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { Download, Loader2 } from "lucide-react"

interface BotonDescargaProps {
  endpoint: string
  filename: string
  label?: string
  variant?: "default" | "outline" | "secondary"
}

export default function BotonDescarga({
  endpoint,
  filename,
  label = "Descargar Excel",
  variant = "outline",
}: BotonDescargaProps) {
  const [descargando, setDescargando] = useState(false)

  const handleDescarga = async () => {
    setDescargando(true)
    try {
      await api.download(endpoint, filename)
    } catch (err) {
      console.error("Error al descargar:", err)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Button variant={variant} onClick={handleDescarga} disabled={descargando}>
      {descargando
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : <Download className="mr-2 h-4 w-4" />}
      {descargando ? "Descargando..." : label}
    </Button>
  )
}
