from __future__ import annotations

import pytest
from sqlalchemy import text

from backend.database.connection import SessionLocal
from backend.schemas.doctor import DoctorCreate, DoctorUpdate
from backend.services import doctor as doctor_service


def test_create_update_and_soft_delete_doctor() -> None:
    with SessionLocal() as db:
        doctor = doctor_service.create_doctor(
            db,
            DoctorCreate(
                name="Dr. João",
                clinic_name="Clínica Central",
                phone="(11)99999-0000",
                notes="Contato principal",
            ),
        )

        assert doctor.id == 1
        assert doctor.deleted_at is None

        updated = doctor_service.update_doctor(
            db,
            doctor.id,
            DoctorUpdate(phone="(11)98888-0000", notes="Atualizado"),
        )

        assert updated is not None
        assert updated.phone == "(11)98888-0000"
        assert updated.notes == "Atualizado"

        assert doctor_service.delete_doctor(db, doctor.id) is True
        assert doctor_service.get_doctor_by_id(db, doctor.id) is None
        assert doctor_service.get_all_doctors(db) == []

        deleted_at = db.execute(
            text("SELECT deleted_at FROM doctors WHERE id = :doctor_id"),
            {"doctor_id": doctor.id},
        ).scalar_one()

        assert deleted_at is not None


def test_doctor_phone_requires_brazilian_mobile_order() -> None:
    assert DoctorCreate(name="Dr. Valido", phone="11999990000").phone == "(11)99999-0000"
    assert DoctorCreate(name="Dr. Sem Telefone", phone="").phone is None

    with pytest.raises(ValueError, match="Telefone deve estar em branco"):
        DoctorCreate(name="Dr. Invalido", phone="(11)88888-0000")


def test_delete_doctor_is_blocked_when_active_cases_exist() -> None:
    with SessionLocal() as db:
        doctor = doctor_service.create_doctor(
            db,
            DoctorCreate(
                name="Dr. Bloqueado",
                clinic_name="Clínica Norte",
            ),
        )

        from backend.schemas.case import CaseCreate
        from backend.services import case as case_service

        case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente 1"),
        )

        try:
            doctor_service.delete_doctor(db, doctor.id)
            raise AssertionError("Era esperado ValueError ao excluir doutor com caso ativo")
        except ValueError as exc:
            assert "casos pendentes ou em andamento" in str(exc)
