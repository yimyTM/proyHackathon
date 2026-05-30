import uuid
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Lote(Base):
    __tablename__ = "lotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cooperativa_id: Mapped[str] = mapped_column(String(36), ForeignKey("cooperativas.id"), nullable=True)
    cultivo: Mapped[str] = mapped_column(String(100), nullable=False)
    parcela: Mapped[str] = mapped_column(String(200), nullable=True)
    fecha_siembra: Mapped[date] = mapped_column(Date, nullable=True)
    fecha_cosecha: Mapped[date] = mapped_column(Date, nullable=False)
    almacenamiento: Mapped[str] = mapped_column(String(200), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDIENTE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cooperativa: Mapped["Cooperativa"] = relationship("Cooperativa", back_populates="lotes")
    insumos: Mapped[list["InsumoAplicadoDB"]] = relationship("InsumoAplicadoDB", back_populates="lote", cascade="all, delete-orphan")
    alertas: Mapped[list["AlertaLoteDB"]] = relationship("AlertaLoteDB", back_populates="lote", cascade="all, delete-orphan")
