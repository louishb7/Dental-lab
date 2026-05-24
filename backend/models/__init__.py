"""
Pacote de modelos ORM do sistema Kadista.

Este módulo importa e expõe explicitamente a classe Base e os modelos
para garantir que o SQLAlchemy registre as tabelas na ordem correta,
respeitando a hierarquia e as chaves estrangeiras (doctors -> dental_cases -> case_items).
"""

from backend.database.connection import Base
from backend.models.doctor import Doctor
from backend.models.dental_case import DentalCase
from backend.models.case_item import CaseItem

__all__ = ["Base", "Doctor", "DentalCase", "CaseItem"]
