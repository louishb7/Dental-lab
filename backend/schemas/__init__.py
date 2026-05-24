"""
Pacote de Schemas Pydantic do sistema Cadista.

Este módulo expõe as classes de validação de dados (Base, Create e Response)
para serem consumidas pelas rotas da API, garantindo a separação de responsabilidades.
"""

from backend.schemas.doctor import DoctorBase, DoctorCreate, DoctorResponse
from backend.schemas.dental_case import (
    DentalCaseBase,
    DentalCaseCreate,
    DentalCaseResponse,
)
from backend.schemas.case_item import (
    CaseItemBase,
    CaseItemCreate,
    CaseItemResponse,
)

__all__ = [
    "DoctorBase",
    "DoctorCreate",
    "DoctorResponse",
    "DentalCaseBase",
    "DentalCaseCreate",
    "DentalCaseResponse",
    "CaseItemBase",
    "CaseItemCreate",
    "CaseItemResponse",
]
