from __future__ import annotations

from decimal import Decimal

import pytest

from backend.database.connection import SessionLocal
from backend.schemas.case import CaseCreate, CaseUpdate
from backend.schemas.case_item import CaseItemCreate
from backend.schemas.doctor import DoctorCreate
from backend.services import case as case_service
from backend.services import case_item as case_item_service
from backend.services import doctor as doctor_service


def _create_doctor(db: SessionLocal):
    return doctor_service.create_doctor(
        db,
        DoctorCreate(
            name="Dr. Caso",
            clinic_name="Clínica Caso",
        ),
    )


def test_create_case_and_normalize_money() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)

        case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor.id,
                patient_ref="Paciente A",
                total_value="1.234,56",
                notes="Primeiro caso",
            ),
        )

        assert case.id == 1
        assert case.status == "pending"
        assert case.total_value == Decimal("1234.56")
        assert case.delivered_at is None


def test_create_and_move_case_require_active_doctor() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)
        case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente ativo"),
        )
        case_service.update_case(db, case.id, CaseUpdate(status="completed"))
        case_service.update_case(db, case.id, CaseUpdate(status="delivered"))

        doctor_service.delete_doctor(db, doctor.id)

        with pytest.raises(ValueError, match="Doutor não encontrado"):
            case_service.create_case(
                db,
                CaseCreate(doctor_id=doctor.id, patient_ref="Paciente inválido"),
            )

        with pytest.raises(ValueError, match="Doutor não encontrado"):
            case_service.update_case(
                db,
                case.id,
                CaseUpdate(doctor_id=doctor.id),
            )


def test_case_status_flow_is_linear() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)
        case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente B"),
        )

        with pytest.raises(ValueError, match="Fluxo de status inválido"):
            case_service.update_case(
                db,
                case.id,
                CaseUpdate(status="delivered"),
            )

        completed = case_service.update_case(
            db,
            case.id,
            CaseUpdate(status="completed"),
        )

        assert completed is not None
        assert completed.status == "completed"

        delivered = case_service.update_case(
            db,
            case.id,
            CaseUpdate(status="delivered"),
        )

        assert delivered is not None
        assert delivered.status == "delivered"
        assert delivered.delivered_at is not None

        with pytest.raises(ValueError, match="Fluxo de status inválido"):
            case_service.update_case(
                db,
                case.id,
                CaseUpdate(status="completed"),
            )

        with pytest.raises(ValueError, match="Fluxo de status inválido"):
            case_service.update_case(
                db,
                case.id,
                CaseUpdate(status="pending"),
            )


def test_service_mode_case_recalculates_total_from_items() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)
        case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor.id,
                patient_ref="Paciente Soma",
                pricing_mode="services",
            ),
        )

        assert case.total_value is None

        first_item = case_item_service.create_case_item(
            db,
            case.id,
            CaseItemCreate(
                tooth="11",
                service_type="coroa",
                unit_value="120,00",
            ),
        )
        assert first_item.unit_value == Decimal("120.00")

        second_item = case_item_service.create_case_item(
            db,
            case.id,
            CaseItemCreate(
                tooth="21",
                service_type="faceta",
                unit_value="80,00",
            ),
        )
        assert second_item.unit_value == Decimal("80.00")

        updated_case = case_service.get_case_by_id(db, case.id)
        assert updated_case is not None
        assert updated_case.total_value == Decimal("200.00")


def test_case_delete_rules_and_soft_delete() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)

        pending_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente C"),
        )

        deleted_pending = case_service.delete_case(db, pending_case.id)
        assert deleted_pending.id == pending_case.id
        assert case_service.get_case_by_id(db, pending_case.id) is None

        valued_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor.id,
                patient_ref="Paciente D",
                total_value="200,00",
            ),
        )

        with pytest.raises(ValueError, match="pending com valor registrado"):
            case_service.delete_case(db, valued_case.id)

        delivered_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor.id,
                patient_ref="Paciente E",
            ),
        )
        case_service.update_case(db, delivered_case.id, CaseUpdate(status="completed"))
        case_service.update_case(db, delivered_case.id, CaseUpdate(status="delivered"))

        deleted_delivered = case_service.delete_case(db, delivered_case.id)
        assert deleted_delivered.deleted_at is not None
        assert case_service.get_case_by_id(db, delivered_case.id) is None
