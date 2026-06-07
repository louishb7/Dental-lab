from __future__ import annotations

import pytest

from backend.database.connection import SessionLocal
from backend.models.user import User
from backend.schemas.case import CaseCreate, CaseUpdate
from backend.schemas.case_item import CaseItemCreate
from backend.schemas.doctor import DoctorCreate
from backend.services import case as case_service
from backend.services import case_item as case_item_service
from backend.services import dashboard as dashboard_service
from backend.services import doctor as doctor_service


def _create_user(db, email: str, username: str) -> User:
    user = User(email=email, username=username, password_hash="not-used")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_services_scope_doctors_cases_items_and_dashboard_by_user() -> None:
    with SessionLocal() as db:
        first_user = _create_user(db, "first@cadista.local", "first")
        second_user = _create_user(db, "second@cadista.local", "second")

        first_doctor = doctor_service.create_doctor(
            db,
            DoctorCreate(name="Dr. Primeiro"),
            user_id=first_user.id,
        )
        second_doctor = doctor_service.create_doctor(
            db,
            DoctorCreate(name="Dr. Segundo"),
            user_id=second_user.id,
        )

        first_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=first_doctor.id,
                patient_ref="Paciente Primeiro",
                pricing_mode="services",
            ),
            user_id=first_user.id,
        )
        second_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=second_doctor.id,
                patient_ref="Paciente Segundo",
                pricing_mode="services",
            ),
            user_id=second_user.id,
        )
        first_item = case_item_service.create_case_item(
            db,
            first_case.id,
            CaseItemCreate(
                tooth="11",
                service_type="Coroa",
                unit_value="100,00",
            ),
            user_id=first_user.id,
        )

        assert doctor_service.get_doctor_by_id(
            db, first_doctor.id, user_id=second_user.id
        ) is None
        assert case_service.get_case_by_id(
            db, first_case.id, user_id=second_user.id
        ) is None
        assert case_item_service.get_case_item_by_id(
            db, first_case.id, first_item.id, user_id=second_user.id
        ) is None

        assert [doctor.name for doctor in doctor_service.get_all_doctors(
            db, user_id=first_user.id
        )] == ["Dr. Primeiro"]
        assert [case.patient_ref for case in case_service.get_all_cases(
            db, user_id=second_user.id
        )] == ["Paciente Segundo"]

        with pytest.raises(ValueError, match="Doutor não encontrado"):
            case_service.create_case(
                db,
                CaseCreate(
                    doctor_id=first_doctor.id,
                    patient_ref="Paciente Cruzado",
                    pricing_mode="services",
                ),
                user_id=second_user.id,
            )

        with pytest.raises(LookupError, match="Caso não encontrado"):
            case_item_service.list_case_items(
                db, first_case.id, user_id=second_user.id
            )

        assert case_service.update_case(
            db,
            first_case.id,
            CaseUpdate(patient_ref="Tentativa"),
            user_id=second_user.id,
        ) is None

        first_dashboard = dashboard_service.get_dashboard_summary(
            db, user_id=first_user.id
        )
        second_dashboard = dashboard_service.get_dashboard_summary(
            db, user_id=second_user.id
        )

        assert first_dashboard.status_counts == {
            "pending": 1,
            "completed": 0,
            "delivered": 0,
        }
        assert second_dashboard.status_counts == {
            "pending": 1,
            "completed": 0,
            "delivered": 0,
        }
        assert first_case.id != second_case.id
