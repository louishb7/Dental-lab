"""
Pacote de Schemas Pydantic do sistema Cadista.

Este módulo expõe as classes de validação de dados (Base, Create e Response)
para serem consumidas pelas rotas da API, garantindo a separação de responsabilidades.
"""

from backend.schemas.doctor import (
    DoctorBase,
    DoctorCreate,
    DoctorResponse,
    DoctorUpdate,
)
from backend.schemas.case import CaseBase, CaseCreate, CaseUpdate, CaseResponse
from backend.schemas.case_item import (
    CaseItemBase,
    CaseItemCreate,
    CaseItemResponse,
)

__all__ = [
    "DoctorBase",
    "DoctorCreate",
    "DoctorResponse",
    "DoctorUpdate",
    "CaseBase",
    "CaseCreate",
    "CaseUpdate",
    "CaseResponse",
    "CaseItemBase",
    "CaseItemCreate",
    "CaseItemResponse",
]
