"""
Módulo contendo o modelo de dados do Doutor (Dentista/Cliente).
"""

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.connection import Base


class Doctor(Base):
    """
    Modelo ORM que representa um Doutor no sistema Cadista.

    Atributos:
        id (int): Identificador único do doutor.
        name (str): Nome do doutor/dentista.
        clinic_name (str): Nome da clínica associada.
        phone (str): Telefone de contato.
        notes (str): Observações gerais sobre o doutor.
        created_at (datetime): Data e hora da criação do registro.
        cases (list[Case]): Relacionamento 1:N indicando os casos vinculados a este doutor.
    """

    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    clinic_name = Column(String(150))
    phone = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    cases = relationship("Case", back_populates="doctor")
