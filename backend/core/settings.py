"""
Configurações centrais da aplicação Cadista.

As variáveis abaixo são lidas do ambiente para evitar valores sensíveis
hardcoded no código e para manter o deploy consistente entre ambientes.
"""

from __future__ import annotations

import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://cadista_user:cadista123@localhost:5432/cadista_db",
)
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
