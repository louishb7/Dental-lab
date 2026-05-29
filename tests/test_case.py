from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from backend.core import settings
from backend.main import app
from backend.database.connection import SessionLocal
from backend.schemas.case import CaseCreate, CaseUpdate
from backend.schemas.case_item import CaseItemCreate
from backend.schemas.doctor import DoctorCreate
from backend.services import case as case_service
from backend.services import case_item as case_item_service
from backend.services import doctor as doctor_service

STRONG_PASSWORD = "StrongPass123!"


def _create_doctor(db: SessionLocal):
    return doctor_service.create_doctor(
        db,
        DoctorCreate(
            name="Dr. Caso",
            clinic_name="Clínica Caso",
        ),
    )


def _configure_test_security(monkeypatch) -> None:
    monkeypatch.setattr(settings, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(settings, "ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)


def _register_user(client: TestClient) -> dict:
    response = client.post(
        "/auth/register",
        json={
            "email": "case@cadista.local",
            "username": "case",
            "password": STRONG_PASSWORD,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


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


def test_bulk_deliver_cases_delivers_completed_cases_by_default() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)
        pending_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Pendente"),
        )
        completed_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Completo"),
        )
        case_service.update_case(
            db,
            completed_case.id,
            CaseUpdate(status="completed"),
        )

        delivered_cases = case_service.bulk_deliver_cases(db, doctor_id=doctor.id)

        assert [case.id for case in delivered_cases] == [completed_case.id]
        assert delivered_cases[0].status == "delivered"
        assert delivered_cases[0].delivered_at is not None

        refreshed_pending = case_service.get_case_by_id(db, pending_case.id)
        assert refreshed_pending is not None
        assert refreshed_pending.status == "pending"


def test_bulk_deliver_cases_allows_manual_selection() -> None:
    with SessionLocal() as db:
        doctor = _create_doctor(db)
        pending_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Manual"),
        )
        completed_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Pronto"),
        )
        case_service.update_case(
            db,
            completed_case.id,
            CaseUpdate(status="completed"),
        )

        delivered_cases = case_service.bulk_deliver_cases(
            db,
            case_ids=[pending_case.id, completed_case.id],
            doctor_id=doctor.id,
        )

        assert {case.id for case in delivered_cases} == {
            pending_case.id,
            completed_case.id,
        }
        assert all(case.status == "delivered" for case in delivered_cases)
        assert all(case.delivered_at is not None for case in delivered_cases)


def test_bulk_deliver_cases_route_accepts_selected_cases(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    client = TestClient(app)
    token = _register_user(client)["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with SessionLocal() as db:
        doctor = _create_doctor(db)
        pending_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Rota"),
        )
        completed_case = case_service.create_case(
            db,
            CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Rota Completo"),
        )
        case_service.update_case(
            db,
            completed_case.id,
            CaseUpdate(status="completed"),
        )
        doctor_id = doctor.id
        pending_case_id = pending_case.id
        completed_case_id = completed_case.id

    response = client.post(
        "/cases/bulk-deliver",
        headers=headers,
        json={
            "case_ids": [pending_case_id, completed_case_id],
            "doctor_id": doctor_id,
        },
    )
    assert response.status_code == 200, response.text

    payload = response.json()
    assert {case["id"] for case in payload} == {
        pending_case_id,
        completed_case_id,
    }


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

        deleted_valued = case_service.delete_case(db, valued_case.id)
        assert deleted_valued.deleted_at is not None
        assert case_service.get_case_by_id(db, valued_case.id) is None

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
