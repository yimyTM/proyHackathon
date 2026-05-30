from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_tables
from app.routers import lotes, cooperativas, alertas, asistente
from app.routers import reportes

# Also include the existing flat endpoints for backwards compatibility
try:
    from fastapi import APIRouter
    from models import AnalisisRequest, AnalisisResponse
    from engine import analizar_lote as analizar_lote_legacy
    from qr_generator import generar_qr_bytes
    from fastapi.responses import Response
    import os

    _legacy_router = APIRouter(tags=["legacy"])

    @_legacy_router.post("/analizar", response_model=AnalisisResponse, include_in_schema=True,
                         summary="[Legacy] Analiza un lote (motor original)")
    async def analizar_legacy(req: AnalisisRequest):
        resultado = analizar_lote_legacy(req)
        token = req.token_destino
        if token and resultado["alerta"] in ("AMARILLA", "ROJA"):
            from alertas import enviar_telegram
            bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
            if bot_token:
                msg = (
                    f"<b>Alerta Lote {req.lote_id}</b>\n"
                    f"Estado: {resultado['estado']} | {resultado['alerta']}\n"
                    f"{resultado['motivos'][0]}\n"
                    f"{resultado['recomendacion']}"
                )
                await enviar_telegram(bot_token, token, msg)
        return resultado

    @_legacy_router.post("/analizar/qr", summary="[Legacy] Devuelve QR como imagen PNG")
    async def analizar_qr_legacy(req: AnalisisRequest):
        resultado = analizar_lote_legacy(req)
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

    _has_legacy = True
except Exception:
    _has_legacy = False


app = FastAPI(
    title="TrazaAlimento — Backend",
    description="API de trazabilidad alimentaria para cooperativas de Santa Cruz, Bolivia",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


app.include_router(lotes.router)
app.include_router(cooperativas.router)
app.include_router(alertas.router)
app.include_router(asistente.router)
app.include_router(reportes.router, prefix="/reportes", tags=["reportes"])

# Análisis preview (no persiste en DB)
from fastapi import APIRouter as _AR
from app.services.motor_analisis import analizar_lote as _analizar, LoteAnalisisInput
from app.services.explicacion import generar_explicacion  # now uses Gemini
from app.models.alerta import AlertaLoteDB
from sqlalchemy.orm import Session
from app.core.database import get_db
from fastapi import Depends, Header, HTTPException, Query

_analisis_router = _AR(prefix="/analisis", tags=["analisis"])


@_analisis_router.post("/lote", summary="Analizar lote sin guardar (preview)")
def analisis_preview(payload: LoteAnalisisInput):
    resultado = _analizar(payload)
    return {"data": resultado.model_dump(), "error": None}


@_analisis_router.get("/{lote_id}/explicacion", summary="Explicación LLM para un lote")
def explicacion_lote(
    lote_id: str,
    rol: str = Query("productor", description="productor | comprador | auditor"),
    db: Session = Depends(get_db),
    x_api_key: str = Header(...),
):
    from app.core.config import API_KEY
    from app.models.lote import Lote
    from app.services.motor_analisis import AlertaLote

    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")

    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    explicaciones = []
    for alerta_db in lote.alertas:
        alerta = AlertaLote(
            insumo=alerta_db.insumo,
            tipo=alerta_db.tipo,
            detalle=alerta_db.detalle,
            fuente_normativa=alerta_db.fuente_normativa or "",
            dias_requeridos=alerta_db.dias_requeridos,
            dias_transcurridos=alerta_db.dias_transcurridos,
        )
        try:
            texto = generar_explicacion(alerta, rol=rol)
        except Exception as e:
            texto = f"[Error al generar explicación: {e}]"
        explicaciones.append({"insumo": alerta_db.insumo, "tipo": alerta_db.tipo, "explicacion": texto})

    return {"data": {"lote_id": lote_id, "rol": rol, "explicaciones": explicaciones}, "error": None}


app.include_router(_analisis_router)

if _has_legacy:
    app.include_router(_legacy_router)


@app.get("/public/lote/{lote_id}", tags=["public"], summary="Datos públicos del lote (sin auth)")
def lote_publico(lote_id: str, db: Session = Depends(get_db)):
    from app.models.lote import Lote as _Lote
    lote = db.query(_Lote).filter(_Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return {"data": {
        "lote_id": lote.id,
        "cultivo": lote.cultivo,
        "parcela": lote.parcela,
        "fecha_siembra": lote.fecha_siembra.isoformat() if lote.fecha_siembra else None,
        "fecha_cosecha": lote.fecha_cosecha.isoformat(),
        "almacenamiento": lote.almacenamiento,
        "estado": lote.estado,
        "cooperativa": lote.cooperativa.nombre if lote.cooperativa else None,
        "municipio": lote.cooperativa.municipio if lote.cooperativa else None,
        "insumos": [
            {"nombre": i.nombre, "dosis": i.dosis, "fecha_aplicacion": i.fecha_aplicacion.isoformat()}
            for i in lote.insumos
        ],
        "alertas": [{"tipo": a.tipo, "detalle": a.detalle} for a in lote.alertas],
    }, "error": None}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "servicio": "TrazaAlimento Backend v2"}
