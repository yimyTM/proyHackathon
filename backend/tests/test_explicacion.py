"""Unit tests for explicacion service.

These tests require a valid ANTHROPIC_API_KEY in the environment.
They are marked to skip if the key is not present.
"""
import sys
import os
import pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.motor_analisis import AlertaLote

NEEDS_API_KEY = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not set",
)


@NEEDS_API_KEY
def test_explicacion_productor_no_vacia():
    from app.services.explicacion import generar_explicacion
    alerta = AlertaLote(
        insumo="Lorsban",
        tipo="carencia_insuficiente",
        detalle="5 días transcurridos de 21 requeridos",
        fuente_normativa="Codex Alimentarius (codex)",
        dias_requeridos=21,
        dias_transcurridos=5,
    )
    resultado = generar_explicacion(alerta, rol="productor")
    assert isinstance(resultado, str)
    assert len(resultado.strip()) > 0


@NEEDS_API_KEY
def test_explicacion_no_contiene_json_crudo():
    from app.services.explicacion import generar_explicacion
    alerta = AlertaLote(
        insumo="Decis",
        tipo="dosis_excedida",
        detalle="Dosis 2.0 l/ha supera máximo de 0.5 l/ha",
        fuente_normativa="Codex Alimentarius (codex)",
    )
    resultado = generar_explicacion(alerta, rol="comprador")
    assert isinstance(resultado, str)
    assert "{" not in resultado or resultado.count("{") < 3


@NEEDS_API_KEY
@pytest.mark.parametrize("rol", ["productor", "comprador", "auditor"])
def test_explicacion_roles(rol):
    from app.services.explicacion import generar_explicacion
    alerta = AlertaLote(
        insumo="Mancozeb",
        tipo="carencia_insuficiente",
        detalle="2 días transcurridos de 3 requeridos",
        fuente_normativa="Codex Alimentarius (codex)",
        dias_requeridos=3,
        dias_transcurridos=2,
    )
    resultado = generar_explicacion(alerta, rol=rol)
    assert len(resultado.strip()) > 10
