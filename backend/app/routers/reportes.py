from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from typing import Optional, List, Any
import pandas as pd
import io

from app.core.database import get_db
from app.core.config import API_KEY
from app.models.lote import Lote
from app.services.lmr_service import lmr_service

router = APIRouter()


def _check_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


def _ok(data: Any) -> dict:
    return {"data": data, "error": None}


def _query_lotes(db: Session, periodo_dias: int, cooperativa_id: Optional[str] = None) -> List[Lote]:
    fecha_limite = date.today() - timedelta(days=periodo_dias)
    q = db.query(Lote).filter(Lote.created_at >= fecha_limite)
    if cooperativa_id:
        q = q.filter(Lote.cooperativa_id == cooperativa_id)
    return q.all()


def _excel_response(df: pd.DataFrame, filename: str, sheet: str = "Datos") -> StreamingResponse:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet, index=False)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── Reporte 1: Inocuidad por cooperativa ─────────────────────────────────────

@router.get("/cooperativa/{cooperativa_id}")
def reporte_cooperativa(
    cooperativa_id: str,
    periodo_dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lotes = _query_lotes(db, periodo_dias, cooperativa_id)
    if not lotes:
        return _ok({"resumen": {"APTO": 0, "OBSERVADO": 0, "NO APTO": 0},
                    "insumos_problematicos": [], "tendencia_mensual": []})

    resumen: dict = {"APTO": 0, "OBSERVADO": 0, "NO APTO": 0}
    for lote in lotes:
        resumen[lote.estado] = resumen.get(lote.estado, 0) + 1

    alertas_flat = [
        {"insumo": a.insumo}
        for lote in lotes for a in lote.alertas if a.tipo != "sin_datos_lmr"
    ]
    if alertas_flat:
        top = (
            pd.DataFrame(alertas_flat)
            .groupby("insumo").size()
            .sort_values(ascending=False).head(5)
            .reset_index(name="alertas")
            .to_dict(orient="records")
        )
    else:
        top = []

    lotes_df = pd.DataFrame([
        {"fecha": pd.to_datetime(lote.fecha_cosecha), "estado": lote.estado}
        for lote in lotes
    ])
    lotes_df["mes"] = lotes_df["fecha"].dt.to_period("M").astype(str)
    tendencia = []
    for mes, g in lotes_df.groupby("mes"):
        c = g["estado"].value_counts().to_dict()
        tendencia.append({
            "mes": mes,
            "APTO": c.get("APTO", 0),
            "OBSERVADO": c.get("OBSERVADO", 0),
            "NO_APTO": c.get("NO APTO", 0),
        })

    return _ok({
        "resumen": resumen,
        "insumos_problematicos": top,
        "tendencia_mensual": sorted(tendencia, key=lambda x: x["mes"]),
    })


@router.get("/cooperativa/{cooperativa_id}/excel")
def reporte_cooperativa_excel(
    cooperativa_id: str,
    periodo_dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lotes = _query_lotes(db, periodo_dias, cooperativa_id)
    rows = [{"Lote ID": l.id, "Cultivo": l.cultivo, "Parcela": l.parcela or "",
             "Fecha Cosecha": l.fecha_cosecha.isoformat(), "Estado": l.estado,
             "N° Alertas": len(l.alertas)} for l in lotes]
    df = pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["Lote ID", "Cultivo", "Parcela", "Fecha Cosecha", "Estado", "N° Alertas"])
    return _excel_response(df, f"reporte_cooperativa_{cooperativa_id}.xlsx", "Lotes")


# ─── Reporte 2: Mapa de riesgo por zona ──────────────────────────────────────

@router.get("/zonas")
def reporte_zonas(
    periodo_dias: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lotes = _query_lotes(db, periodo_dias)
    if not lotes:
        return _ok({"zonas": [], "periodo_analizado_dias": periodo_dias,
                    "generado_en": datetime.utcnow().isoformat()})

    records = [{"municipio": (l.cooperativa.municipio if l.cooperativa else "Sin municipio"),
                "estado": l.estado, "lote_id": l.id} for l in lotes]
    df = pd.DataFrame(records)
    zonas = (
        df.groupby("municipio")
        .agg(total_lotes=("lote_id", "count"),
             aptos=("estado", lambda x: (x == "APTO").sum()),
             observados=("estado", lambda x: (x == "OBSERVADO").sum()),
             no_aptos=("estado", lambda x: (x == "NO APTO").sum()))
        .reset_index()
    )
    zonas["tasa_aprobacion"] = (zonas["aptos"] / zonas["total_lotes"] * 100).round(1)
    zonas = zonas.sort_values("tasa_aprobacion", ascending=False)

    return _ok({"zonas": zonas.to_dict(orient="records"),
                "periodo_analizado_dias": periodo_dias,
                "generado_en": datetime.utcnow().isoformat()})


@router.get("/zonas/excel")
def reporte_zonas_excel(
    periodo_dias: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    res = reporte_zonas(periodo_dias=periodo_dias, db=db, _=None)
    zonas = res["data"]["zonas"]
    rows = [{"Municipio": z["municipio"], "Total Lotes": z["total_lotes"],
             "Aptos": z["aptos"], "Observados": z["observados"],
             "No Aptos": z["no_aptos"], "% Aprobación": z["tasa_aprobacion"]}
            for z in zonas]
    df = pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["Municipio", "Total Lotes", "Aptos", "Observados", "No Aptos", "% Aprobación"])
    return _excel_response(df, "mapa_riesgo_zonas.xlsx", "Mapa de Riesgo")


# ─── Reporte 3: Ficha de exportación por lote ────────────────────────────────

@router.get("/lote/{lote_id}/exportacion")
def reporte_exportacion(
    lote_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    tabla = []
    for ins in lote.insumos:
        datos = lmr_service.get_lmr(ins.nombre, lote.cultivo)
        dias = (lote.fecha_cosecha - ins.fecha_aplicacion).days
        carencia = datos["periodo_carencia_dias"] if datos and datos.get("autorizado") else None
        dosis_max = datos["dosis_maxima"] if datos and datos.get("autorizado") else None
        tabla.append({
            "nombre_comercial": ins.nombre,
            "principio_activo": datos.get("principio_activo", "—") if datos else "—",
            "dosis_aplicada": ins.dosis,
            "dosis_maxima": dosis_max,
            "fecha_aplicacion": ins.fecha_aplicacion.isoformat(),
            "dias_hasta_cosecha": dias,
            "carencia_requerida": carencia,
            "cumple_carencia": "✓" if carencia is not None and dias >= carencia
                               else ("✗" if carencia is not None else "—"),
            "cumple_dosis": "✓" if dosis_max is not None and ins.dosis <= dosis_max
                            else ("✗" if dosis_max is not None else "—"),
        })

    return _ok({
        "lote": {"id": lote.id, "cultivo": lote.cultivo, "parcela": lote.parcela,
                 "fecha_cosecha": lote.fecha_cosecha.isoformat(), "estado": lote.estado,
                 "cooperativa": lote.cooperativa.nombre if lote.cooperativa else "—"},
        "tabla_insumos": tabla,
        "normativa": "Codex Alimentarius + SENASAG Bolivia 2024",
        "generado_en": datetime.utcnow().isoformat(),
    })


@router.get("/lote/{lote_id}/excel")
def reporte_exportacion_excel(
    lote_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    rows = []
    for ins in lote.insumos:
        datos = lmr_service.get_lmr(ins.nombre, lote.cultivo)
        dias = (lote.fecha_cosecha - ins.fecha_aplicacion).days
        carencia = datos["periodo_carencia_dias"] if datos and datos.get("autorizado") else None
        dosis_max = datos["dosis_maxima"] if datos and datos.get("autorizado") else None
        rows.append({
            "Insumo": ins.nombre,
            "Principio Activo": datos.get("principio_activo", "—") if datos else "—",
            "Dosis Aplicada": ins.dosis,
            "Dosis Máxima": dosis_max or "—",
            "Fecha Aplicación": ins.fecha_aplicacion.isoformat(),
            "Días hasta Cosecha": dias,
            "Carencia Requerida": carencia or "—",
            "Cumple Carencia": "Sí" if carencia and dias >= carencia else ("No" if carencia else "Sin datos"),
            "Cumple Dosis": "Sí" if dosis_max and ins.dosis <= dosis_max else ("No" if dosis_max else "Sin datos"),
        })
    df = pd.DataFrame(rows) if rows else pd.DataFrame()
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        pd.DataFrame([{"Lote ID": lote.id, "Cultivo": lote.cultivo,
                       "Fecha Cosecha": lote.fecha_cosecha.isoformat(), "Estado": lote.estado,
                       "Cooperativa": lote.cooperativa.nombre if lote.cooperativa else "—"}
                      ]).to_excel(writer, sheet_name="Lote", index=False)
        df.to_excel(writer, sheet_name="Insumos", index=False)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=ficha_{lote_id}.xlsx"},
    )


@router.get("/lote/{lote_id}/pdf")
def reporte_exportacion_pdf(
    lote_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_api_key),
):
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(status_code=501, detail="reportlab no instalado — usa /excel")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    elems = [
        Paragraph("Ficha de Trazabilidad — TrazaAlimento", styles["Title"]),
        Spacer(1, 0.4*cm),
        Paragraph(f"Lote: {lote.id[:8]}...  |  Cultivo: {lote.cultivo}  |  Estado: {lote.estado}", styles["Heading2"]),
        Paragraph(f"Cooperativa: {lote.cooperativa.nombre if lote.cooperativa else '—'}", styles["Normal"]),
        Paragraph(f"Fecha cosecha: {lote.fecha_cosecha.isoformat()}", styles["Normal"]),
        Spacer(1, 0.5*cm),
    ]
    hdrs = ["Insumo", "Dosis", "F. Aplicación", "Días", "Carencia", "✓Car", "✓Dosis"]
    rows = [hdrs]
    for ins in lote.insumos:
        datos = lmr_service.get_lmr(ins.nombre, lote.cultivo)
        dias = (lote.fecha_cosecha - ins.fecha_aplicacion).days
        carencia = datos["periodo_carencia_dias"] if datos and datos.get("autorizado") else None
        dosis_max = datos["dosis_maxima"] if datos and datos.get("autorizado") else None
        rows.append([ins.nombre[:18], str(ins.dosis), ins.fecha_aplicacion.isoformat(),
                     str(dias), str(carencia or "—"),
                     "✓" if carencia and dias >= carencia else ("✗" if carencia else "—"),
                     "✓" if dosis_max and ins.dosis <= dosis_max else ("✗" if dosis_max else "—")])
    t = Table(rows, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16a34a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
    ]))
    elems += [t, Spacer(1, 0.8*cm),
              Paragraph("Normativa: Codex Alimentarius + SENASAG Bolivia 2024", styles["Normal"])]
    doc.build(elems)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ficha_{lote_id}.pdf"})


