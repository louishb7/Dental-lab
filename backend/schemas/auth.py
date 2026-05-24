"""
Schemas Pydantic para autenticação.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AuthLoginRequest(BaseModel):
    """Credenciais para login."""

    username: str = Field(..., description="Nome de usuário da sessão única")
    password: str = Field(..., description="Senha da sessão única")


class AuthTokenResponse(BaseModel):
    """Resposta do endpoint de login."""

    access_token: str = Field(..., description="JWT de acesso")
    token_type: Literal["bearer"] = "bearer"
    username: str = Field(..., description="Nome de usuário autenticado")


class AuthUserResponse(BaseModel):
    """Dados mínimos do usuário autenticado."""

    username: str = Field(..., description="Nome do usuário autenticado")
