from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.core import settings
from backend.models.user import User
from backend.schemas.auth import AuthRegisterRequest
from backend.services import auth as auth_service


class AccountLockedError(ValueError):
    def __init__(self, locked_until: datetime) -> None:
        self.locked_until = locked_until
        super().__init__("Conta temporariamente bloqueada por tentativas inválidas")


def get_user_by_username(db: Session, username: str) -> User | None:
    normalized_username = username.strip()
    if not normalized_username:
        return None

    return (
        db.query(User)
        .filter(func.lower(User.username) == normalized_username.lower())
        .first()
    )


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = email.strip().lower()
    if not normalized_email:
        return None

    return db.query(User).filter(func.lower(User.email) == normalized_email).first()


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
    normalized_identifier = identifier.strip().lower()
    if not normalized_identifier:
        return None

    return (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == normalized_identifier,
                func.lower(User.email) == normalized_identifier,
            )
        )
        .first()
    )


def create_user(db: Session, user_data: AuthRegisterRequest) -> User:
    normalized_email = user_data.email.strip().lower()
    normalized_username = user_data.username.strip()

    if get_user_by_email(db, normalized_email) is not None:
        raise ValueError("Já existe um usuário com este email")

    if get_user_by_username(db, normalized_username) is not None:
        raise ValueError("Já existe um usuário com este nome de usuário")

    user = User(
        email=normalized_email,
        username=normalized_username,
        password_hash=auth_service.hash_password(user_data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "Já existe um usuário com este email ou nome de usuário"
        ) from exc

    db.refresh(user)
    return user


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clear_expired_lock(user: User, now: datetime) -> bool:
    locked_until = _as_utc(user.locked_until)
    if locked_until is not None and locked_until <= now:
        user.locked_until = None
        user.failed_login_attempts = 0
        user.last_failed_login_at = None
        return True
    return False


def _register_failed_login(user: User, now: datetime) -> None:
    user.failed_login_attempts += 1
    user.last_failed_login_at = now
    if user.failed_login_attempts >= settings.LOGIN_MAX_ATTEMPTS:
        user.locked_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
        user.failed_login_attempts = 0


def _reset_login_security_state(user: User, now: datetime) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_failed_login_at = None
    user.last_login_at = now


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user = get_user_by_identifier(db, identifier)
    if user is None:
        return None

    now = _now_utc()
    _clear_expired_lock(user, now)

    locked_until = _as_utc(user.locked_until)
    if locked_until is not None and locked_until > now:
        raise AccountLockedError(locked_until)

    if not auth_service.verify_password(password, user.password_hash):
        _register_failed_login(user, now)
        db.commit()
        if user.locked_until is not None:
            raise AccountLockedError(_as_utc(user.locked_until) or now)
        return None

    _reset_login_security_state(user, now)
    db.commit()
    db.refresh(user)
    return user
