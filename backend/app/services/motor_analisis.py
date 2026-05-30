from datetime import date
from pydantic import BaseModel
from typing import Optional
from .lmr_service import lmr_service


class InsumoAplicado(BaseModel):
    nombre: str
    dosis: float
    fecha_aplicacion: date


class LoteAnalisisInput(BaseModel):
    cultivo: str
    fecha_cosecha: date
    insumos: list[InsumoAplicado]


class AlertaLote(BaseModel):
    insumo: str
    tipo: str   # "carencia_insuficiente" | "dosis_excedida" | "no_autorizado" | "sin_datos_lmr"
    detalle: str
    fuente_normativa: str
    dias_requeridos: Optional[int] = None
    dias_transcurridos: Optional[int] = None


class ResultadoAnalisis(BaseModel):
    estado: str   # "APTO" | "OBSERVADO" | "NO APTO"
    alertas: list[AlertaLote]
    total_insumos_analizados: int
    insumos_sin_datos_lmr: list[str]


def analizar_lote(input: LoteAnalisisInput) -> ResultadoAnalisis:
    alertas: list[AlertaLote] = []
    insumos_sin_datos: list[str] = []

    for insumo in input.insumos:
        datos = lmr_service.get_lmr(insumo.nombre, input.cultivo)

        if datos is None:
            insumos_sin_datos.append(insumo.nombre)
            alertas.append(AlertaLote(
                insumo=insumo.nombre,
                tipo="sin_datos_lmr",
                detalle=f"No se encontraron datos LMR para '{insumo.nombre}' en cultivo '{input.cultivo}'",
                fuente_normativa="No disponible — requiere revisión manual",
            ))
            continue

        if not datos.get("autorizado", True):
            alertas.append(AlertaLote(
                insumo=insumo.nombre,
                tipo="no_autorizado",
                detalle=(
                    f"'{insumo.nombre}' ({datos.get('principio_activo', '')}) no está autorizado "
                    f"para el cultivo '{input.cultivo}' según la tabla LMR"
                ),
                fuente_normativa=datos.get("fuente_normativa", "Codex Alimentarius"),
            ))
            continue

        carencia = datos["periodo_carencia_dias"]
        dias_transcurridos = (input.fecha_cosecha - insumo.fecha_aplicacion).days

        if dias_transcurridos < carencia:
            alertas.append(AlertaLote(
                insumo=insumo.nombre,
                tipo="carencia_insuficiente",
                detalle=(
                    f"Carencia insuficiente: {dias_transcurridos} día(s) desde la última aplicación, "
                    f"se requieren {carencia} días antes de cosechar"
                ),
                fuente_normativa=datos.get("fuente_normativa", "Codex Alimentarius"),
                dias_requeridos=carencia,
                dias_transcurridos=dias_transcurridos,
            ))

        dosis_max: float = datos.get("dosis_maxima", 0.0)
        unidad: str = datos.get("unidad_dosis", "")
        if dosis_max > 0 and insumo.dosis > dosis_max:
            exceso = round(insumo.dosis - dosis_max, 3)
            alertas.append(AlertaLote(
                insumo=insumo.nombre,
                tipo="dosis_excedida",
                detalle=(
                    f"Dosis aplicada ({insumo.dosis} {unidad}) supera el máximo permitido "
                    f"({dosis_max} {unidad}) — exceso de +{exceso} {unidad}"
                ),
                fuente_normativa=datos.get("fuente_normativa", "Codex Alimentarius"),
            ))

    if any(a.tipo == "no_autorizado" for a in alertas):
        estado = "NO APTO"
    elif any(a.tipo in ("carencia_insuficiente", "dosis_excedida", "sin_datos_lmr") for a in alertas):
        estado = "OBSERVADO"
    else:
        estado = "APTO"

    return ResultadoAnalisis(
        estado=estado,
        alertas=alertas,
        total_insumos_analizados=len(input.insumos),
        insumos_sin_datos_lmr=insumos_sin_datos,
    )
