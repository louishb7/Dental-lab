"""initial domain schema

Revision ID: 0001_initial_domain_schema
Revises: 
Create Date: 2026-05-24 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial_domain_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctors",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("clinic_name", sa.String(length=150), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_doctors_name"), "doctors", ["name"], unique=False)

    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "doctor_id",
            sa.Integer(),
            sa.ForeignKey("doctors.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("patient_ref", sa.String(length=150), nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "priority",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'normal'"),
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("total_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status_revert_reason", sa.Text(), nullable=True),
    )
    op.create_index(
        op.f("ix_cases_doctor_id"), "cases", ["doctor_id"], unique=False
    )
    op.create_index(
        op.f("ix_cases_patient_ref"), "cases", ["patient_ref"], unique=False
    )
    op.create_index(op.f("ix_cases_priority"), "cases", ["priority"], unique=False)
    op.create_index(op.f("ix_cases_status"), "cases", ["status"], unique=False)
    op.create_index(
        op.f("ix_cases_deleted_at"), "cases", ["deleted_at"], unique=False
    )

    op.create_table(
        "case_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "case_id",
            sa.Integer(),
            sa.ForeignKey("cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tooth", sa.String(length=100), nullable=False),
        sa.Column("service_type", sa.String(length=100), nullable=False),
        sa.Column("material", sa.String(length=100), nullable=True),
        sa.Column("color", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index(
        op.f("ix_case_items_case_id"), "case_items", ["case_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_case_items_case_id"), table_name="case_items")
    op.drop_table("case_items")

    op.drop_index(op.f("ix_cases_deleted_at"), table_name="cases")
    op.drop_index(op.f("ix_cases_status"), table_name="cases")
    op.drop_index(op.f("ix_cases_priority"), table_name="cases")
    op.drop_index(op.f("ix_cases_patient_ref"), table_name="cases")
    op.drop_index(op.f("ix_cases_doctor_id"), table_name="cases")
    op.drop_table("cases")

    op.drop_index(op.f("ix_doctors_name"), table_name="doctors")
    op.drop_table("doctors")
