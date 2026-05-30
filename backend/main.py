import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from models import AnalisisRequest, AnalisisResponse
from engine import analizar_lote
from qr_generator import generar_qr_bytes
from alertas import enviar_telegram

app = FastAPI(
    title="TrazaAlimento — Motor de IA",
    description="Microservicio de análisis fitosanitario para cooperativas de Santa Cruz, Bolivia",
    version="1.0.0",
)

# Permite peticiones desde el frontend Next.js (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


@app.post("/analizar", response_model=AnalisisResponse, summary="Analiza un lote y devuelve estado de IA")
async def analizar(req: AnalisisRequest):
    resultado = analizar_lote(req)

    # Enviar alerta si el caller pasa token_destino y la alerta es crítica
    if req.token_destino and resultado["alerta"] in ("AMARILLA", "ROJA") and TELEGRAM_BOT_TOKEN:
        mensaje = (
            f"🔔 <b>Alerta Lote {req.lote_id}</b>\n"
            f"Estado: {resultado['estado']} | {resultado['alerta']}\n"
            f"Motivo: {resultado['motivos'][0]}\n"
            f"{resultado['recomendacion']}"
        )
        await enviar_telegram(TELEGRAM_BOT_TOKEN, req.token_destino, mensaje)

    return resultado


@app.post("/analizar/qr", summary="Devuelve el QR como imagen PNG")
async def analizar_con_qr(req: AnalisisRequest):
    resultado = analizar_lote(req)
    qr_bytes = generar_qr_bytes(resultado["qr_contenido"])
    return Response(
        content=qr_bytes,
        media_type="image/png",
        headers={
            "X-Estado": resultado["estado"],
            "X-Alerta": resultado["alerta"],
            "X-Confianza": str(resultado["confianza"]),
            "Access-Control-Expose-Headers": "X-Estado,X-Alerta,X-Confianza",
        },
    )


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "TrazaAlimento IA"}
