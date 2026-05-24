"""doctor soft delete

Revision ID: 0002_doctor_soft_delete
Revises: 0001_initial_domain_schema
Create Date: 2026-05-24 00:00:00.000001
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_doctor_soft_delete"
down_revision = "0001_initial_domain_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "doctors",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_doctors_deleted_at"), "doctors", ["deleted_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_doctors_deleted_at"), table_name="doctors")
    op.drop_column("doctors", "deleted_at")
