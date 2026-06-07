"""doctor user ownership

Revision ID: 0008_doctor_user_ownership
Revises: 0007_case_item_quantity
Create Date: 2026-06-07 00:00:01.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0008_doctor_user_ownership"
down_revision = "0007_case_item_quantity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "doctors",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_doctors_user_id", "doctors", ["user_id"])
    op.create_foreign_key(
        "fk_doctors_user_id_users",
        "doctors",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.execute(
        """
        UPDATE doctors
        SET user_id = (SELECT id FROM users LIMIT 1)
        WHERE user_id IS NULL
          AND (SELECT count(*) FROM users) = 1
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_doctors_user_id_users", "doctors", type_="foreignkey")
    op.drop_index("ix_doctors_user_id", table_name="doctors")
    op.drop_column("doctors", "user_id")
