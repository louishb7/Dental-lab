"""
Rotas HTTP para autenticação.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.schemas.auth import AuthLoginRequest, AuthTokenResponse, AuthUserResponse
from backend.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest):
    username = auth_service.authenticate_user(payload.username, payload.password)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthTokenResponse(
        access_token=auth_service.create_access_token(username),
        username=username,
    )


@router.get("/me", response_model=AuthUserResponse)
def read_me(token: str = Depends(oauth2_scheme)):
    try:
        username = auth_service.get_username_from_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return AuthUserResponse(username=username)
