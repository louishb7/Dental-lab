"""case item quantity

Revision ID: 0007_case_item_quantity
Revises: 0006_user_login_lockout
Create Date: 2026-06-07 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0007_case_item_quantity"
down_revision = "0006_user_login_lockout"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "case_items",
        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            UPDATE case_items
            SET quantity = CAST(substring(notes from '^Quantidade:\\s*(\\d+)') AS INTEGER)
            WHERE notes ~* '^Quantidade:\\s*\\d+'
              AND CAST(substring(notes from '^Quantidade:\\s*(\\d+)') AS INTEGER) >= 1
            """
        )
    elif bind.dialect.name == "sqlite":
        op.execute(
            """
            UPDATE case_items
            SET quantity = CAST(trim(substr(notes, length('Quantidade:') + 1)) AS INTEGER)
            WHERE lower(notes) LIKE 'quantidade:%'
              AND CAST(trim(substr(notes, length('Quantidade:') + 1)) AS INTEGER) >= 1
            """
        )

    with op.batch_alter_table("case_items") as batch_op:
        batch_op.create_check_constraint(
            "ck_case_items_quantity_positive",
            "quantity >= 1",
        )


def downgrade() -> None:
    with op.batch_alter_table("case_items") as batch_op:
        batch_op.drop_constraint(
            "ck_case_items_quantity_positive",
            type_="check",
        )
    op.drop_column("case_items", "quantity")
