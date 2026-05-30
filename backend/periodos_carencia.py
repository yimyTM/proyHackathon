import re

# keyword (lowercase) → datos del agroquímico
AGROQUIMICOS: dict[str, dict] = {
    "mancozeb":     {"carencia": 7,  "dosis_max": 2.5,  "unidad": "kg/ha", "autorizado": True},
    "cipermetrina": {"carencia": 14, "dosis_max": 0.10, "unidad": "l/ha",  "autorizado": True},
    "glifosato":    {"carencia": 3,  "dosis_max": 2.0,  "unidad": "l/ha",  "autorizado": True},
    "carbofuran":   {"carencia": 30, "dosis_max": 0.0,  "unidad": "kg/ha", "autorizado": False},
    "clorpirifos":  {"carencia": 21, "dosis_max": 1.5,  "unidad": "l/ha",  "autorizado": True},
    "imidacloprid": {"carencia": 14, "dosis_max": 0.5,  "unidad": "l/ha",  "autorizado": True},
    "lambda":       {"carencia": 7,  "dosis_max": 0.15, "unidad": "l/ha",  "autorizado": True},
    "deltametrina": {"carencia": 7,  "dosis_max": 0.15, "unidad": "l/ha",  "autorizado": True},
    "abamectina":   {"carencia": 3,  "dosis_max": 0.5,  "unidad": "l/ha",  "autorizado": True},
    "azufre":       {"carencia": 1,  "dosis_max": 3.0,  "unidad": "kg/ha", "autorizado": True},
    "cobre":        {"carencia": 3,  "dosis_max": 2.0,  "unidad": "kg/ha", "autorizado": True},
    "captan":       {"carencia": 7,  "dosis_max": 2.0,  "unidad": "kg/ha", "autorizado": True},
    "thiram":       {"carencia": 14, "dosis_max": 2.5,  "unidad": "kg/ha", "autorizado": True},
    "malathion":    {"carencia": 7,  "dosis_max": 1.0,  "unidad": "l/ha",  "autorizado": True},
    "spinosad":     {"carencia": 3,  "dosis_max": 0.5,  "unidad": "l/ha",  "autorizado": True},
    "npk":          {"carencia": 0,  "dosis_max": 500.0,"unidad": "kg/ha", "autorizado": True},
    "compost":      {"carencia": 0,  "dosis_max": 5000.0,"unidad":"kg/ha", "autorizado": True},
    "urea":         {"carencia": 0,  "dosis_max": 200.0,"unidad": "kg/ha", "autorizado": True},
    "fertilizante": {"carencia": 0,  "dosis_max": 500.0,"unidad": "kg/ha", "autorizado": True},
}


def buscar_agroquimico(nombre: str) -> tuple[str | None, dict | None]:
    """Devuelve (keyword_encontrada, datos) buscando por substring en el nombre."""
    nombre_lower = nombre.lower()
    for keyword, datos in AGROQUIMICOS.items():
        if keyword in nombre_lower:
            return keyword, datos
    return None, None


def parsear_dosis(dosis_str: str) -> float:
    """Extrae el número de un string como '2.5 kg/ha' → 2.5. Retorna 0.0 si no puede."""
    match = re.search(r"[\d]+[.,]?[\d]*", dosis_str)
    if match:
        return float(match.group().replace(",", "."))
    return 0.0
