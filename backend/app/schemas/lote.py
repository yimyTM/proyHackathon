from pydantic import BaseModel, field_validator
from datetime import date
from typing import Optional


class InsumoAplicadoSchema(BaseModel):
    nombre: str
    dosis: float
    fecha_aplicacion: date


class LoteCreate(BaseModel):
    cooperativa_id: Optional[str] = None
    cultivo: str
    parcela: Optional[str] = None
    fecha_siembra: Optional[date] = None
    fecha_cosecha: date
    almacenamiento: Optional[str] = None
    insumos: list[InsumoAplicadoSchema] = []

    @field_validator("fecha_cosecha")
    @classmethod
    def cosecha_no_en_pasado(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("La fecha de cosecha no puede ser en el pasado")
        return v


class InsumoAplicadoResponse(BaseModel):
    id: str
    nombre: str
    dosis: float
    fecha_aplicacion: date

    model_config = {"from_attributes": True}


class LoteResponse(BaseModel):
    id: str
    cooperativa_id: Optional[str]
    cultivo: str
    parcela: Optional[str]
    fecha_siembra: Optional[date]
    fecha_cosecha: date
    almacenamiento: Optional[str]
    estado: str
    insumos: list[InsumoAplicadoResponse] = []

    model_config = {"from_attributes": True}


class LoteQRResponse(BaseModel):
    lote_id: str
    cultivo: str
    fecha_cosecha: date
    estado: str
    cooperativa: Optional[str] = None
    insumos: list[str] = []

    model_config = {"from_attributes": True}
