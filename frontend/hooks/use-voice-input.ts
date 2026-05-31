"use client"

import { useState, useRef, useCallback } from "react"

type VoiceState = "idle" | "recording" | "processing" | "done" | "error"

interface UseVoiceInputReturn {
  state: VoiceState
  transcript: string
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function useVoiceInput(): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>("idle")
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    setError(null)
    setTranscript("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setState("processing")
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const formData = new FormData()
        formData.append("audio", blob, "audio.webm")
        try {
          const res = await fetch(`${API_URL}/voz/transcribir`, {
            method: "POST",
            body: formData,
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.detail || `Error ${res.status}`)
          }
          const data = await res.json()
          setTranscript(data.transcript || "")
          setState("done")
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al transcribir")
          setState("error")
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setState("recording")
    } catch (err) {
      setError("No se pudo acceder al micrófono")
      setState("error")
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  return { state, transcript, error, startRecording, stopRecording }
}
