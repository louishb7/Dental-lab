"""
Lógica de negócio e persistência para a entidade Case.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.models.case import Case
from backend.models.doctor import Doctor
from backend.schemas.case import CaseCreate, CaseUpdate


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
    return db_case


def get_case_by_id(db: Session, case_id: int) -> Case | None:
    return (
        db.query(Case)
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )


def get_all_cases(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    doctor_id: int | None = None,
    status: str | None = None,
) -> list[Case]:
    query = db.query(Case).filter(Case.deleted_at.is_(None))

    if doctor_id is not None:
        query = query.filter(Case.doctor_id == doctor_id)

    if status is not None:
        query = query.filter(Case.status == status)

    return query.order_by(Case.id.desc()).offset(skip).limit(limit).all()


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
                    "Para reverter um caso entregue, é obrigatório informar um motivo."
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
    return db_case
