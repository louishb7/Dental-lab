from __future__ import annotations

import pytest

from backend.database.connection import SessionLocal
from backend.schemas.case import CaseCreate, CaseUpdate
from backend.schemas.case_item import CaseItemCreate, CaseItemUpdate
from backend.schemas.doctor import DoctorCreate
from backend.services import case as case_service
from backend.services import case_item as case_item_service
from backend.services import doctor as doctor_service


def _create_active_case(db):
    doctor = doctor_service.create_doctor(
        db,
        DoctorCreate(
            name="Dr. Item",
            clinic_name="Clínica Item",
        ),
    )
    return case_service.create_case(
        db,
        CaseCreate(doctor_id=doctor.id, patient_ref="Paciente Item"),
    )


def test_case_item_crud_and_block_on_deleted_case() -> None:
    with SessionLocal() as db:
        case = _create_active_case(db)

        item = case_item_service.create_case_item(
            db,
            case.id,
            CaseItemCreate(
                tooth="11",
                service_type="coroa",
                material="zircônia",
                color="A1",
                notes="teste",
            ),
        )

        assert item.id == 1
        assert item.tooth == "11"

        updated = case_item_service.update_case_item(
            db,
            case.id,
            item.id,
            CaseItemUpdate(
                tooth="12",
                notes="ajustado",
            ),
        )

        assert updated is not None
        assert updated.tooth == "12"
        assert updated.notes == "ajustado"

        assert case_item_service.delete_case_item(db, case.id, item.id) is True
        assert case_item_service.get_case_item_by_id(db, case.id, item.id) is None

        delivered_case = case_service.update_case(
            db,
            case.id,
            CaseUpdate(status="delivered"),
        )
        assert delivered_case is not None

        case_service.delete_case(db, case.id)

        with pytest.raises(LookupError, match="Caso não encontrado"):
            case_item_service.create_case_item(
                db,
                case.id,
                CaseItemCreate(
                    tooth="21",
                    service_type="faceta",
                ),
            )
