"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import QRCode from "qrcode"

interface QRModalProps {
  isOpen: boolean
  onClose: () => void
  loteCodigo: string
  loteId: string
}

export function QRModal({ isOpen, onClose, loteCodigo, loteId }: QRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (isOpen && loteCodigo) {
      const qrUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/trazabilidad/${loteId}`
      
      QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1D9E75",
          light: "#FFFFFF",
        },
      })
        .then(setQrDataUrl)
        .catch(console.error)
    }
  }, [isOpen, loteCodigo, loteId])

  const handleDownload = () => {
    if (qrDataUrl) {
      const link = document.createElement("a")
      link.href = qrDataUrl
      link.download = `QR-${loteCodigo}.png`
      link.click()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Código QR del Lote</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${loteCodigo}`}
              className="h-64 w-64 rounded-lg border border-border"
            />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-border bg-muted">
              <span className="text-muted-foreground">Generando QR...</span>
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-foreground">{loteCodigo}</p>
            <p className="text-sm text-muted-foreground">
              Escanea para ver la trazabilidad completa
            </p>
          </div>
          <Button onClick={handleDownload} disabled={!qrDataUrl} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
