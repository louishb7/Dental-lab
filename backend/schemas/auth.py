"""
Schemas Pydantic para autenticação.
"""

from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field, field_validator

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
PASSWORD_MIN_LENGTH = 6
USERNAME_MIN_LENGTH = 5


class AuthRegisterRequest(BaseModel):
    """Dados para cadastro inicial do usuário."""

    email: str = Field(
        ...,
        pattern=EMAIL_PATTERN,
        description="Email do usuário",
    )
    username: str = Field(
        ...,
        max_length=80,
        description="Nome de usuário",
    )
    password: str = Field(
        ...,
        description="Senha do usuário",
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized_username = value.strip()

        if len(normalized_username) < USERNAME_MIN_LENGTH:
            raise ValueError("Nome de usuário deve ter pelo menos 5 caracteres")

        if not normalized_username.isalnum():
            raise ValueError("Nome de usuário pode conter apenas letras e números")

        if not any(char.isalpha() for char in normalized_username):
            raise ValueError("Nome de usuário não pode ser composto apenas por números")

        return normalized_username

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < PASSWORD_MIN_LENGTH:
            raise ValueError("Senha deve ter pelo menos 6 caracteres")

        if not any(char.isdigit() for char in value):
            raise ValueError("Senha deve conter ao menos um número")

        return value


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
