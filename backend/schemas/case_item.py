"""
Schemas Pydantic para a entidade CaseItem.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CaseItemBase(BaseModel):
    """Campos compartilhados entre criação, atualização e resposta."""

    tooth: str = Field(
        ..., description="FDI entre 11 e 48 ou descrição livre para próteses"
    )
    service_type: str = Field(
        ..., description="Tipo de serviço executado"
    )
    material: Optional[str] = Field(
        default=None, description="Material utilizado no trabalho"
    )
    color: Optional[str] = Field(
        default=None, description="Escala de cor ou tonalidade"
    )
    notes: Optional[str] = Field(
        default=None, description="Observações específicas do trabalho"
    )

    @field_validator("tooth")
    @classmethod
    def validate_tooth(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("O campo tooth não pode ser vazio")

        if normalized.isdigit():
            tooth_number = int(normalized)
            if tooth_number < 11 or tooth_number > 48:
                raise ValueError(
                    "Quando numérico, o campo tooth deve estar entre 11 e 48"
                )

        return normalized


class CaseItemCreate(CaseItemBase):
    """Payload para criação de um item de caso."""

    pass


class CaseItemResponse(CaseItemBase):
    """Resposta serializada de um item de caso."""

    id: int = Field(..., description="ID único do item")
    case_id: int = Field(
        ..., description="ID do caso ao qual este item pertence"
    )

    model_config = ConfigDict(from_attributes=True)
