"""
Módulo contendo o modelo de dados do Item do Caso.
"""

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from backend.database.connection import Base


class CaseItem(Base):
    """
    Modelo ORM que representa um trabalho individual dentro de um caso.

    Atributos:
        id (int): Identificador único do item.
        case_id (int): Chave estrangeira vinculando este item a um DentalCase.
        tooth (str): Número do dente em FDI ou descrição livre.
        service_type (str): Tipo de serviço executado.
        quantity (int): Quantidade de unidades comerciais deste serviço.
        unit_value (Decimal | None): Valor unitário do serviço.
        material (str): Material utilizado.
        color (str): Cor ou tonalidade.
        notes (str): Observações específicas do item.
        case (DentalCase): Relacionamento N:1 com o modelo DentalCase.
    """

    __tablename__ = "case_items"

    id = Column(Integer, primary_key=True)
    case_id = Column(
        Integer,
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tooth = Column(String(100), nullable=False)
    service_type = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False, default=1, server_default="1")
    unit_value = Column(Numeric(10, 2), nullable=True)
    material = Column(String(100))
    color = Column(String(50))
    notes = Column(Text)

    case = relationship("DentalCase", back_populates="items")
