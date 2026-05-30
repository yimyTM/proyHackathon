import json
from pathlib import Path
from typing import Optional

_DATA_PATH = Path(__file__).parent.parent / "data" / "lmr.json"


class LMRService:
    def __init__(self) -> None:
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)

        # index: normalized_key -> {cultivos: {cultivo_lower: entry}, meta}
        self._by_comercial: dict[str, dict] = {}
        self._by_principio: dict[str, dict] = {}

        for insumo in raw["insumos"]:
            entry = {
                "nombre_comercial": insumo["nombre_comercial"],
                "principio_activo": insumo["principio_activo"],
                "grupo_quimico": insumo.get("grupo_quimico", ""),
                "cultivos": {c["cultivo"].lower(): c for c in insumo["cultivos"]},
            }
            self._by_comercial[insumo["nombre_comercial"].lower()] = entry
            self._by_principio[insumo["principio_activo"].lower()] = entry

    def _find_insumo(self, nombre: str) -> Optional[dict]:
        nombre_lower = nombre.lower()
        if nombre_lower in self._by_comercial:
            return self._by_comercial[nombre_lower]
        if nombre_lower in self._by_principio:
            return self._by_principio[nombre_lower]
        for key, data in self._by_comercial.items():
            if key in nombre_lower or nombre_lower in key:
                return data
        for key, data in self._by_principio.items():
            if key in nombre_lower or nombre_lower in key:
                return data
        return None

    def get_lmr(self, nombre: str, cultivo: str) -> Optional[dict]:
        """Returns full cultivo entry + autorizado flag, or None if insumo unknown."""
        insumo_data = self._find_insumo(nombre)
        if insumo_data is None:
            return None

        cultivo_lower = cultivo.lower()
        cultivo_entry = insumo_data["cultivos"].get(cultivo_lower)

        if cultivo_entry is None:
            return {
                "autorizado": False,
                "fuente_normativa": "Codex Alimentarius",
                "nombre_comercial": insumo_data["nombre_comercial"],
                "principio_activo": insumo_data["principio_activo"],
            }

        return {
            **cultivo_entry,
            "autorizado": True,
            "fuente_normativa": f"Codex Alimentarius ({cultivo_entry.get('fuente', 'codex')})",
            "nombre_comercial": insumo_data["nombre_comercial"],
            "principio_activo": insumo_data["principio_activo"],
        }

    def get_carencia(self, nombre: str, cultivo: str) -> Optional[int]:
        data = self.get_lmr(nombre, cultivo)
        if data is None or not data.get("autorizado"):
            return None
        return data.get("periodo_carencia_dias")

    def list_insumos(self) -> list[str]:
        return [v["nombre_comercial"] for v in self._by_comercial.values()]


lmr_service = LMRService()
