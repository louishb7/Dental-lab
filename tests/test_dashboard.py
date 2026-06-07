from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient

from backend.core import settings
from backend.database.connection import SessionLocal
from backend.main import app
from backend.models.user import User
from backend.schemas.case import CaseCreate, CaseUpdate
from backend.schemas.case_item import CaseItemCreate
from backend.schemas.doctor import DoctorCreate
from backend.services import case as case_service
from backend.services import case_item as case_item_service
from backend.services import doctor as doctor_service

STRONG_PASSWORD = "StrongPass123!"


def _configure_test_security(monkeypatch) -> None:
    monkeypatch.setattr(settings, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(settings, "ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)


def _register_user(client: TestClient) -> dict:
    response = client.post(
        "/auth/register",
        json={
            "email": "dashboard@cadista.local",
            "username": "dashboard",
            "password": STRONG_PASSWORD,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_dashboard_overview_and_list_counts(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    client = TestClient(app)
    token = _register_user(client)["access_token"]

    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        user_id = db.query(User.id).filter(User.username == "dashboard").scalar_one()
        doctor_a = doctor_service.create_doctor(
            db,
            DoctorCreate(
                name="Dr. Dashboard A",
                clinic_name="Clínica A",
            ),
            user_id=user_id,
        )
        doctor_b = doctor_service.create_doctor(
            db,
            DoctorCreate(
                name="Dr. Dashboard B",
                clinic_name="Clínica B",
            ),
            user_id=user_id,
        )

        overdue_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor_a.id,
                patient_ref="Paciente atrasado",
                deadline=now - timedelta(days=2),
                priority="normal",
            ),
        )
        today_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor_a.id,
                patient_ref="Paciente hoje",
                deadline=now,
                priority="normal",
            ),
        )
        urgent_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor_a.id,
                patient_ref="Paciente urgente",
                deadline=now + timedelta(days=4),
                priority="urgent",
            ),
        )
        case_item_service.create_case_item(
            db,
            urgent_case.id,
            CaseItemCreate(
                tooth="11",
                service_type="coroa",
                unit_value="120,00",
            ),
        )

        completed_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor_b.id,
                patient_ref="Paciente pronto",
                deadline=now + timedelta(days=3),
                priority="normal",
            ),
        )
        case_service.update_case(
            db,
            completed_case.id,
            CaseUpdate(status="completed"),
        )

        delivered_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor_b.id,
                patient_ref="Paciente entregue",
                total_value="250,00",
            ),
        )
        case_service.update_case(
            db,
            delivered_case.id,
            CaseUpdate(status="completed"),
        )
        case_service.update_case(
            db,
            delivered_case.id,
            CaseUpdate(status="delivered"),
        )

        assert overdue_case.id != urgent_case.id
        assert today_case.id != overdue_case.id

    auth_headers = {"Authorization": f"Bearer {token}"}

    doctors_response = client.get("/doctors/", headers=auth_headers)
    assert doctors_response.status_code == 200, doctors_response.text
    doctors_payload = {doctor["name"]: doctor for doctor in doctors_response.json()}
    assert doctors_payload["Dr. Dashboard A"]["cases_count"] == 3
    assert doctors_payload["Dr. Dashboard B"]["cases_count"] == 2

    cases_response = client.get("/cases/", headers=auth_headers)
    assert cases_response.status_code == 200, cases_response.text
    cases_payload = {case["patient_ref"]: case for case in cases_response.json()}
    assert cases_payload["Paciente urgente"]["items_count"] == 1
    assert cases_payload["Paciente entregue"]["items_count"] == 0

    dashboard_response = client.get("/dashboard/overview", headers=auth_headers)
    assert dashboard_response.status_code == 200, dashboard_response.text

    payload = dashboard_response.json()
    assert payload["status_counts"] == {
        "pending": 3,
        "completed": 1,
        "delivered": 1,
    }
    assert len(payload["overdue_cases"]) == 1
    assert payload["overdue_cases"][0]["patient_ref"] == "Paciente atrasado"
    assert len(payload["urgent_open_cases"]) == 1
    assert payload["urgent_open_cases"][0]["doctor_name"] == "Dr. Dashboard A"
    assert len(payload["delivered_cases_month"]) == 1
    assert payload["delivered_cases_month"][0]["patient_ref"] == "Paciente entregue"
    assert Decimal(str(payload["delivered_total_month"])) == Decimal("250.00")
    assert payload["delivered_count_month"] == 1
