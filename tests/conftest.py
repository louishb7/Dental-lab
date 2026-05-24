from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy import text

from backend.database.connection import SessionLocal


def _truncate_tables() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                "TRUNCATE TABLE case_items, cases, doctors RESTART IDENTITY CASCADE"
            )
        )
        db.commit()


@pytest.fixture(autouse=True)
def clean_database() -> Iterator[None]:
    _truncate_tables()
    yield
    _truncate_tables()
