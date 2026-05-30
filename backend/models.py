from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import date


class InsumoRequest(BaseModel):
    nombre: str
    dosis: str = "0"          # "2.5 kg/ha" o "0.5 L/ha"
    fecha: str                # "2024-03-10" (ISO)


class AlertaVecinaRequest(BaseModel):
    agente: str
    distancia_km: float
    cultivo_afectado: str


class AnalisisRequest(BaseModel):
    lote_id: str
    cultivo: str
    fecha_cosecha: str        # ISO date string
    insumos: List[InsumoRequest]
    alertas_vecinas: List[AlertaVecinaRequest] = []
    rechazos_previos: int = 0
    total_envios: int = 1
    test_rapido_negativo: bool = False
    token_destino: Optional[str] = None


class AnalisisResponse(BaseModel):
    estado: str               # APTO | ATENCION | NO_APTO
    alerta: str               # VERDE | AMARILLA | ROJA
    motivos: List[str]
    confianza: int            # 0-100
    recomendacion: str
    qr_contenido: str
