from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app.core.config import API_KEY
from app.services import asistente as asistente_svc

router = APIRouter(prefix="/asistente", tags=["asistente"])


def _check_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


def _ok(data):
    return {"data": data, "error": None}


class MensajeRequest(BaseModel):
    sesion_id: str
    mensaje: str


@router.post("/inicio", summary="Iniciar sesión de registro conversacional")
def iniciar_sesion(_: None = Depends(_check_api_key)):
    try:
        session_id, resultado = asistente_svc.iniciar_sesion()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error al iniciar sesión: {e}")

    return _ok({
        "sesion_id": session_id,
        "respuesta": resultado["respuesta"],
        "estado": resultado["estado"],
    })


@router.post("/mensaje", summary="Enviar mensaje y recibir respuesta del asistente")
def enviar_mensaje(payload: MensajeRequest, _: None = Depends(_check_api_key)):
    try:
        resultado = asistente_svc.procesar_mensaje(payload.sesion_id, payload.mensaje)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error en el asistente: {e}")

    return _ok({
        "sesion_id": payload.sesion_id,
        "respuesta": resultado["respuesta"],
        "estado": resultado["estado"],
        "datos_lote": resultado.get("datos_lote"),
    })


@router.get("/{sesion_id}", summary="Estado de la sesión")
def estado_sesion(sesion_id: str, _: None = Depends(_check_api_key)):
    sesion = asistente_svc.obtener_sesion(sesion_id)
    if sesion is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return _ok(sesion)
