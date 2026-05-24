"""
Lógica de autenticação da sessão única do Cadista.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _password_matches(password: str) -> bool:
    if settings.AUTH_PASSWORD_HASH:
        return pwd_context.verify(password, settings.AUTH_PASSWORD_HASH)
    return password == settings.AUTH_PASSWORD


def authenticate_user(username: str, password: str) -> str | None:
    if username != settings.AUTH_USERNAME:
        return None

    if not _password_matches(password):
        return None

    return username


def create_access_token(username: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "iat": int(now.timestamp()),
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_username_from_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:
        raise ValueError("Token inválido ou expirado") from exc

    username = payload.get("sub")
    if not isinstance(username, str) or not username:
        raise ValueError("Token inválido ou expirado")

    if username != settings.AUTH_USERNAME:
        raise ValueError("Usuário autenticado não corresponde ao usuário configurado")

    return username
