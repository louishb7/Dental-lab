"""
Lógica de negócio e persistência para a entidade CaseItem.
"""

from sqlalchemy.orm import Session

from backend.models.case import Case
from backend.models.case_item import CaseItem
from backend.schemas.case_item import CaseItemCreate, CaseItemUpdate


def _get_active_case(db: Session, case_id: int) -> Case | None:
    return (
        db.query(Case)
        .filter(Case.id == case_id, Case.deleted_at.is_(None))
        .first()
    )


def get_case_item_by_id(db: Session, case_id: int, item_id: int) -> CaseItem | None:
    return (
        db.query(CaseItem)
        .join(Case, Case.id == CaseItem.case_id)
        .filter(
            CaseItem.id == item_id,
            CaseItem.case_id == case_id,
            Case.deleted_at.is_(None),
        )
        .first()
    )


def list_case_items(db: Session, case_id: int) -> list[CaseItem]:
    if _get_active_case(db, case_id) is None:
        raise LookupError("Caso não encontrado")

    return (
        db.query(CaseItem)
        .filter(CaseItem.case_id == case_id)
        .order_by(CaseItem.id.desc())
        .all()
    )


def create_case_item(db: Session, case_id: int, item_data: CaseItemCreate) -> CaseItem:
    db_case = _get_active_case(db, case_id)
    if db_case is None:
        raise LookupError("Caso não encontrado")

    db_item = CaseItem(case_id=case_id, **item_data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_case_item(
    db: Session, case_id: int, item_id: int, item_data: CaseItemUpdate
) -> CaseItem | None:
    if _get_active_case(db, case_id) is None:
        raise LookupError("Caso não encontrado")

    db_item = get_case_item_by_id(db, case_id=case_id, item_id=item_id)
    if db_item is None:
        return None

    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item


def delete_case_item(db: Session, case_id: int, item_id: int) -> bool:
    if _get_active_case(db, case_id) is None:
        raise LookupError("Caso não encontrado")

    db_item = get_case_item_by_id(db, case_id=case_id, item_id=item_id)
    if db_item is None:
        return False

    db.delete(db_item)
    db.commit()
    return True
