import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import API_KEY
from app.core.database import get_db
from app.models.cooperativa import Cooperativa
from app.models.lote import Lote

router = APIRouter(prefix="/cooperativas", tags=["cooperativas"])


def _check_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


def _ok(data):
    return {"data": data, "error": None}


class CooperativaCreate(BaseModel):
    nombre: str
    municipio: str
    producto_principal: Optional[str] = None
    contacto_email: Optional[str] = None


@router.get("/", summary="Catálogo de cooperativas con filtros")
def listar_cooperativas(
    municipio: Optional[str] = Query(None),
    producto: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    q = db.query(Cooperativa)
    if municipio:
        q = q.filter(Cooperativa.municipio.ilike(f"%{municipio}%"))
    if producto:
        q = q.filter(Cooperativa.producto_principal.ilike(f"%{producto}%"))
    coops = q.all()
    return _ok([
        {
            "id": c.id,
            "nombre": c.nombre,
            "municipio": c.municipio,
            "producto_principal": c.producto_principal,
            "contacto_email": c.contacto_email,
        }
        for c in coops
    ])


@router.get("/{cooperativa_id}", summary="Detalle de cooperativa")
def obtener_cooperativa(
    cooperativa_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    coop = db.query(Cooperativa).filter(Cooperativa.id == cooperativa_id).first()
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperativa no encontrada")
    return _ok({
        "id": coop.id,
        "nombre": coop.nombre,
        "municipio": coop.municipio,
        "producto_principal": coop.producto_principal,
        "contacto_email": coop.contacto_email,
    })


@router.get("/{cooperativa_id}/lotes", summary="Lotes de una cooperativa con filtros")
def lotes_por_cooperativa(
    cooperativa_id: str,
    estado: Optional[str] = Query(None, description="APTO | OBSERVADO | NO APTO"),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    coop = db.query(Cooperativa).filter(Cooperativa.id == cooperativa_id).first()
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperativa no encontrada")

    q = db.query(Lote).filter(Lote.cooperativa_id == cooperativa_id)
    if estado:
        q = q.filter(Lote.estado == estado)
    lotes = q.order_by(Lote.created_at.desc()).all()

    return _ok([
        {
            "lote_id": l.id,
            "cultivo": l.cultivo,
            "fecha_cosecha": l.fecha_cosecha.isoformat(),
            "estado": l.estado,
            "n_alertas": len(l.alertas),
        }
        for l in lotes
    ])


@router.post("/", summary="Crear cooperativa")
def crear_cooperativa(
    payload: CooperativaCreate,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    coop = Cooperativa(
        id=str(uuid.uuid4()),
        nombre=payload.nombre,
        municipio=payload.municipio,
        producto_principal=payload.producto_principal,
        contacto_email=payload.contacto_email,
        created_at=datetime.utcnow(),
    )
    db.add(coop)
    db.commit()
    db.refresh(coop)
    return _ok({"id": coop.id, "nombre": coop.nombre})
