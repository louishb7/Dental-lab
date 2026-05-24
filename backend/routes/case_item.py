"""
Rotas HTTP para CaseItem.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.dependencies.auth import get_current_user
from backend.database.connection import get_db
from backend.schemas.case_item import (
    CaseItemCreate,
    CaseItemResponse,
    CaseItemUpdate,
)
from backend.services import case_item as case_item_service

router = APIRouter(
    prefix="/cases/{case_id}/items",
    tags=["CaseItems"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[CaseItemResponse])
def list_items(case_id: int, db: Session = Depends(get_db)):
    try:
        return case_item_service.list_case_items(db, case_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/", response_model=CaseItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(case_id: int, item: CaseItemCreate, db: Session = Depends(get_db)):
    try:
        return case_item_service.create_case_item(db, case_id, item)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{item_id}", response_model=CaseItemResponse)
def read_item(case_id: int, item_id: int, db: Session = Depends(get_db)):
    db_item = case_item_service.get_case_item_by_id(db, case_id, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item do caso não encontrado")
    return db_item


@router.put("/{item_id}", response_model=CaseItemResponse)
def update_item(
    case_id: int, item_id: int, item: CaseItemUpdate, db: Session = Depends(get_db)
):
    try:
        updated_item = case_item_service.update_case_item(db, case_id, item_id, item)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if updated_item is None:
        raise HTTPException(status_code=404, detail="Item do caso não encontrado")
    return updated_item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(case_id: int, item_id: int, db: Session = Depends(get_db)):
    try:
        deleted = case_item_service.delete_case_item(db, case_id, item_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Item do caso não encontrado")
    return None
