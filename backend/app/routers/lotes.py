import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import API_KEY
from app.core.database import get_db
from app.models.lote import Lote
from app.models.insumo import InsumoAplicadoDB
from app.models.alerta import AlertaLoteDB
from app.schemas.lote import LoteCreate, LoteResponse, LoteQRResponse
from app.services.motor_analisis import analizar_lote, LoteAnalisisInput, InsumoAplicado

try:
    from qr_generator import generar_qr_bytes
except ImportError:
    generar_qr_bytes = None  # type: ignore

router = APIRouter(prefix="/lotes", tags=["lotes"])


def _check_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


def _ok(data):
    return {"data": data, "error": None}


def _err(msg: str):
    return {"data": None, "error": msg}


@router.get("/", summary="Listar lotes con filtros opcionales")
def listar_lotes(
    cooperativa_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    q = db.query(Lote)
    if cooperativa_id:
        q = q.filter(Lote.cooperativa_id == cooperativa_id)
    if estado:
        q = q.filter(Lote.estado == estado)
    lotes = q.order_by(Lote.created_at.desc()).all()
    return _ok([
        {
            "lote_id": l.id,
            "cultivo": l.cultivo,
            "parcela": l.parcela,
            "fecha_cosecha": l.fecha_cosecha.isoformat(),
            "estado": l.estado,
            "cooperativa_id": l.cooperativa_id,
            "cooperativa_nombre": l.cooperativa.nombre if l.cooperativa else None,
            "n_alertas": len(l.alertas),
        }
        for l in lotes
    ])


@router.post("/", summary="Registrar lote y ejecutar análisis LMR")
def registrar_lote(
    payload: LoteCreate,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lote_id = str(uuid.uuid4())
    lote_db = Lote(
        id=lote_id,
        cooperativa_id=payload.cooperativa_id,
        cultivo=payload.cultivo,
        parcela=payload.parcela,
        fecha_siembra=payload.fecha_siembra,
        fecha_cosecha=payload.fecha_cosecha,
        almacenamiento=payload.almacenamiento,
        estado="PENDIENTE",
        created_at=datetime.utcnow(),
    )
    db.add(lote_db)

    for insumo in payload.insumos:
        db.add(InsumoAplicadoDB(
            id=str(uuid.uuid4()),
            lote_id=lote_id,
            nombre=insumo.nombre,
            dosis=insumo.dosis,
            fecha_aplicacion=insumo.fecha_aplicacion,
        ))

    db.flush()

    analisis_input = LoteAnalisisInput(
        cultivo=payload.cultivo,
        fecha_cosecha=payload.fecha_cosecha,
        insumos=[
            InsumoAplicado(nombre=i.nombre, dosis=i.dosis, fecha_aplicacion=i.fecha_aplicacion)
            for i in payload.insumos
        ],
    )
    resultado = analizar_lote(analisis_input)
    lote_db.estado = resultado.estado

    for alerta in resultado.alertas:
        db.add(AlertaLoteDB(
            id=str(uuid.uuid4()),
            lote_id=lote_id,
            insumo=alerta.insumo,
            tipo=alerta.tipo,
            detalle=alerta.detalle,
            fuente_normativa=alerta.fuente_normativa,
            dias_requeridos=alerta.dias_requeridos,
            dias_transcurridos=alerta.dias_transcurridos,
        ))

    db.commit()

    return _ok({
        "lote_id": lote_id,
        "estado": resultado.estado,
        "total_insumos_analizados": resultado.total_insumos_analizados,
        "insumos_sin_datos_lmr": resultado.insumos_sin_datos_lmr,
        "alertas": [a.model_dump() for a in resultado.alertas],
    })


@router.get("/{lote_id}", summary="Detalle de lote con resultado de análisis")
def obtener_lote(
    lote_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    return _ok({
        "lote_id": lote.id,
        "cultivo": lote.cultivo,
        "parcela": lote.parcela,
        "fecha_siembra": lote.fecha_siembra.isoformat() if lote.fecha_siembra else None,
        "fecha_cosecha": lote.fecha_cosecha.isoformat(),
        "almacenamiento": lote.almacenamiento,
        "estado": lote.estado,
        "cooperativa_id": lote.cooperativa_id,
        "insumos": [
            {"nombre": i.nombre, "dosis": i.dosis, "fecha_aplicacion": i.fecha_aplicacion.isoformat()}
            for i in lote.insumos
        ],
        "alertas": [
            {
                "insumo": a.insumo,
                "tipo": a.tipo,
                "detalle": a.detalle,
                "fuente_normativa": a.fuente_normativa,
                "dias_requeridos": a.dias_requeridos,
                "dias_transcurridos": a.dias_transcurridos,
            }
            for a in lote.alertas
        ],
    })


@router.get("/{lote_id}/qr", summary="Datos del lote para QR (público)")
def obtener_qr(lote_id: str, db: Session = Depends(get_db)):
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    contenido = (
        f"TrazaAlimento|Lote:{lote.id}|Cultivo:{lote.cultivo}"
        f"|Estado:{lote.estado}|Cosecha:{lote.fecha_cosecha.isoformat()}"
    )
    if lote.cooperativa:
        contenido += f"|Coop:{lote.cooperativa.nombre}"

    if generar_qr_bytes:
        qr_bytes = generar_qr_bytes(contenido)
        return Response(
            content=qr_bytes,
            media_type="image/png",
            headers={
                "X-Estado": lote.estado,
                "X-Lote-Id": lote.id,
                "Access-Control-Expose-Headers": "X-Estado,X-Lote-Id",
            },
        )

    return {"data": {"qr_contenido": contenido, "estado": lote.estado}, "error": None}
