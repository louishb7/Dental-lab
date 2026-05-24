"""
Módulo contendo o modelo de dados do Item do Caso (CaseItem).
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from backend.database.connection import Base


class CaseItem(Base):
    """
    Modelo ORM que representa um trabalho individual dentro de um Caso Odontológico.

    Atributos:
        id (int): Identificador único do item de trabalho.
        case_id (int): Chave estrangeira vinculando este item a um DentalCase.
        tooth (int): Número que identifica o dente trabalhado (ex: 11, 21, 36).
        service_type (str): O tipo de serviço realizado (ex: 'coroa', 'faceta').
        material (str): O material utilizado no trabalho (ex: 'zircônia').
        color (str): A escala de cor utilizada (ex: 'A1').
        value (Numeric): Valor financeiro cobrado especificamente por este item.
        notes (str): Observações específicas do item.
        dental_case (DentalCase): Relacionamento N:1 com o modelo DentalCase.
    """

    __tablename__ = "case_items"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(
        Integer,
        ForeignKey("dental_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    tooth = Column(Integer)
    service_type = Column(String(100), nullable=False)
    material = Column(String(100))
    color = Column(String(50))
    value = Column(Numeric(10, 2), default=0.00)
    notes = Column(Text)

    dental_case = relationship("DentalCase", back_populates="items")
