"""
Rotas HTTP para autenticação.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import SQLAlchemyError
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
from backend.services import login_rate_limit
from backend.services import user as user_service
from backend.services.user import AccountLockedError

router = APIRouter(prefix="/auth", tags=["Auth"])


def _build_token_response(user) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=auth_service.create_access_token(user.username),
        username=user.username,
        email=user.email,
    )


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: AuthRegisterRequest, db: Session = Depends(get_db)):
    try:
        user = user_service.create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Banco de dados indisponível para cadastrar usuário",
        ) from exc

    return _build_token_response(user)


@router.post("/login", response_model=AuthTokenResponse)
def login(
    payload: AuthLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_id = request.client.host if request.client is not None else "unknown"
    retry_after = login_rate_limit.register_login_attempt(client_id)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Tente novamente mais tarde.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        user = user_service.authenticate_user(db, payload.identifier, payload.password)
    except AccountLockedError as exc:
        remaining_seconds = max(
            1,
            int((exc.locked_until - datetime.now(timezone.utc)).total_seconds()),
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Conta temporariamente bloqueada. Tente novamente mais tarde.",
            headers={
                "Retry-After": str(remaining_seconds),
                "WWW-Authenticate": "Bearer",
            },
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Banco de dados indisponível para autenticar usuário",
        ) from exc

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
