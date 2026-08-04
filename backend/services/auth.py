"""
Lógica de autenticação da sessão do Cadista.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core import settings

pwd_context = CryptContext(
    schemes=["bcrypt"],
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(username: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "iat": int(now.timestamp()),
    }
    if settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0:
        payload["exp"] = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

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

    return username
