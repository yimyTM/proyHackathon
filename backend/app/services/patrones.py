from datetime import date, timedelta
from typing import Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.models.lote import Lote
from app.models.alerta import AlertaSanitaria


def analizar_patrones(db: Session) -> list[dict]:
    """Detect alert patterns in lotes registered in the last 30 days."""
    fecha_limite = date.today() - timedelta(days=30)

    lotes = (
        db.query(Lote)
        .filter(Lote.created_at >= fecha_limite)
        .all()
    )

    if not lotes:
        return []

    registros = []
    for lote in lotes:
        municipio = "desconocido"
        if lote.cooperativa:
            municipio = lote.cooperativa.municipio

        for alerta in lote.alertas:
            registros.append({
                "lote_id": lote.id,
                "municipio": municipio,
                "cooperativa_id": lote.cooperativa_id or "sin_cooperativa",
                "tipo_alerta": alerta.tipo,
                "insumo": alerta.insumo,
                "estado": lote.estado,
            })

    if not registros:
        return []

    df = pd.DataFrame(registros)
    alertas_nuevas: list[dict] = []

    # Patron 1: geographic concentration — 3+ lotes mismo municipio + mismo tipo
    alertas_activas = df[df["tipo_alerta"].isin(["carencia_insuficiente", "dosis_excedida", "no_autorizado"])]
    if not alertas_activas.empty:
        concentracion = (
            alertas_activas
            .groupby(["municipio", "tipo_alerta"])["lote_id"]
            .nunique()
            .reset_index(name="n_lotes")
        )
        for _, row in concentracion[concentracion["n_lotes"] >= 3].iterrows():
            mask = (df["municipio"] == row["municipio"]) & (df["tipo_alerta"] == row["tipo_alerta"])
            lotes_zona = df[mask]["lote_id"].unique().tolist()
            alertas_nuevas.append({
                "zona": row["municipio"],
                "tipo_patron": "concentracion_geografica",
                "lotes_involucrados": lotes_zona,
                "insumo_recurrente": None,
                "periodo_analizado_dias": 30,
                "nivel": "critica" if row["n_lotes"] >= 5 else "preventiva",
            })

    # Patron 2: recurring unknown inputs — same insumo appears 5+ times in sin_datos_lmr
    sin_datos = df[df["tipo_alerta"] == "sin_datos_lmr"]
    if not sin_datos.empty:
        conteo = sin_datos.groupby("insumo")["lote_id"].nunique().reset_index(name="n_lotes")
        for _, row in conteo[conteo["n_lotes"] >= 5].iterrows():
            alertas_nuevas.append({
                "zona": "general",
                "tipo_patron": "insumo_sin_datos_recurrente",
                "lotes_involucrados": df[df["insumo"] == row["insumo"]]["lote_id"].unique().tolist(),
                "insumo_recurrente": row["insumo"],
                "periodo_analizado_dias": 30,
                "nivel": "informativa",
            })

    # Patron 3: high rejection rate per cooperativa (>30%)
    por_lote = df.drop_duplicates("lote_id")[["lote_id", "cooperativa_id", "estado"]]
    if not por_lote.empty:
        stats = (
            por_lote
            .groupby("cooperativa_id")
            .agg(
                total=("lote_id", "count"),
                rechazados=("estado", lambda x: x.isin(["OBSERVADO", "NO APTO"]).sum()),
            )
            .reset_index()
        )
        stats["tasa"] = stats["rechazados"] / stats["total"]
        for _, row in stats[stats["tasa"] > 0.30].iterrows():
            lotes_coop = por_lote[por_lote["cooperativa_id"] == row["cooperativa_id"]]["lote_id"].tolist()
            alertas_nuevas.append({
                "zona": row["cooperativa_id"],
                "tipo_patron": "tasa_rechazo",
                "lotes_involucrados": lotes_coop,
                "insumo_recurrente": None,
                "periodo_analizado_dias": 30,
                "nivel": "preventiva",
            })

    return alertas_nuevas


def guardar_alertas_sanitarias(db: Session, alertas: list[dict]) -> list[AlertaSanitaria]:
    guardadas = []
    for a in alertas:
        alerta_db = AlertaSanitaria(
            zona=a["zona"],
            tipo_patron=a["tipo_patron"],
            lotes_involucrados=a["lotes_involucrados"],
            insumo_recurrente=a.get("insumo_recurrente"),
            periodo_analizado_dias=a["periodo_analizado_dias"],
            nivel=a["nivel"],
            recomendacion_automatica=a.get("recomendacion_automatica"),
        )
        db.add(alerta_db)
        guardadas.append(alerta_db)
    db.commit()
    return guardadas
