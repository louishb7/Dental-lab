"""case billing modes

Revision ID: 0005_case_billing_modes
Revises: 0004_integrity
Create Date: 2026-05-24 23:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0005_case_billing_modes"
down_revision = "0004_integrity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cases",
        sa.Column(
            "pricing_mode",
            sa.String(length=20),
            nullable=True,
            server_default=sa.text("'services'"),
        ),
    )
    op.add_column(
        "case_items",
        sa.Column("unit_value", sa.Numeric(10, 2), nullable=True),
    )

    op.execute(
        """
        UPDATE cases
        SET pricing_mode = CASE
            WHEN total_value IS NULL THEN 'services'
            ELSE 'fixed'
        END
        WHERE pricing_mode IS NULL
        """
    )

    op.alter_column("cases", "pricing_mode", nullable=False)
    op.create_check_constraint(
        "ck_cases_pricing_mode_valid",
        "cases",
        "pricing_mode IN ('fixed', 'services')",
    )
    op.create_check_constraint(
        "ck_case_items_unit_value_non_negative",
        "case_items",
        "unit_value IS NULL OR unit_value >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_case_items_unit_value_non_negative",
        "case_items",
        type_="check",
    )
    op.drop_constraint(
        "ck_cases_pricing_mode_valid",
        "cases",
        type_="check",
    )
    op.drop_column("case_items", "unit_value")
    op.drop_column("cases", "pricing_mode")
