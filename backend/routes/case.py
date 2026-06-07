"""
Rotas HTTP para Case.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.dependencies.auth import get_current_user
from backend.database.connection import get_db
from backend.models.user import User
from backend.schemas.case import (
    CaseBulkDeliverRequest,
    CaseCreate,
    CaseResponse,
    CaseUpdate,
)
from backend.services import case as case_service

router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
)


@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    case: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return case_service.create_case(db=db, case_data=case, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/", response_model=list[CaseResponse])
def read_cases(
    skip: int = 0,
    limit: int = 100,
    doctor_id: int | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return case_service.get_all_cases(
        db=db,
        skip=skip,
        limit=limit,
        doctor_id=doctor_id,
        status=status_filter,
        user_id=current_user.id,
    )


@router.get("/{case_id}", response_model=CaseResponse)
def read_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_case = case_service.get_case_by_id(db, case_id, user_id=current_user.id)
    if db_case is None:
        raise HTTPException(status_code=404, detail="Caso não encontrado")
    return db_case


@router.post("/bulk-deliver", response_model=list[CaseResponse])
def bulk_deliver_cases(
    payload: CaseBulkDeliverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return case_service.bulk_deliver_cases(
            db,
            case_ids=payload.case_ids,
            doctor_id=payload.doctor_id,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.put("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: int,
    case_data: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated_case = case_service.update_case(
            db, case_id, case_data, user_id=current_user.id
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if updated_case is None:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    return updated_case


@router.delete("/{case_id}", response_model=CaseResponse)
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deleted_case = case_service.delete_case(db, case_id, user_id=current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return deleted_case
