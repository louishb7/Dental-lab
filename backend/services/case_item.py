"""
Lógica de negócio e persistência para a entidade CaseItem.
"""

from sqlalchemy.orm import Session

from backend.models.case import Case
from backend.models.case_item import CaseItem
from backend.models.doctor import Doctor
from backend.schemas.case_item import CaseItemCreate, CaseItemUpdate
from backend.services.case import recalculate_service_case_total


def _get_active_case(
    db: Session, case_id: int, user_id: int | None = None
) -> Case | None:
    query = db.query(Case).filter(Case.id == case_id, Case.deleted_at.is_(None))
    if user_id is not None:
        query = query.join(Doctor, Doctor.id == Case.doctor_id).filter(
            Doctor.user_id == user_id
        )
    return query.first()


def get_case_item_by_id(
    db: Session, case_id: int, item_id: int, user_id: int | None = None
) -> CaseItem | None:
    query = (
        db.query(CaseItem)
        .join(Case, Case.id == CaseItem.case_id)
        .filter(
            CaseItem.id == item_id,
            CaseItem.case_id == case_id,
            Case.deleted_at.is_(None),
        )
    )
    if user_id is not None:
        query = query.join(Doctor, Doctor.id == Case.doctor_id).filter(
            Doctor.user_id == user_id
        )
    return query.first()


def list_case_items(
    db: Session, case_id: int, user_id: int | None = None
) -> list[CaseItem]:
    if _get_active_case(db, case_id, user_id=user_id) is None:
        raise LookupError("Caso não encontrado")

    return (
        db.query(CaseItem)
        .filter(CaseItem.case_id == case_id)
        .order_by(CaseItem.id.desc())
        .all()
    )


def create_case_item(
    db: Session,
    case_id: int,
    item_data: CaseItemCreate,
    user_id: int | None = None,
) -> CaseItem:
    db_case = _get_active_case(db, case_id, user_id=user_id)
    if db_case is None:
        raise LookupError("Caso não encontrado")

    if db_case.pricing_mode == "services" and item_data.unit_value is None:
        raise ValueError("Informe o valor unitário do serviço para este caso.")

    db_item = CaseItem(case_id=case_id, **item_data.model_dump())
    db.add(db_item)
    db.flush()
    if db_case.pricing_mode == "services":
        recalculate_service_case_total(db, case_id)
    else:
        db.commit()
        db.refresh(db_item)
        return db_item

    db.commit()
    db.refresh(db_item)
    return db_item


def update_case_item(
    db: Session,
    case_id: int,
    item_id: int,
    item_data: CaseItemUpdate,
    user_id: int | None = None,
) -> CaseItem | None:
    db_case = _get_active_case(db, case_id, user_id=user_id)
    if db_case is None:
        raise LookupError("Caso não encontrado")

    db_item = get_case_item_by_id(
        db, case_id=case_id, item_id=item_id, user_id=user_id
    )
    if db_item is None:
        return None

    update_data = item_data.model_dump(exclude_unset=True)
    if (
        db_case.pricing_mode == "services"
        and "unit_value" in update_data
        and update_data["unit_value"] is None
    ):
        raise ValueError("Informe o valor unitário do serviço para este caso.")
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.flush()

    if db_case.pricing_mode == "services":
        recalculate_service_case_total(db, case_id)
    else:
        db.commit()
        db.refresh(db_item)
        return db_item

    db.commit()
    db.refresh(db_item)
    return db_item


def delete_case_item(
    db: Session, case_id: int, item_id: int, user_id: int | None = None
) -> bool:
    db_case = _get_active_case(db, case_id, user_id=user_id)
    if db_case is None:
        raise LookupError("Caso não encontrado")

    db_item = get_case_item_by_id(
        db, case_id=case_id, item_id=item_id, user_id=user_id
    )
    if db_item is None:
        return False

    db.delete(db_item)
    db.flush()
    if db_case.pricing_mode == "services":
        recalculate_service_case_total(db, case_id)
    else:
        db.commit()
        return True

    db.commit()
    return True
