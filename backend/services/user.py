from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.schemas.auth import AuthRegisterRequest
from backend.services import auth as auth_service


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


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user = get_user_by_identifier(db, identifier)
    if user is None:
        return None

    if not auth_service.verify_password(password, user.password_hash):
        return None

    return user