# ─── Reporte 4: Ranking de cooperativas (PÚBLICO — sin auth) ─────────────────

@router.get("/ranking")
def reporte_ranking(
    periodo_dias: int = Query(90, ge=1, le=365),
    municipio: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    lotes = _query_lotes(db, periodo_dias)
    if not lotes:
        return _ok({"ranking": [], "periodo_analizado_dias": periodo_dias})

    records = [{"coop_id": l.cooperativa_id or "sin_coop",
                "coop_nombre": (l.cooperativa.nombre if l.cooperativa else "Sin cooperativa"),
                "municipio": (l.cooperativa.municipio if l.cooperativa else "Sin municipio"),
                "estado": l.estado, "lote_id": l.id,
                "fecha_cosecha": l.fecha_cosecha} for l in lotes]
    df = pd.DataFrame(records)
    if municipio:
        df = df[df["municipio"].str.lower() == municipio.lower()]
    if df.empty:
        return _ok({"ranking": [], "periodo_analizado_dias": periodo_dias})

    ranking = (
        df.groupby(["coop_id", "coop_nombre", "municipio"])
        .agg(total_lotes=("lote_id", "count"),
             tasa_aprobacion=("estado", lambda x: round((x == "APTO").mean() * 100, 1)),
             ultimo_lote=("fecha_cosecha", "max"))
        .reset_index()
        .sort_values("tasa_aprobacion", ascending=False)
        .reset_index(drop=True)
    )
    ranking["posicion"] = ranking.index + 1
    ranking["ultimo_lote"] = ranking["ultimo_lote"].apply(
        lambda x: x.isoformat() if hasattr(x, "isoformat") else str(x))
    ranking = ranking.rename(columns={"coop_nombre": "cooperativa"})

    return _ok({"ranking": ranking.to_dict(orient="records"),
                "periodo_analizado_dias": periodo_dias})


@router.get("/ranking/excel")
def reporte_ranking_excel(
    periodo_dias: int = Query(90, ge=1, le=365),
    municipio: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    res = reporte_ranking(periodo_dias=periodo_dias, municipio=municipio, db=db)
    ranking = res["data"]["ranking"]
    rows = [{"Posición": r["posicion"], "Cooperativa": r["cooperativa"], "Municipio": r["municipio"],
             "Total Lotes": r["total_lotes"], "% Aprobación": r["tasa_aprobacion"],
             "Último Lote": r["ultimo_lote"]} for r in ranking]
    df = pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["Posición", "Cooperativa", "Municipio", "Total Lotes", "% Aprobación", "Último Lote"])
    return _excel_response(df, "ranking_cooperativas.xlsx", "Ranking")
