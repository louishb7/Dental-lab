"""
Rotas HTTP para autenticação.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.auth import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    AuthUserResponse,
)
from backend.services import auth as auth_service
from backend.services import user as user_service

router = APIRouter(prefix="/auth", tags=["Auth"])


def _build_token_response(user) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=auth_service.create_access_token(user.username),
        username=user.username,
        email=user.email,
    )


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRegisterRequest, db: Session = Depends(get_db)):
    try:
        user = user_service.create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return _build_token_response(user)


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    user = user_service.authenticate_user(db, payload.identifier, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _build_token_response(user)


@router.get("/me", response_model=AuthUserResponse)
def read_me(user: User = Depends(get_current_user)):
    return AuthUserResponse(id=user.id, username=user.username, email=user.email)
