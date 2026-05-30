from datetime import date, datetime
from models import AnalisisRequest
from periodos_carencia import buscar_agroquimico, parsear_dosis

BASE_CONFIANZA = 1.00
UMBRAL_ZONA_CRITICA = 0.20   # 20% final del período de carencia


def analizar_lote(req: AnalisisRequest) -> dict:
    motivos: list[str] = []
    alerta = "VERDE"
    estado = "APTO"
    confianza = BASE_CONFIANZA

    hoy = date.today()
    fecha_cosecha = datetime.fromisoformat(req.fecha_cosecha).date()
    dias_hasta_cosecha = (fecha_cosecha - hoy).days

    # ── Regla 1-3: análisis por insumo ──────────────────────────────────────
    for insumo in req.insumos:
        keyword, datos = buscar_agroquimico(insumo.nombre)

        if datos is None:
            continue  # fertilizante u orgánico desconocido → ignorar

        # Regla extra: insumo no autorizado
        if not datos["autorizado"]:
            alerta = "ROJA"
            estado = "NO_APTO"
            motivos.append(f"{insumo.nombre}: producto NO AUTORIZADO para cultivos alimenticios")
            continue

        carencia_dias: int = datos["carencia"]
        dosis_max: float = datos["dosis_max"]

        if carencia_dias == 0:
            continue  # fertilizante sin carencia

        fecha_aplic = datetime.fromisoformat(insumo.fecha).date()
        dias_desde_aplicacion = (hoy - fecha_aplic).days
        dias_restantes_carencia = carencia_dias - dias_desde_aplicacion

        # Regla 1: cosecha antes de que termine la carencia → ROJA
        if dias_hasta_cosecha < dias_restantes_carencia:
            alerta = "ROJA"
            estado = "NO_APTO"
            faltante = dias_restantes_carencia - dias_hasta_cosecha
            motivos.append(
                f"{insumo.nombre}: carencia {carencia_dias} días, "
                f"cosecha en {dias_hasta_cosecha} días "
                f"(faltan {faltante} día(s) más)"
            )

        # Regla 2: dentro del 20% final del período → AMARILLA
        elif carencia_dias > 0 and dias_hasta_cosecha <= carencia_dias * UMBRAL_ZONA_CRITICA:
            if alerta != "ROJA":
                alerta = "AMARILLA"
                if estado == "APTO":
                    estado = "ATENCION"
            motivos.append(
                f"{insumo.nombre}: zona crítica, "
                f"{dias_hasta_cosecha} día(s) hasta cosecha (carencia: {carencia_dias} días)"
            )

        # Regla 3: dosis supera máximo
        dosis_val = parsear_dosis(insumo.dosis)
        if dosis_max > 0 and dosis_val > dosis_max:
            alerta = "ROJA"
            estado = "NO_APTO"
            exceso = round(dosis_val - dosis_max, 3)
            motivos.append(
                f"{insumo.nombre}: dosis {dosis_val} supera máximo "
                f"{dosis_max} {datos['unidad']} (exceso +{exceso})"
            )

    # ── Regla 4: alertas sanitarias vecinas (<10 km, mismo cultivo) ─────────
    for av in req.alertas_vecinas:
        if (av.distancia_km < 10 and
                av.cultivo_afectado.lower() == req.cultivo.lower()):
            if alerta != "ROJA":
                alerta = "AMARILLA"
                if estado == "APTO":
                    estado = "ATENCION"
            motivos.append(
                f"Alerta sanitaria: {av.agente} a {av.distancia_km} km "
                f"en {av.cultivo_afectado}"
            )

    # ── Regla 5: historial de rechazos (−hasta 20% confianza) ───────────────
    if req.total_envios > 0 and req.rechazos_previos > 0:
        tasa = req.rechazos_previos / req.total_envios
        penalizacion = min(tasa, 1.0) * 0.20
        confianza -= penalizacion
        motivos.append(
            f"Historial: {req.rechazos_previos} rechazo(s) de "
            f"{req.total_envios} envios (-{round(penalizacion * 100)}% confianza)"
        )

    # ── Regla 6: test rápido negativo (+15% confianza) ───────────────────────
    if req.test_rapido_negativo:
        confianza += 0.15
        motivos.append("Test rápido negativo reciente (+15% confianza)")

    # ── Ajuste final de confianza ─────────────────────────────────────────────
    if estado == "NO_APTO":
        confianza = 0.0
    confianza_pct = int(max(0.0, min(1.0, confianza)) * 100)

    if not motivos:
        motivos = ["Sin observaciones. Lote en condiciones normales."]

    recomendacion = _recomendacion(estado, alerta, req, dias_hasta_cosecha)

    qr_contenido = (
        f"Lote:{req.lote_id}|Cultivo:{req.cultivo}|Estado:{estado}|"
        f"Alerta:{alerta}|Cosecha:{req.fecha_cosecha}|"
        f"Confianza:{confianza_pct}%|{motivos[0][:50]}"
    )

    return {
        "estado": estado,
        "alerta": alerta,
        "motivos": motivos,
        "confianza": confianza_pct,
        "recomendacion": recomendacion,
        "qr_contenido": qr_contenido,
    }


def _recomendacion(estado: str, alerta: str, req: AnalisisRequest, dias: int) -> str:
    if estado == "NO_APTO":
        return (
            "No cosechar. Revisar períodos de carencia y dosis. "
            "Notificar al técnico de la cooperativa."
        )
    if alerta == "AMARILLA":
        tiene_sanitaria = any(
            a.distancia_km < 10 and a.cultivo_afectado.lower() == req.cultivo.lower()
            for a in req.alertas_vecinas
        )
        if tiene_sanitaria:
            return "Realizar análisis de residuos antes de cosechar. Zona con presión sanitaria activa."
        return (
            f"Lote en zona crítica de carencia. "
            f"Confirmar fecha exacta con agrónomo antes de cosechar en {dias} día(s)."
        )
    return "Lote apto para cosecha. Mantener documentación actualizada."
