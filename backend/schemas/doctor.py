"""
Módulo de Schemas Pydantic para a entidade Doctor (Doutor/Dentista).
Responsável pela validação de dados de entrada e formatação de saída dos clientes do laboratório.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class DoctorBase(BaseModel):
    """
    Schema base contendo os atributos comuns de um Doutor.
    """

    name: str = Field(..., description="Nome completo do doutor")
    clinic: Optional[str] = Field(
        default=None, description="Nome da clínica ou consultório"
    )
    phone: Optional[str] = Field(
        default=None, description="Telefone de contato"
    )
    notes: Optional[str] = Field(
        default=None, description="Observações gerais sobre o cliente"
    )


class DoctorCreate(DoctorBase):
    """
    Schema de validação para a criação de um novo Doutor via requisição POST.
    """

    pass


class DoctorResponse(DoctorBase):
    """
    Schema de formatação de saída para as rotas que retornam dados do Doutor.
    """

    id: int = Field(..., description="ID único gerado pelo banco de dados")
    created_at: datetime = Field(
        ..., description="Data e hora em que o registro foi criado"
    )

    model_config = ConfigDict(from_attributes=True)
