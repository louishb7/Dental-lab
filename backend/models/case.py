"""
Módulo contendo o modelo de dados do Caso.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database.connection import Base


class DentalCase(Base):
    """
    Modelo ORM que representa um caso enviado ao laboratório.

    Atributos:
        id (int): Identificador único do caso.
        doctor_id (int): Chave estrangeira referenciando o doutor dono do caso.
        patient_ref (str): Nome ou código identificador do paciente.
        pricing_mode (str): Tipo de cobrança do caso.
        deadline (datetime): Prazo de entrega estipulado.
        priority (str): Prioridade do caso ('normal' ou 'urgent').
        status (str): Estado atual do caso ('pending', 'completed', 'delivered').
        total_value (Decimal | None): Valor combinado do caso.
        notes (str): Observações gerais do caso.
        created_at (datetime): Data e hora do registro.
        delivered_at (datetime | None): Data de entrega do caso.
        deleted_at (datetime | None): Marca de soft delete.
        status_revert_reason (str | None): Motivo para reverter um caso entregue.
        doctor (Doctor): Relacionamento N:1 com o modelo Doctor.
        items (list[CaseItem]): Trabalhos vinculados ao caso.
    """

    __tablename__ = "cases"

    id = Column(Integer, primary_key=True)
    doctor_id = Column(
        Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False
    )
    patient_ref = Column(String(150), nullable=False, index=True)
    pricing_mode = Column(String(20), nullable=False, default="services", index=True)
    deadline = Column(DateTime(timezone=True))
    priority = Column(String(20), nullable=False, default="normal", index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    total_value = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    status_revert_reason = Column(Text, nullable=True)

    doctor = relationship("Doctor", back_populates="cases")

    items = relationship(
        "CaseItem", back_populates="case", cascade="all, delete-orphan"
    )


Case = DentalCase
