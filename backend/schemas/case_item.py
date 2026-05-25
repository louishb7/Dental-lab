"""
Schemas Pydantic para a entidade CaseItem.
"""

from __future__ import annotations

from typing import Optional
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CaseItemBase(BaseModel):
    """Campos compartilhados entre criação, atualização e resposta."""

    tooth: str = Field(
        ..., description="FDI entre 11 e 48 ou descrição livre para próteses"
    )
    service_type: str = Field(
        ..., description="Tipo de serviço executado"
    )
    unit_value: Optional[Decimal] = Field(
        default=None, description="Valor unitário do serviço"
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

    @field_validator("unit_value", mode="before")
    @classmethod
    def normalize_unit_value(cls, value):
        if value is None or value == "":
            return None

        if isinstance(value, Decimal):
            return value

        if isinstance(value, (int, float)):
            return Decimal(str(value))

        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return None

            normalized = normalized.replace(".", "").replace(",", ".")
            try:
                return Decimal(normalized)
            except InvalidOperation as exc:
                raise ValueError("Valor unitário inválido") from exc

        return value


class CaseItemCreate(CaseItemBase):
    """Payload para criação de um item de caso."""

    pass


class CaseItemUpdate(BaseModel):
    """Payload parcial para atualização de um item de caso."""

    tooth: Optional[str] = None
    service_type: Optional[str] = None
    unit_value: Optional[Decimal] = Field(
        default=None, description="Valor unitário do serviço"
    )
    material: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("tooth")
    @classmethod
    def validate_tooth_update(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value

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

    @field_validator("unit_value", mode="before")
    @classmethod
    def normalize_unit_value(cls, value):
        if value is None or value == "":
            return None

        if isinstance(value, Decimal):
            return value

        if isinstance(value, (int, float)):
            return Decimal(str(value))

        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return None

            normalized = normalized.replace(".", "").replace(",", ".")
            try:
                return Decimal(normalized)
            except InvalidOperation as exc:
                raise ValueError("Valor unitário inválido") from exc

        return value


class CaseItemResponse(CaseItemBase):
    """Resposta serializada de um item de caso."""

    id: int = Field(..., description="ID único do item")
    case_id: int = Field(
        ..., description="ID do caso ao qual este item pertence"
    )

    model_config = ConfigDict(from_attributes=True)
