import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AlertaLoteDB(Base):
    __tablename__ = "alertas_lote"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lote_id: Mapped[str] = mapped_column(String(36), ForeignKey("lotes.id"), nullable=False)
    insumo: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    detalle: Mapped[str] = mapped_column(String(500), nullable=False)
    fuente_normativa: Mapped[str] = mapped_column(String(200), nullable=True)
    dias_requeridos: Mapped[int] = mapped_column(Integer, nullable=True)
    dias_transcurridos: Mapped[int] = mapped_column(Integer, nullable=True)

    lote: Mapped["Lote"] = relationship("Lote", back_populates="alertas")


class AlertaSanitaria(Base):
    __tablename__ = "alertas_sanitarias"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    zona: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_patron: Mapped[str] = mapped_column(String(50), nullable=False)
    lotes_involucrados: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    insumo_recurrente: Mapped[str] = mapped_column(String(200), nullable=True)
    periodo_analizado_dias: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    nivel: Mapped[str] = mapped_column(String(20), nullable=False)
    recomendacion_automatica: Mapped[str] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
