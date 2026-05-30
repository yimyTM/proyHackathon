from google import genai
from google.genai import types
from app.core.config import GEMINI_API_KEY
from app.services.motor_analisis import AlertaLote

_SYSTEM_PROMPT = """\
Eres el asistente de TrazaAlimento. Recibirás alertas de inocuidad
de un lote agrícola en formato estructurado.
Tu tarea es generar una explicación clara en español para el usuario.
Adapta el tono y nivel técnico según el rol indicado:
- productor: lenguaje simple, máximo 3 oraciones, qué debe hacer
- comprador: incluir referencia normativa y riesgo concreto para el consumidor
- auditor: detalle técnico completo con fuente y valores exactos
Responde SOLO con la explicación, sin saludos ni introducciones.\
"""


def generar_explicacion(alerta: AlertaLote, rol: str = "productor") -> str:
    client = genai.Client(api_key=GEMINI_API_KEY)

    lineas = [
        "Alerta de inocuidad:",
        f"- Insumo: {alerta.insumo}",
        f"- Tipo de alerta: {alerta.tipo}",
        f"- Detalle técnico: {alerta.detalle}",
        f"- Fuente normativa: {alerta.fuente_normativa}",
    ]
    if alerta.dias_requeridos is not None:
        lineas.append(f"- Días de carencia requeridos: {alerta.dias_requeridos}")
    if alerta.dias_transcurridos is not None:
        lineas.append(f"- Días transcurridos desde aplicación hasta cosecha: {alerta.dias_transcurridos}")
    lineas.append(f"\nRol del usuario: {rol}")

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="\n".join(lineas),
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            max_output_tokens=400,
        ),
    )
    return response.text
