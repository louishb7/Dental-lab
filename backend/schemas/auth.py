"""
Schemas Pydantic para autenticação.
"""

from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class AuthRegisterRequest(BaseModel):
    """Dados para cadastro inicial do usuário."""

    email: str = Field(
        ...,
        pattern=EMAIL_PATTERN,
        description="Email do usuário",
    )
    username: str = Field(
        ...,
        min_length=3,
        max_length=80,
        description="Nome de usuário",
    )
    password: str = Field(
        ...,
        min_length=6,
        description="Senha do usuário",
    )


class AuthLoginRequest(BaseModel):
    """Credenciais para login."""

    identifier: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("identifier", "username", "email"),
        description="Nome de usuário ou email",
    )
    password: str = Field(..., description="Senha da conta")


class AuthTokenResponse(BaseModel):
    """Resposta do endpoint de login."""

    access_token: str = Field(..., description="JWT de acesso")
    token_type: Literal["bearer"] = "bearer"
    username: str = Field(..., description="Nome de usuário autenticado")
    email: str = Field(..., description="Email autenticado")


class AuthUserResponse(BaseModel):
    """Dados mínimos do usuário autenticado."""

    id: int = Field(..., description="Identificador do usuário")
    username: str = Field(..., description="Nome do usuário autenticado")
    email: str = Field(..., description="Email do usuário autenticado")
