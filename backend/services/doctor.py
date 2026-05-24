"""
Módulo de operações de persistência para a entidade Doctor.
"""

from sqlalchemy.orm import Session

from backend.models.doctor import Doctor
from backend.schemas.doctor import DoctorCreate, DoctorUpdate


def create_doctor(db: Session, doctor: DoctorCreate) -> Doctor:
    db_doctor = Doctor(**doctor.model_dump())
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor


def get_doctor_by_id(db: Session, doctor_id: int) -> Doctor | None:
    return db.query(Doctor).filter(Doctor.id == doctor_id).first()


def get_all_doctors(db: Session, skip: int = 0, limit: int = 100) -> list[Doctor]:
    return db.query(Doctor).offset(skip).limit(limit).all()


def update_doctor(
    db: Session, doctor_id: int, doctor_data: DoctorUpdate
) -> Doctor | None:
    db_doctor = get_doctor_by_id(db, doctor_id)

    if db_doctor:
        update_data = doctor_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_doctor, key, value)

        db.commit()
        db.refresh(db_doctor)

    return db_doctor


def delete_doctor(db: Session, doctor_id: int) -> bool:
    db_doctor = get_doctor_by_id(db, doctor_id)

    if db_doctor:
        db.delete(db_doctor)
        db.commit()
        return True

    return False
