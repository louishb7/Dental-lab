"""
Módulo de operações de persistência para a entidade Doctor.
"""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models.case import Case
from backend.models.doctor import Doctor
from backend.schemas.doctor import DoctorCreate, DoctorUpdate


def _case_counts_by_doctor(db: Session, doctor_ids: list[int]) -> dict[int, int]:
    if not doctor_ids:
        return {}

    rows = (
        db.query(Case.doctor_id, func.count(Case.id))
        .filter(
            Case.deleted_at.is_(None),
            Case.doctor_id.in_(doctor_ids),
        )
        .group_by(Case.doctor_id)
        .all()
    )
    return {doctor_id: int(count) for doctor_id, count in rows}


def _attach_case_count(db: Session, doctor: Doctor) -> Doctor:
    counts = _case_counts_by_doctor(db, [doctor.id])
    setattr(doctor, "cases_count", counts.get(doctor.id, 0))
    return doctor


def _attach_case_counts(db: Session, doctors: list[Doctor]) -> list[Doctor]:
    counts = _case_counts_by_doctor(db, [doctor.id for doctor in doctors])
    for doctor in doctors:
        setattr(doctor, "cases_count", counts.get(doctor.id, 0))
    return doctors


def create_doctor(db: Session, doctor: DoctorCreate, user_id: int | None = None) -> Doctor:
    db_doctor = Doctor(**doctor.model_dump(), user_id=user_id)
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return _attach_case_count(db, db_doctor)


def get_doctor_by_id(
    db: Session, doctor_id: int, user_id: int | None = None
) -> Doctor | None:
    filters = [Doctor.id == doctor_id, Doctor.deleted_at.is_(None)]
    if user_id is not None:
        filters.append(Doctor.user_id == user_id)

    db_doctor = (
        db.query(Doctor)
        .filter(*filters)
        .first()
    )
    if db_doctor is None:
        return None
    return _attach_case_count(db, db_doctor)


def get_all_doctors(
    db: Session, skip: int = 0, limit: int = 100, user_id: int | None = None
) -> list[Doctor]:
    query = db.query(Doctor).filter(Doctor.deleted_at.is_(None))
    if user_id is not None:
        query = query.filter(Doctor.user_id == user_id)

    doctors = (
        query
        .offset(skip)
        .limit(limit)
        .all()
    )
    return _attach_case_counts(db, doctors)


def update_doctor(
    db: Session,
    doctor_id: int,
    doctor_data: DoctorUpdate,
    user_id: int | None = None,
) -> Doctor | None:
    db_doctor = get_doctor_by_id(db, doctor_id, user_id=user_id)

    if db_doctor:
        update_data = doctor_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_doctor, key, value)

        db.commit()
        db.refresh(db_doctor)
        _attach_case_count(db, db_doctor)

    return db_doctor


def delete_doctor(db: Session, doctor_id: int, user_id: int | None = None) -> bool:
    db_doctor = get_doctor_by_id(db, doctor_id, user_id=user_id)

    if db_doctor:
        active_case = (
            db.query(Case)
            .filter(
                Case.doctor_id == doctor_id,
                Case.deleted_at.is_(None),
                Case.status.in_(["pending", "completed"]),
            )
            .first()
        )

        if active_case is not None:
            raise ValueError(
                "Não é possível excluir este doutor porque existem casos "
                "pendentes ou em andamento."
            )

        db_doctor.deleted_at = datetime.now(timezone.utc)
        db.commit()
        return True

    return False
