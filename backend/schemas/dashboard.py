"""
Schemas Pydantic para o painel resumido do sistema.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class DashboardCaseResponse(BaseModel):
    """Resumo compacto de um caso usado no dashboard."""

    id: int = Field(..., description="ID do caso")
    doctor_id: int = Field(..., description="ID do doutor associado")
    doctor_name: str = Field(..., description="Nome do doutor associado")
    patient_ref: str = Field(..., description="Referência do paciente")
    deadline: Optional[datetime] = Field(
        default=None, description="Prazo de entrega"
    )
    priority: Literal["normal", "urgent"] = Field(
        ..., description="Prioridade do caso"
    )
    status: Literal["pending", "completed", "delivered"] = Field(
        ..., description="Status atual do caso"
    )
    total_value: Optional[Decimal] = Field(
        default=None, description="Valor combinado do caso"
    )
    created_at: datetime = Field(..., description="Data de criação do caso")
    delivered_at: Optional[datetime] = Field(
        default=None, description="Data de entrega do caso"
    )

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    """Resumo geral do dashboard."""

    generated_at: datetime = Field(
        ..., description="Momento em que o resumo foi gerado"
    )
    status_counts: dict[str, int] = Field(
        default_factory=dict, description="Contagem de casos por status"
    )
    overdue_cases: list[DashboardCaseResponse] = Field(
        default_factory=list, description="Casos vencidos e não entregues"
    )
    urgent_open_cases: list[DashboardCaseResponse] = Field(
        default_factory=list, description="Casos urgentes em aberto"
    )
    delivered_cases_month: list[DashboardCaseResponse] = Field(
        default_factory=list, description="Casos entregues no mês atual"
    )
    delivered_total_month: Decimal = Field(
        default=Decimal("0"), description="Total financeiro entregue no mês"
    )
    delivered_count_month: int = Field(
        default=0, description="Quantidade de casos entregues no mês"
    )
