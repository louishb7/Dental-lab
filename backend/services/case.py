"""
Lógica de negócio e persistência para a entidade Case.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from backend.models.case import Case
from backend.models.case_item import CaseItem
from backend.models.doctor import Doctor
from backend.schemas.case import CaseCreate, CaseUpdate


def _item_counts_by_case(db: Session, case_ids: list[int]) -> dict[int, int]:
    if not case_ids:
        return {}

    rows = (
        db.query(CaseItem.case_id, func.count(CaseItem.id))
        .join(Case, Case.id == CaseItem.case_id)
        .filter(Case.deleted_at.is_(None), CaseItem.case_id.in_(case_ids))
        .group_by(CaseItem.case_id)
        .all()
    )
    return {case_id: int(count) for case_id, count in rows}


def _attach_items_count(db: Session, case: Case) -> Case:
    counts = _item_counts_by_case(db, [case.id])
    setattr(case, "items_count", counts.get(case.id, 0))
    return case


def _attach_items_counts(db: Session, cases: list[Case]) -> list[Case]:
    counts = _item_counts_by_case(db, [case.id for case in cases])
    for case in cases:
        setattr(case, "items_count", counts.get(case.id, 0))
    return cases


def _get_active_doctor(db: Session, doctor_id: int) -> Doctor | None:
    return (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id, Doctor.deleted_at.is_(None))
        .first()
    )


def create_case(db: Session, case_data: CaseCreate) -> Case:
    if _get_active_doctor(db, case_data.doctor_id) is None:
        raise ValueError("Doutor não encontrado")

    db_case = Case(
        doctor_id=case_data.doctor_id,
        patient_ref=case_data.patient_ref,
        deadline=case_data.deadline,
        priority=case_data.priority,
        status="pending",
        total_value=case_data.total_value,
        notes=case_data.notes,
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return _attach_items_count(db, db_case)


def get_case_by_id(db: Session, case_id: int) -> Case | None:
    db_case = (
        db.query(Case)
        .options(selectinload(Case.items))
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )
    if db_case is None:
        return None
    return _attach_items_count(db, db_case)


def get_all_cases(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    doctor_id: int | None = None,
    status: str | None = None,
) -> list[Case]:
    query = (
        db.query(Case)
        .options(selectinload(Case.items))
        .filter(Case.deleted_at.is_(None))
    )

    if doctor_id is not None:
        query = query.filter(Case.doctor_id == doctor_id)

    if status is not None:
        query = query.filter(Case.status == status)

    cases = query.order_by(Case.id.desc()).offset(skip).limit(limit).all()
    return _attach_items_counts(db, cases)


def update_case(db: Session, case_id: int, case_data: CaseUpdate) -> Case | None:
    db_case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )

    if db_case is None:
        return None

    update_data = case_data.model_dump(exclude_unset=True)
    new_status = update_data.pop("status", None)
    new_reason = update_data.pop("status_revert_reason", None)

    new_doctor_id = update_data.get("doctor_id")
    if new_doctor_id is not None and _get_active_doctor(db, new_doctor_id) is None:
        raise ValueError("Doutor não encontrado")

    for key, value in update_data.items():
        setattr(db_case, key, value)

    if new_status is not None:
        if db_case.status == "delivered" and new_status != "delivered":
            if not new_reason or not new_reason.strip():
                raise ValueError(
                    "Para reverter um caso entregue, é obrigatório "
                    "informar um motivo."
                )
            db_case.status_revert_reason = new_reason.strip()
        elif new_reason:
            db_case.status_revert_reason = new_reason.strip()

        db_case.status = new_status

        if new_status == "delivered" and db_case.delivered_at is None:
            db_case.delivered_at = datetime.now(timezone.utc)

        if new_status != "delivered" and db_case.delivered_at is not None:
            db_case.status_revert_reason = (
                new_reason.strip() if new_reason else db_case.status_revert_reason
            )
    elif new_reason:
        db_case.status_revert_reason = new_reason.strip()

    db.commit()
    db.refresh(db_case)
    _attach_items_count(db, db_case)
    return db_case


def delete_case(db: Session, case_id: int) -> Case:
    db_case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )
    if db_case is None:
        raise LookupError("Caso não encontrado")

    if db_case.status == "pending":
        if db_case.total_value is not None:
            raise ValueError(
                "Não é possível excluir um caso pending com valor registrado."
            )
        db.delete(db_case)
        db.commit()
        return db_case

    db_case.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_case)
    _attach_items_count(db, db_case)
    return db_case
