"""
Schemas Pydantic para autenticação.
"""

from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field, model_validator

from backend.core import settings

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
        min_length=settings.PASSWORD_MIN_LENGTH,
        description="Senha do usuário",
    )

    @model_validator(mode="after")
    def validate_password_strength(self) -> "AuthRegisterRequest":
        password = self.password
        normalized_password = password.strip()

        if normalized_password != password:
            raise ValueError("Senha não pode começar ou terminar com espaços")

        if not any(char.isalpha() for char in password):
            raise ValueError("Senha deve conter ao menos uma letra")

        if not any(char.isdigit() for char in password):
            raise ValueError("Senha deve conter ao menos um número")

        if self.username.strip().lower() in password.lower():
            raise ValueError("Senha não pode conter o nome de usuário")

        if self.email.strip().lower() in password.lower():
            raise ValueError("Senha não pode conter o email")

        return self


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
