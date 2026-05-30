"""Unit tests for motor_analisis — deterministic risk engine."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date, timedelta
from app.services.motor_analisis import analizar_lote, LoteAnalisisInput, InsumoAplicado


def _hoy():
    return date.today()


def _cosecha(dias: int) -> date:
    return _hoy() + timedelta(days=dias)


def _aplicacion(dias_antes_cosecha: int, cosecha: date) -> date:
    return cosecha - timedelta(days=dias_antes_cosecha)


class TestLoteApto:
    def test_sin_insumos_es_apto(self):
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=_cosecha(30),
            insumos=[],
        ))
        assert resultado.estado == "APTO"
        assert resultado.alertas == []

    def test_decis_con_carencia_cumplida(self):
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[InsumoAplicado(
                nombre="Decis",
                dosis=0.3,
                fecha_aplicacion=_aplicacion(10, cosecha),   # 10 días antes, carencia = 3
            )],
        ))
        assert resultado.estado == "APTO"
        assert resultado.alertas == []

    def test_dosis_en_limite_no_genera_alerta(self):
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[InsumoAplicado(
                nombre="Decis",
                dosis=0.5,   # exactamente el máximo
                fecha_aplicacion=_aplicacion(10, cosecha),
            )],
        ))
        assert resultado.estado == "APTO"


class TestLoteObservado:
    def test_carencia_insuficiente_genera_observado(self):
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[InsumoAplicado(
                nombre="Lorsban",
                dosis=1.0,
                fecha_aplicacion=_aplicacion(5, cosecha),   # 5 días, carencia = 21
            )],
        ))
        assert resultado.estado == "OBSERVADO"
        tipos = [a.tipo for a in resultado.alertas]
        assert "carencia_insuficiente" in tipos

    def test_dosis_excedida_genera_observado(self):
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[InsumoAplicado(
                nombre="Decis",
                dosis=2.0,    # máximo es 0.5
                fecha_aplicacion=_aplicacion(10, cosecha),
            )],
        ))
        assert resultado.estado == "OBSERVADO"
        tipos = [a.tipo for a in resultado.alertas]
        assert "dosis_excedida" in tipos

    def test_insumo_sin_datos_lmr_genera_observado(self):
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=_cosecha(30),
            insumos=[InsumoAplicado(
                nombre="ProductoDesconocidoXYZ",
                dosis=1.0,
                fecha_aplicacion=_cosecha(-5),
            )],
        ))
        assert resultado.estado == "OBSERVADO"
        assert "ProductoDesconocidoXYZ" in resultado.insumos_sin_datos_lmr


class TestLoteNoApto:
    def test_insumo_no_autorizado_para_cultivo(self):
        # Glifosato no está autorizado para tomate en la tabla LMR
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[InsumoAplicado(
                nombre="Roundup",
                dosis=1.0,
                fecha_aplicacion=_aplicacion(70, cosecha),
            )],
        ))
        assert resultado.estado == "NO APTO"
        tipos = [a.tipo for a in resultado.alertas]
        assert "no_autorizado" in tipos

    def test_no_apto_toma_precedencia_sobre_observado(self):
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[
                InsumoAplicado(nombre="Roundup", dosis=1.0, fecha_aplicacion=_aplicacion(70, cosecha)),
                InsumoAplicado(nombre="Decis",   dosis=2.0, fecha_aplicacion=_aplicacion(10, cosecha)),
            ],
        ))
        assert resultado.estado == "NO APTO"

    def test_total_insumos_analizados_correcto(self):
        cosecha = _cosecha(30)
        resultado = analizar_lote(LoteAnalisisInput(
            cultivo="tomate",
            fecha_cosecha=cosecha,
            insumos=[
                InsumoAplicado(nombre="Decis", dosis=0.3, fecha_aplicacion=_aplicacion(10, cosecha)),
                InsumoAplicado(nombre="Mancozeb", dosis=1.5, fecha_aplicacion=_aplicacion(5, cosecha)),
            ],
        ))
        assert resultado.total_insumos_analizados == 2
