import json
import uuid
from datetime import date
from typing import Optional
from google import genai
from google.genai import types
from app.core.config import GEMINI_API_KEY

_SYSTEM_PROMPT = """\
Eres un asistente de registro de lotes para TrazaAlimento, una plataforma
de trazabilidad alimentaria para cooperativas en Santa Cruz, Bolivia.

Tu única función es guiar al productor para registrar un lote de producción.
Hacé una pregunta a la vez. Cuando tengas todos los datos, devolvé SOLO
este JSON sin ningún texto adicional:
{
  "cultivo": "",
  "parcela": "",
  "fecha_siembra": "YYYY-MM-DD",
  "insumos": [
    {"nombre": "", "dosis_l_ha": 0.0, "fecha_aplicacion": "YYYY-MM-DD"}
  ],
  "fecha_cosecha": "YYYY-MM-DD",
  "almacenamiento": ""
}

Reglas:
- Si el productor dice "hace dos semanas" o similar, calculá la fecha real
  usando la fecha actual que se te indicará en cada sesión
- Si menciona un nombre comercial, registralo tal cual sin traducirlo
- Si algo no queda claro, pedí aclaración antes de asumir
- Si el productor ingresa una fecha de cosecha anterior a la siembra,
  advertílo y pedí corrección antes de continuar
- Nunca uses tecnicismos. Hablá como técnico de campo, no como científico\
"""

_sessions: dict[str, dict] = {}


def iniciar_sesion() -> tuple[str, dict]:
    session_id = str(uuid.uuid4())
    hoy = date.today().isoformat()
    _sessions[session_id] = {
        "history": [],   # [{role: str, parts: [{text: str}]}]
        "estado": "en_progreso",
        "datos_lote": None,
    }
    primer_msg = f"[Fecha actual: {hoy}] El productor quiere registrar un nuevo lote. Comenzá con la primera pregunta."
    resultado = procesar_mensaje(session_id, primer_msg)
    return session_id, resultado


def procesar_mensaje(session_id: str, mensaje: str) -> dict:
    if session_id not in _sessions:
        raise ValueError(f"Sesión '{session_id}' no encontrada")

    session = _sessions[session_id]
    if session["estado"] == "completada":
        return {
            "respuesta": "Sesión ya completada.",
            "estado": "completada",
            "datos_lote": session["datos_lote"],
        }

    client = genai.Client(api_key=GEMINI_API_KEY)
    chat = client.chats.create(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(system_instruction=_SYSTEM_PROMPT),
        history=session["history"],
    )
    response = chat.send_message(mensaje)
    respuesta_texto = response.text

    session["history"].append({"role": "user", "parts": [{"text": mensaje}]})
    session["history"].append({"role": "model", "parts": [{"text": respuesta_texto}]})

    datos_lote: Optional[dict] = None
    try:
        datos_lote = json.loads(respuesta_texto)
        if isinstance(datos_lote, dict) and "cultivo" in datos_lote and "fecha_cosecha" in datos_lote:
            session["estado"] = "completada"
            session["datos_lote"] = datos_lote
        else:
            datos_lote = None
    except (json.JSONDecodeError, ValueError):
        pass

    return {
        "respuesta": respuesta_texto,
        "estado": session["estado"],
        "datos_lote": datos_lote,
    }


def obtener_sesion(session_id: str) -> Optional[dict]:
    session = _sessions.get(session_id)
    if session is None:
        return None
    return {
        "session_id": session_id,
        "estado": session["estado"],
        "datos_lote": session.get("datos_lote"),
        "turnos": len([m for m in session["history"] if m["role"] == "user"]),
    }
