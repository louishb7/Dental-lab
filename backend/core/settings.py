"""
Configurações centrais da aplicação Cadista.

As variáveis abaixo são lidas do ambiente para evitar valores sensíveis
hardcoded no código e para manter o deploy consistente entre ambientes.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value or not value.strip():
        raise RuntimeError(f"{name} must be defined in the environment or .env file.")
    return value.strip()


def _parse_csv_env(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, default)
    values = [item.strip() for item in raw_value.split(",") if item.strip()]
    if not values:
        raise RuntimeError(f"{name} must contain at least one value.")
    return values


def _env_is_defined(name: str) -> bool:
    return bool(os.getenv(name, "").strip())


def _validate_cors_origin(origin: str) -> str:
    if origin == "*":
        raise RuntimeError("CORS_ORIGINS cannot contain wildcard origins.")

    parsed = urlparse(origin)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path not in {"", "/"}:
        raise RuntimeError(f"Invalid CORS origin: {origin}")
    return origin


def _validate_trusted_host(host: str) -> str:
    if host == "*" or "*" in host:
        raise RuntimeError("TRUSTED_HOSTS cannot contain wildcards.")
    if "://" in host or "/" in host or "?" in host or "#" in host:
        raise RuntimeError(f"Invalid trusted host: {host}")
    return host


def _is_local_cors_origin(origin: str) -> bool:
    parsed = urlparse(origin)
    return parsed.hostname in {"localhost", "127.0.0.1", "0.0.0.0"}


def _is_local_trusted_host(host: str) -> bool:
    return host.split(":", 1)[0] in {"localhost", "127.0.0.1", "0.0.0.0", "testserver"}

APP_ENV = os.getenv("APP_ENV", "development").strip().lower() or "development"

DATABASE_URL = _require_env("DATABASE_URL")

SECRET_KEY = _require_env("SECRET_KEY")
if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 characters long.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
if not 5 <= ACCESS_TOKEN_EXPIRE_MINUTES <= 24 * 60:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 5 and 1440.")

# Regra fixa do produto: cadastro com senha de no mínimo 6 caracteres.
PASSWORD_MIN_LENGTH = 6

BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))
if not 12 <= BCRYPT_ROUNDS <= 16:
    raise RuntimeError("BCRYPT_ROUNDS must be between 12 and 16.")

LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
if LOGIN_MAX_ATTEMPTS < 3:
    raise RuntimeError("LOGIN_MAX_ATTEMPTS must be at least 3.")

LOGIN_LOCKOUT_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))
if not 1 <= LOGIN_LOCKOUT_MINUTES <= 1440:
    raise RuntimeError("LOGIN_LOCKOUT_MINUTES must be between 1 and 1440.")

LOGIN_RATE_LIMIT_ATTEMPTS = int(os.getenv("LOGIN_RATE_LIMIT_ATTEMPTS", "10"))
if LOGIN_RATE_LIMIT_ATTEMPTS < 1:
    raise RuntimeError("LOGIN_RATE_LIMIT_ATTEMPTS must be at least 1.")

LOGIN_RATE_LIMIT_WINDOW_SECONDS = int(
    os.getenv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", "60")
)
if not 10 <= LOGIN_RATE_LIMIT_WINDOW_SECONDS <= 24 * 60 * 60:
    raise RuntimeError(
        "LOGIN_RATE_LIMIT_WINDOW_SECONDS must be between 10 and 86400."
    )

DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173"
)
CORS_ORIGINS = [
    _validate_cors_origin(origin)
    for origin in _parse_csv_env("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
]

# Em desenvolvimento, o Vite pode trocar automaticamente de porta quando a
# 5173 estiver ocupada. Aceitamos apenas hosts locais para evitar 400 no
# preflight CORS sem liberar origens externas.
DEV_CORS_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1):[0-9]+$"
CORS_ORIGIN_REGEX = (
    os.getenv("CORS_ORIGIN_REGEX")
    or (DEV_CORS_ORIGIN_REGEX if APP_ENV == "development" else None)
)

DEFAULT_TRUSTED_HOSTS = "localhost,127.0.0.1,testserver"
TRUSTED_HOSTS = [
    _validate_trusted_host(host)
    for host in _parse_csv_env("TRUSTED_HOSTS", DEFAULT_TRUSTED_HOSTS)
]

if APP_ENV == "production":
    if not _env_is_defined("CORS_ORIGINS"):
        raise RuntimeError("CORS_ORIGINS must be explicitly defined in production.")
    if not _env_is_defined("TRUSTED_HOSTS"):
        raise RuntimeError("TRUSTED_HOSTS must be explicitly defined in production.")
    if CORS_ORIGIN_REGEX:
        raise RuntimeError("CORS_ORIGIN_REGEX must not be used in production.")
    if any(origin.startswith("http://") for origin in CORS_ORIGINS):
        raise RuntimeError("Production CORS_ORIGINS must use https origins.")
    if any(_is_local_cors_origin(origin) for origin in CORS_ORIGINS):
        raise RuntimeError("Production CORS_ORIGINS must not contain local origins.")
    if any(_is_local_trusted_host(host) for host in TRUSTED_HOSTS):
        raise RuntimeError("Production TRUSTED_HOSTS must not contain local/test hosts.")
