"""Unit tests for lmr_service — LMR data lookup."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.lmr_service import lmr_service


class TestInsumoExistente:
    def test_decis_tomate_devuelve_datos(self):
        datos = lmr_service.get_lmr("Decis", "tomate")
        assert datos is not None
        assert datos["autorizado"] is True
        assert datos["periodo_carencia_dias"] == 3
        assert datos["lmr_mg_kg"] == 0.2

    def test_busqueda_case_insensitive(self):
        datos = lmr_service.get_lmr("DECIS", "TOMATE")
        assert datos is not None
        assert datos["autorizado"] is True

    def test_busqueda_por_principio_activo(self):
        datos = lmr_service.get_lmr("Deltametrina", "tomate")
        assert datos is not None
        assert datos["autorizado"] is True

    def test_busqueda_por_nombre_parcial(self):
        datos = lmr_service.get_lmr("Decis 2.5 EC", "pimiento")
        assert datos is not None

    def test_get_carencia_retorna_entero(self):
        carencia = lmr_service.get_carencia("Lorsban", "tomate")
        assert carencia == 21

    def test_todos_los_insumos_tienen_datos(self):
        insumos = lmr_service.list_insumos()
        assert len(insumos) >= 10


class TestInsumoNoExistente:
    def test_insumo_desconocido_retorna_none(self):
        datos = lmr_service.get_lmr("ProductoFicticio123", "tomate")
        assert datos is None

    def test_get_carencia_insumo_desconocido_retorna_none(self):
        carencia = lmr_service.get_carencia("ProductoFicticio123", "tomate")
        assert carencia is None


class TestCultivoNoAutorizado:
    def test_glifosato_en_tomate_no_autorizado(self):
        datos = lmr_service.get_lmr("Roundup", "tomate")
        assert datos is not None
        assert datos["autorizado"] is False

    def test_get_carencia_cultivo_no_autorizado_retorna_none(self):
        carencia = lmr_service.get_carencia("Roundup", "tomate")
        assert carencia is None

    def test_cultivo_inexistente_no_autorizado(self):
        datos = lmr_service.get_lmr("Decis", "cultivo_que_no_existe")
        assert datos is not None
        assert datos["autorizado"] is False
