"""
Schemas Pydantic para a entidade Case.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.schemas.case_item import CaseItemResponse


def normalize_decimal_value(value, error_message: str):
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

        normalized = normalized.replace("R$", "").replace(" ", "")
        if "," in normalized:
            normalized = normalized.replace(".", "").replace(",", ".")

        try:
            return Decimal(normalized)
        except InvalidOperation as exc:
            raise ValueError(error_message) from exc

    return value


class CaseBase(BaseModel):
    """Campos compartilhados entre criação, atualização e resposta de Case."""

    patient_ref: str = Field(..., description="Referência do paciente")
    pricing_mode: Optional[Literal["fixed", "services"]] = Field(
        default=None,
        description="Tipo de cobrança do caso: valor fixo ou soma dos serviços",
    )
    deadline: Optional[datetime] = Field(
        default=None, description="Prazo de entrega acordado"
    )
    priority: Literal["normal", "urgent"] = Field(
        default="normal", description="Prioridade do caso"
    )
    status: Literal["pending", "completed", "delivered"] = Field(
        default="pending", description="Status atual do caso"
    )
    total_value: Optional[Decimal] = Field(
        default=None,
        description="Valor combinado do caso",
        decimal_places=2,
    )
    notes: Optional[str] = Field(
        default=None, description="Observações gerais do caso"
    )

    @field_validator("total_value", mode="before")
    @classmethod
    def normalize_total_value(cls, value):
        return normalize_decimal_value(value, "Valor combinado inválido")


class CaseCreate(CaseBase):
    """Payload para criação de um caso."""

    doctor_id: int = Field(..., description="ID do doutor responsável")


class CaseUpdate(BaseModel):
    """Payload parcial para atualização de um caso."""

    doctor_id: Optional[int] = None
    patient_ref: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[Literal["normal", "urgent"]] = None
    status: Optional[Literal["pending", "completed", "delivered"]] = None
    total_value: Optional[Decimal] = Field(
        default=None, decimal_places=2, description="Valor combinado do caso"
    )
    notes: Optional[str] = None
    status_revert_reason: Optional[str] = None

    @field_validator("total_value", mode="before")
    @classmethod
    def normalize_total_value(cls, value):
        return normalize_decimal_value(value, "Valor combinado inválido")


class CaseBulkDeliverRequest(BaseModel):
    """Payload para entrega em lote de casos completos."""

    case_ids: list[int] = Field(
        default_factory=list,
        description="Lista de IDs de casos a serem entregues",
    )
    doctor_id: Optional[int] = Field(
        default=None,
        description="Filtra os casos completos de um doutor específico",
    )


class CaseResponse(CaseBase):
    """Resposta serializada de um caso."""

    id: int = Field(..., description="ID único do caso")
    doctor_id: int = Field(..., description="ID do doutor associado")
    created_at: datetime = Field(
        ..., description="Data e hora de criação do caso"
    )
    delivered_at: Optional[datetime] = Field(
        default=None, description="Data de entrega"
    )
    deleted_at: Optional[datetime] = Field(
        default=None, description="Data de soft delete"
    )
    status_revert_reason: Optional[str] = Field(
        default=None, description="Motivo para reverter um caso entregue"
    )
    items_count: int = Field(
        default=0, description="Quantidade de itens vinculados ao caso"
    )
    items: List[CaseItemResponse] = Field(
        default_factory=list, description="Lista de itens do caso"
    )

    model_config = ConfigDict(from_attributes=True)
