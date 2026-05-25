"""
Módulo de Schemas Pydantic para a entidade Doctor (Doutor/Dentista).
Responsável pela validação de dados de entrada e formatação de saída dos clientes do laboratório.
"""

from datetime import datetime
import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


PHONE_PATTERN = re.compile(r"^\(\d{2}\)\d{4,5}-\d{4}$")


def normalize_brazilian_phone(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    if PHONE_PATTERN.fullmatch(normalized):
        return normalized

    digits = re.sub(r"\D", "", normalized)
    if len(digits) == 10:
        return f"({digits[:2]}){digits[2:6]}-{digits[6:]}"

    if len(digits) == 11:
        return f"({digits[:2]}){digits[2:7]}-{digits[7:]}"

    raise ValueError(
        "Telefone deve estar em branco ou seguir o padrão "
        "(xx)xxxx-xxxx / (xx)xxxxx-xxxx"
    )


class DoctorBase(BaseModel):
    """
    Schema base contendo os atributos comuns de um Doutor.
    """

    name: str = Field(..., description="Nome completo do doutor")
    clinic_name: Optional[str] = Field(
        default=None, description="Nome da clínica ou consultório"
    )
    phone: Optional[str] = Field(
        default=None, description="Telefone de contato"
    )
    notes: Optional[str] = Field(
        default=None, description="Observações gerais sobre o cliente"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        return normalize_brazilian_phone(value)


class DoctorCreate(DoctorBase):
    """
    Schema de validação para a criação de um novo Doutor via requisição POST.
    """

    pass


class DoctorUpdate(BaseModel):
    """
    Schema de validação para atualização parcial de um Doutor.
    """

    name: Optional[str] = None
    clinic_name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        return normalize_brazilian_phone(value)


class DoctorResponse(DoctorBase):
    """
    Schema de formatação de saída para as rotas que retornam dados do Doutor.
    """

    id: int = Field(..., description="ID único gerado pelo banco de dados")
    created_at: datetime = Field(
        ..., description="Data e hora em que o registro foi criado"
    )
    deleted_at: Optional[datetime] = Field(
        default=None, description="Data de soft delete do doutor"
    )
    cases_count: int = Field(
        default=0, description="Quantidade de casos ativos vinculados ao doutor"
    )

    model_config = ConfigDict(from_attributes=True)
