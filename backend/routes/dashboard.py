"""
Rotas HTTP para o painel resumido do sistema.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.dashboard import DashboardSummaryResponse
from backend.services.dashboard import get_dashboard_summary

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/overview", response_model=DashboardSummaryResponse)
def read_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dashboard_summary(db, user_id=current_user.id)
