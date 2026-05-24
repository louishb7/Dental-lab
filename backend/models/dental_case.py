"""
Módulo contendo o modelo de dados do Caso Odontológico (DentalCase).
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.connection import Base


class DentalCase(Base):
    """
    Modelo ORM que representa um Caso Odontológico enviado ao laboratório.

    Atributos:
        id (int): Identificador único do caso.
        doctor_id (int): Chave estrangeira referenciando o Doutor dono do caso.
        patient_name (str): Nome ou código identificador do paciente.
        deadline (datetime): Prazo de entrega estipulado.
        status (str): Estado atual do caso (ex: 'pending', 'completed', 'delivered').
        total_value (Numeric): Valor financeiro total do caso. Utiliza Decimal para precisão absoluta.
        notes (str): Informações técnicas ou observações do caso.
        created_at (datetime): Data e hora do registro.
        doctor (Doctor): Relacionamento N:1 com o modelo Doctor.
        items (list[CaseItem]): Relacionamento 1:N com os trabalhos internos (CaseItem) associados ao caso.
    """

    __tablename__ = "dental_cases"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(
        Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False
    )
    patient_name = Column(String(150), nullable=False)
    deadline = Column(DateTime(timezone=True))
    status = Column(String(50), default="pending", index=True)
    total_value = Column(Numeric(10, 2), default=0.00)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("Doctor", back_populates="cases")

    items = relationship(
        "CaseItem", back_populates="dental_case", cascade="all, delete-orphan"
    )
