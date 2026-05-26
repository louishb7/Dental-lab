"""
Consultas agregadas para o dashboard e financeiro resumido.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.models.case import Case
from backend.models.doctor import Doctor
from backend.schemas.dashboard import DashboardSummaryResponse


def _month_window(now: datetime) -> tuple[datetime, datetime]:
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        next_month = month_start.replace(year=now.year + 1, month=1)
    else:
        next_month = month_start.replace(month=now.month + 1)
    return month_start, next_month


def _decorate_case(case: Case) -> Case:
    doctor_name = case.doctor.name if case.doctor is not None else f"#{case.doctor_id}"
    setattr(case, "doctor_name", doctor_name)
    return case


def _fetch_cases(query) -> list[Case]:
    cases = query.options(joinedload(Case.doctor)).all()
    return [_decorate_case(case) for case in cases]


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    now = datetime.now(timezone.utc)
    today = now.date()
    month_start, next_month = _month_window(now)

    active_cases_query = db.query(Case).filter(Case.deleted_at.is_(None))

    status_rows = (
        active_cases_query.with_entities(Case.status, func.count(Case.id))
        .group_by(Case.status)
        .all()
    )
    status_counts = {"pending": 0, "completed": 0, "delivered": 0}
    for status, count in status_rows:
        status_counts[status] = int(count)

    overdue_cases = _fetch_cases(
        db.query(Case)
        .join(Doctor, Doctor.id == Case.doctor_id)
        .filter(
            Case.deleted_at.is_(None),
            Case.status != "delivered",
            Case.deadline.is_not(None),
            func.date(Case.deadline) < today,
        )
        .order_by(Case.deadline.asc(), Case.id.desc())
    )

    urgent_open_cases = _fetch_cases(
        db.query(Case)
        .join(Doctor, Doctor.id == Case.doctor_id)
        .filter(
            Case.deleted_at.is_(None),
            Case.priority == "urgent",
            Case.status != "delivered",
        )
        .order_by(Case.deadline.asc().nullslast(), Case.id.desc())
    )

    delivered_cases_month = _fetch_cases(
        db.query(Case)
        .join(Doctor, Doctor.id == Case.doctor_id)
        .filter(
            Case.deleted_at.is_(None),
            Case.status == "delivered",
            Case.delivered_at.is_not(None),
            Case.delivered_at >= month_start,
            Case.delivered_at < next_month,
            Case.total_value.is_not(None),
        )
        .order_by(Case.delivered_at.desc(), Case.id.desc())
    )

    delivered_total = (
        db.query(func.coalesce(func.sum(Case.total_value), 0))
        .filter(
            Case.deleted_at.is_(None),
            Case.status == "delivered",
            Case.delivered_at.is_not(None),
            Case.delivered_at >= month_start,
            Case.delivered_at < next_month,
            Case.total_value.is_not(None),
        )
        .scalar()
    )

    if delivered_total is None:
        delivered_total_month = Decimal("0")
    elif isinstance(delivered_total, Decimal):
        delivered_total_month = delivered_total
    else:
        delivered_total_month = Decimal(str(delivered_total))

    return DashboardSummaryResponse(
        generated_at=now,
        status_counts=status_counts,
        overdue_cases=overdue_cases,
        urgent_open_cases=urgent_open_cases,
        delivered_cases_month=delivered_cases_month,
        delivered_total_month=delivered_total_month,
        delivered_count_month=len(delivered_cases_month),
    )
