from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

test_db_path = Path("/tmp/cadista_test.db")
test_db_path.unlink(missing_ok=True)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{test_db_path}")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-setup")

from backend.database.connection import Base, SessionLocal, engine
from backend.models import Case, CaseItem, Doctor, User  # noqa: F401
from backend.services import login_rate_limit


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SessionLocal.configure(bind=test_engine)
Base.metadata.create_all(bind=engine)
Base.metadata.create_all(bind=test_engine)


def _truncate_tables() -> None:
    with SessionLocal() as db:
        db.execute(text("DELETE FROM case_items"))
        db.execute(text("DELETE FROM cases"))
        db.execute(text("DELETE FROM doctors"))
        db.execute(text("DELETE FROM users"))
        db.commit()


@pytest.fixture(autouse=True)
def clean_database() -> Iterator[None]:
    login_rate_limit.reset_login_attempts()
    _truncate_tables()
    yield
    login_rate_limit.reset_login_attempts()
    _truncate_tables()
