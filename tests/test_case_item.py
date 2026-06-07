from __future__ import annotations

from decimal import Decimal

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
                quantity=2,
                unit_value="150,00",
                material="zircônia",
                color="A1",
                notes="teste",
            ),
        )

        assert item.id == 1
        assert item.tooth == "11"
        assert item.quantity == 2
        assert item.unit_value == Decimal("150.00")

        updated = case_item_service.update_case_item(
            db,
            case.id,
            item.id,
            CaseItemUpdate(
                tooth="12",
                quantity=3,
                unit_value="175,00",
                notes="ajustado",
            ),
        )

        assert updated is not None
        assert updated.tooth == "12"
        assert updated.quantity == 3
        assert updated.unit_value == Decimal("175.00")
        assert updated.notes == "ajustado"

        assert case_item_service.delete_case_item(db, case.id, item.id) is True
        assert case_item_service.get_case_item_by_id(db, case.id, item.id) is None

        case_service.update_case(db, case.id, CaseUpdate(status="completed"))
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
                    unit_value="90,00",
                ),
            )


def test_case_item_quantity_must_be_positive() -> None:
    with pytest.raises(ValueError, match="Quantidade deve ser maior ou igual a 1"):
        CaseItemCreate(
            tooth="11",
            service_type="coroa",
            quantity=0,
            unit_value="90,00",
        )


def test_service_pricing_requires_unit_value_and_fixed_pricing_keeps_total() -> None:
    with SessionLocal() as db:
        doctor = doctor_service.create_doctor(
            db,
            DoctorCreate(name="Dr. Cobrança"),
        )
        service_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor.id,
                patient_ref="Paciente Serviço",
                pricing_mode="services",
            ),
        )

        with pytest.raises(ValueError, match="valor unitário"):
            case_item_service.create_case_item(
                db,
                service_case.id,
                CaseItemCreate(
                    tooth="11",
                    service_type="coroa",
                    unit_value=None,
                ),
            )

        fixed_case = case_service.create_case(
            db,
            CaseCreate(
                doctor_id=doctor.id,
                patient_ref="Paciente Fixo",
                pricing_mode="fixed",
                total_value="500,00",
            ),
        )
        item = case_item_service.create_case_item(
            db,
            fixed_case.id,
            CaseItemCreate(
                tooth="21",
                service_type="faceta",
                unit_value=None,
            ),
        )
        refreshed_case = case_service.get_case_by_id(db, fixed_case.id)

        assert item.unit_value is None
        assert refreshed_case is not None
        assert refreshed_case.total_value == Decimal("500.00")
