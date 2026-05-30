from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import API_KEY
from app.core.database import get_db
from app.models.alerta import AlertaSanitaria
from app.services.patrones import analizar_patrones, guardar_alertas_sanitarias
from app.services.explicacion import generar_explicacion
from app.services.motor_analisis import AlertaLote

router = APIRouter(prefix="/alertas", tags=["alertas"])


def _check_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


def _ok(data):
    return {"data": data, "error": None}


def _alerta_to_dict(a: AlertaSanitaria) -> dict:
    return {
        "id": a.id,
        "zona": a.zona,
        "tipo_patron": a.tipo_patron,
        "lotes_involucrados": a.lotes_involucrados,
        "insumo_recurrente": a.insumo_recurrente,
        "periodo_analizado_dias": a.periodo_analizado_dias,
        "nivel": a.nivel,
        "recomendacion_automatica": a.recomendacion_automatica,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/", summary="Listar alertas sanitarias activas")
def listar_alertas(
    zona: Optional[str] = Query(None),
    nivel: Optional[str] = Query(None, description="informativa | preventiva | critica"),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    q = db.query(AlertaSanitaria)
    if zona:
        q = q.filter(AlertaSanitaria.zona.ilike(f"%{zona}%"))
    if nivel:
        q = q.filter(AlertaSanitaria.nivel == nivel)
    alertas = q.order_by(AlertaSanitaria.created_at.desc()).all()
    return _ok([_alerta_to_dict(a) for a in alertas])


@router.get("/{alerta_id}", summary="Detalle de alerta sanitaria")
def obtener_alerta(
    alerta_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    alerta = db.query(AlertaSanitaria).filter(AlertaSanitaria.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return _ok(_alerta_to_dict(alerta))


@router.post("/analizar", summary="Disparar análisis de patrones (admin)")
def disparar_analisis(
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    patrones = analizar_patrones(db)

    if not patrones:
        return _ok({"alertas_generadas": 0, "detalle": []})

    # Generate LLM recommendation for each pattern as "auditor"
    for patron in patrones:
        alerta_dummy = AlertaLote(
            insumo=patron.get("insumo_recurrente") or "múltiples insumos",
            tipo=patron["tipo_patron"],
            detalle=(
                f"Patrón detectado: {patron['tipo_patron']} en zona {patron['zona']}. "
                f"Lotes involucrados: {len(patron['lotes_involucrados'])}. "
                f"Nivel: {patron['nivel']}."
            ),
            fuente_normativa="Análisis de patrones TrazaAlimento",
        )
        try:
            patron["recomendacion_automatica"] = generar_explicacion(alerta_dummy, rol="auditor")
        except Exception:
            patron["recomendacion_automatica"] = None

    guardadas = guardar_alertas_sanitarias(db, patrones)
    return _ok({
        "alertas_generadas": len(guardadas),
        "detalle": [_alerta_to_dict(a) for a in guardadas],
    })
