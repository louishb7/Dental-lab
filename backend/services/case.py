"""
Lógica de negócio e persistência para a entidade Case.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from backend.models.case import Case
from backend.models.case_item import CaseItem
from backend.models.doctor import Doctor
from backend.schemas.case import CaseCreate, CaseUpdate


PRICING_MODES = {"fixed", "services"}
STATUS_FLOW = {
    "pending": "completed",
    "completed": "delivered",
    "delivered": None,
}


def _item_counts_by_case(db: Session, case_ids: list[int]) -> dict[int, int]:
    if not case_ids:
        return {}

    rows = (
        db.query(CaseItem.case_id, func.count(CaseItem.id))
        .join(Case, Case.id == CaseItem.case_id)
        .filter(Case.deleted_at.is_(None), CaseItem.case_id.in_(case_ids))
        .group_by(CaseItem.case_id)
        .all()
    )
    return {case_id: int(count) for case_id, count in rows}


def _attach_items_count(db: Session, case: Case) -> Case:
    counts = _item_counts_by_case(db, [case.id])
    setattr(case, "items_count", counts.get(case.id, 0))
    return case


def _attach_items_counts(db: Session, cases: list[Case]) -> list[Case]:
    counts = _item_counts_by_case(db, [case.id for case in cases])
    for case in cases:
        setattr(case, "items_count", counts.get(case.id, 0))
    return cases


def _get_active_doctor(db: Session, doctor_id: int) -> Doctor | None:
    return (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id, Doctor.deleted_at.is_(None))
        .first()
    )


def _resolve_pricing_mode(
    pricing_mode: str | None,
    total_value: Decimal | None,
    current_mode: str | None = None,
) -> str:
    resolved_mode = pricing_mode or current_mode
    if resolved_mode is None:
        resolved_mode = "fixed" if total_value is not None else "services"

    if resolved_mode not in PRICING_MODES:
        raise ValueError("Modo de cobrança inválido")

    return resolved_mode


def _sum_case_item_values(db: Session, case_id: int) -> Decimal | None:
    total = (
        db.query(func.sum(CaseItem.unit_value))
        .filter(CaseItem.case_id == case_id)
        .scalar()
    )

    if total is None:
        return None
    if isinstance(total, Decimal):
        return total
    return Decimal(str(total))


def recalculate_service_case_total(db: Session, case_id: int) -> Case | None:
    db_case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )
    if db_case is None or db_case.pricing_mode != "services":
        return db_case

    db_case.total_value = _sum_case_item_values(db, case_id)
    db.commit()
    db.refresh(db_case)
    return db_case


def create_case(db: Session, case_data: CaseCreate) -> Case:
    if _get_active_doctor(db, case_data.doctor_id) is None:
        raise ValueError("Doutor não encontrado")

    pricing_mode = _resolve_pricing_mode(
        case_data.pricing_mode,
        case_data.total_value,
    )
    if pricing_mode == "fixed" and case_data.total_value is None:
        raise ValueError("Informe o valor fixo para este caso.")
    if pricing_mode == "services" and case_data.pricing_mode == "services" and case_data.total_value is not None:
        raise ValueError("Casos por serviços não usam valor combinado.")

    total_value = case_data.total_value if pricing_mode == "fixed" else None

    db_case = Case(
        doctor_id=case_data.doctor_id,
        patient_ref=case_data.patient_ref,
        pricing_mode=pricing_mode,
        deadline=case_data.deadline,
        priority=case_data.priority,
        status="pending",
        total_value=total_value,
        notes=case_data.notes,
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return _attach_items_count(db, db_case)


def get_case_by_id(db: Session, case_id: int) -> Case | None:
    db_case = (
        db.query(Case)
        .options(selectinload(Case.items))
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )
    if db_case is None:
        return None
    return _attach_items_count(db, db_case)


def get_all_cases(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    doctor_id: int | None = None,
    status: str | None = None,
) -> list[Case]:
    query = (
        db.query(Case)
        .options(selectinload(Case.items))
        .filter(Case.deleted_at.is_(None))
    )

    if doctor_id is not None:
        query = query.filter(Case.doctor_id == doctor_id)

    if status is not None:
        query = query.filter(Case.status == status)

    cases = query.order_by(Case.id.desc()).offset(skip).limit(limit).all()
    return _attach_items_counts(db, cases)


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
    update_data.pop("status_revert_reason", None)
    new_pricing_mode = update_data.pop("pricing_mode", None)
    total_value_provided = "total_value" in update_data
    new_total_value = update_data.pop("total_value", None)

    new_doctor_id = update_data.get("doctor_id")
    if new_doctor_id is not None and _get_active_doctor(db, new_doctor_id) is None:
        raise ValueError("Doutor não encontrado")

    target_pricing_mode = _resolve_pricing_mode(
        new_pricing_mode,
        new_total_value if total_value_provided else None,
        db_case.pricing_mode,
    )

    for key, value in update_data.items():
        setattr(db_case, key, value)

    if target_pricing_mode == "fixed":
        if total_value_provided:
            if new_total_value is None:
                raise ValueError("Informe o valor fixo para este caso.")
            db_case.total_value = new_total_value
        elif db_case.total_value is None:
            raise ValueError("Informe o valor fixo para este caso.")
    else:
        if total_value_provided and new_total_value is not None:
            raise ValueError("Casos por serviços não usam valor combinado.")
        db_case.total_value = _sum_case_item_values(db, case_id)

    db_case.pricing_mode = target_pricing_mode

    if new_status is not None:
        current_index = list(STATUS_FLOW).index(db_case.status)
        target_index = list(STATUS_FLOW).index(new_status)
        if target_index < current_index:
            raise ValueError(
                "Fluxo de status inválido. Use pending -> completed -> delivered."
            )
        if target_index > current_index + 1:
            raise ValueError(
                "Fluxo de status inválido. Use pending -> completed -> delivered."
            )
        db_case.status = new_status

        if new_status == "delivered" and db_case.delivered_at is None:
            db_case.delivered_at = datetime.now(timezone.utc)
    else:
        if db_case.status not in STATUS_FLOW:
            raise ValueError("Status atual inválido.")

    db.commit()
    db.refresh(db_case)
    _attach_items_count(db, db_case)
    return db_case


def delete_case(db: Session, case_id: int) -> Case:
    db_case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )
    if db_case is None:
        raise LookupError("Caso não encontrado")

    db_case.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_case)
    _attach_items_count(db, db_case)
    return db_case


def bulk_deliver_cases(
    db: Session,
    case_ids: list[int] | None = None,
    doctor_id: int | None = None,
) -> list[Case]:
    normalized_ids = list(dict.fromkeys(case_ids or []))
    query = db.query(Case).filter(Case.deleted_at.is_(None))

    if doctor_id is not None:
        query = query.filter(Case.doctor_id == doctor_id)

    if normalized_ids:
        query = query.filter(Case.id.in_(normalized_ids))
    else:
        query = query.filter(Case.status == "completed")

    cases = query.order_by(Case.id.asc()).all()
    if normalized_ids:
        found_ids = {case.id for case in cases}
        missing_ids = [case_id for case_id in normalized_ids if case_id not in found_ids]
        if missing_ids:
            raise ValueError("Alguns pedidos selecionados não foram encontrados.")

    now = datetime.now(timezone.utc)
    for case in cases:
        if case.status == "pending":
            case.status = "completed"
        case.status = "delivered"
        case.delivered_at = case.delivered_at or now

    if cases:
        db.commit()
        for case in cases:
            db.refresh(case)
            _attach_items_count(db, case)

    return cases
