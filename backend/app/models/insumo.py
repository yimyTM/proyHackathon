import uuid
from datetime import date
from sqlalchemy import String, Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class InsumoAplicadoDB(Base):
    __tablename__ = "insumos_aplicados"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lote_id: Mapped[str] = mapped_column(String(36), ForeignKey("lotes.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    dosis: Mapped[float] = mapped_column(Float, nullable=False)
    fecha_aplicacion: Mapped[date] = mapped_column(Date, nullable=False)

    lote: Mapped["Lote"] = relationship("Lote", back_populates="insumos")
