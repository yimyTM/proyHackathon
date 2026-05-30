import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Cooperativa(Base):
    __tablename__ = "cooperativas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    municipio: Mapped[str] = mapped_column(String(100), nullable=False)
    producto_principal: Mapped[str] = mapped_column(String(100), nullable=True)
    contacto_email: Mapped[str] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lotes: Mapped[list["Lote"]] = relationship("Lote", back_populates="cooperativa")
