from __future__ import annotations

from sqlalchemy import inspect, text

from backend.database.connection import engine


def test_database_connection_and_migrated_tables() -> None:
    with engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar_one() == 1

        table_names = set(inspect(connection).get_table_names())

    assert {"doctors", "cases", "case_items", "users"}.issubset(table_names)
