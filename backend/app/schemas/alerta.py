from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AlertaLoteSchema(BaseModel):
    id: Optional[str] = None
    insumo: str
    tipo: str
    detalle: str
    fuente_normativa: str
    dias_requeridos: Optional[int] = None
    dias_transcurridos: Optional[int] = None

    model_config = {"from_attributes": True}


class AlertaSanitariaSchema(BaseModel):
    id: Optional[str] = None
    zona: str
    tipo_patron: str
    lotes_involucrados: list[str]
    insumo_recurrente: Optional[str] = None
    periodo_analizado_dias: int
    nivel: str
    recomendacion_automatica: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
