"""
Módulo de Schemas Pydantic para a entidade CaseItem (Item do Caso).
Responsável pela validação de dados de entrada e formatação de saída dos trabalhos internos.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from decimal import Decimal


class CaseItemBase(BaseModel):
    """
    Schema base contendo os atributos comuns de um Item do Caso.
    Usado para compartilhar campos entre os schemas de Criação e Resposta.
    """

    tooth: Optional[int] = Field(
        default=None, description="Número identificador do dente (ex: 11, 36)"
    )
    service_type: str = Field(
        ..., description="Tipo de serviço executado (ex: coroa, faceta)"
    )
    material: Optional[str] = Field(
        default=None, description="Material utilizado no trabalho"
    )
    color: Optional[str] = Field(
        default=None, description="Escala de cor (ex: A1, B2)"
    )
    value: Decimal = Field(
        default=Decimal("0.00"),
        description="Valor financeiro do item",
        decimal_places=2,
    )
    notes: Optional[str] = Field(
        default=None, description="Observações específicas do trabalho"
    )


class CaseItemCreate(CaseItemBase):
    """
    Schema de validação para a criação de um novo Item do Caso.
    Herda todos os campos de CaseItemBase.
    """

    pass


class CaseItemResponse(CaseItemBase):
    """
    Schema de formatação para a resposta da API ao consultar um Item do Caso.
    Inclui os identificadores gerados pelo banco de dados.
    """

    id: int = Field(..., description="ID único do item")
    case_id: int = Field(
        ..., description="ID do caso odontológico ao qual este item pertence"
    )

    # Configuração do Pydantic V2 para ler dados diretamente de objetos ORM do SQLAlchemy
    model_config = ConfigDict(from_attributes=True)
