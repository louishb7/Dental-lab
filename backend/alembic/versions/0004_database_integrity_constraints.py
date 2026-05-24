"""database integrity constraints

Revision ID: 0004_integrity
Revises: 0003_users_auth
Create Date: 2026-05-24 20:35:00.000001
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0004_integrity"
down_revision = "0003_users_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_cases_priority_valid",
        "cases",
        "priority IN ('normal', 'urgent')",
    )
    op.create_check_constraint(
        "ck_cases_status_valid",
        "cases",
        "status IN ('pending', 'completed', 'delivered')",
    )
    op.create_check_constraint(
        "ck_cases_total_value_non_negative",
        "cases",
        "total_value IS NULL OR total_value >= 0",
    )

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.create_index(
        "uq_users_email_lower",
        "users",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_using="btree",
    )
    op.create_index(
        "uq_users_username_lower",
        "users",
        [sa.text("lower(username)")],
        unique=True,
        postgresql_using="btree",
    )


def downgrade() -> None:
    op.drop_index("uq_users_username_lower", table_name="users")
    op.drop_index("uq_users_email_lower", table_name="users")
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)

    op.drop_constraint("ck_cases_total_value_non_negative", "cases", type_="check")
    op.drop_constraint("ck_cases_status_valid", "cases", type_="check")
    op.drop_constraint("ck_cases_priority_valid", "cases", type_="check")
