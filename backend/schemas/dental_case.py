"""
Módulo de Schemas Pydantic para a entidade DentalCase (Caso Odontológico).
Responsável pela validação de dados de entrada e formatação de saída dos pedidos do laboratório.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from backend.schemas.case_item import CaseItemResponse


class DentalCaseBase(BaseModel):
    """
    Schema base contendo os atributos principais de um Caso Odontológico.
    """

    patient_name: str = Field(
        ..., description="Nome ou identificador do paciente"
    )
    deadline: Optional[datetime] = Field(
        default=None, description="Prazo de entrega acordado"
    )
    status: str = Field(
        default="pending",
        description="Status atual (pending, completed, delivered)",
    )
    total_value: Decimal = Field(
        default=Decimal("0.00"),
        description="Valor financeiro total do caso",
        decimal_places=2,
    )
    notes: Optional[str] = Field(
        default=None, description="Observações ou instruções técnicas do caso"
    )


class DentalCaseCreate(DentalCaseBase):
    """
    Schema de validação para criar um novo Caso Odontológico.
    Requer obrigatoriamente o ID do Doutor ao qual o caso pertence.
    """

    doctor_id: int = Field(
        ..., description="ID do doutor (cliente) dono deste caso"
    )


class DentalCaseResponse(DentalCaseBase):
    """
    Schema de formatação de saída para um Caso Odontológico.
    Inclui os itens de trabalho associados a este caso para facilitar o frontend.
    """

    id: int = Field(..., description="ID único do caso")
    doctor_id: int = Field(..., description="ID do doutor associado")
    created_at: datetime = Field(
        ..., description="Data e hora de criação do caso"
    )

    # Retorna automaticamente a lista de itens atrelados a este caso
    items: List[CaseItemResponse] = Field(
        default=[], description="Lista de trabalhos internos do caso"
    )

    model_config = ConfigDict(from_attributes=True)
