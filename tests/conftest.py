from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from backend.database.connection import Base, SessionLocal
from backend.models import Case, CaseItem, Doctor, User  # noqa: F401


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SessionLocal.configure(bind=test_engine)
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
    _truncate_tables()
    yield
    _truncate_tables()
