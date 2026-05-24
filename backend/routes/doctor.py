"""
Módulo de rotas (Endpoints) para a entidade Doctor.
Este arquivo define as portas de entrada da API para gerenciar os clientes (dentistas)
do laboratório Cadista. Ele conecta as requisições HTTP à lógica de banco de dados (CRUD).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.doctor import DoctorCreate, DoctorResponse, DoctorUpdate
from backend.services import doctor as doctor_service

# Cria o roteador para agrupar todos os endpoints de "/doctors"
router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.post(
    "/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED
)
def create_doctor(doctor: DoctorCreate, db: Session = Depends(get_db)):
    """
    Cria um novo registro de Doutor no sistema.

    Args:
        doctor (DoctorCreate): O corpo da requisição validado pelo schema Pydantic.
        db (Session): A sessão do banco de dados injetada automaticamente.

    Returns:
        DoctorResponse: Os dados do doutor recém-criado, formatados para saída.
    """
    return doctor_service.create_doctor(db=db, doctor=doctor)


@router.get("/", response_model=List[DoctorResponse])
def read_doctors(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """
    Lista todos os Doutores cadastrados no sistema.

    Args:
        skip (int): Número de registros para pular (para paginação). Padrão é 0.
        limit (int): Limite de registros retornados. Padrão é 100.
        db (Session): A sessão do banco de dados injetada automaticamente.

    Returns:
        List[DoctorResponse]: Uma lista de doutores formatada pelo schema.
    """
    return doctor_service.get_all_doctors(db, skip=skip, limit=limit)


@router.get("/{doctor_id}", response_model=DoctorResponse)
def read_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """
    Busca as informações de um Doutor específico pelo seu ID.

    Args:
        doctor_id (int): O ID único do doutor passado na URL.
        db (Session): A sessão do banco de dados injetada automaticamente.

    Returns:
        DoctorResponse: Os dados do doutor encontrado.

    Raises:
        HTTPException: Retorna erro 404 se o doutor não for encontrado.
    """
    db_doctor = doctor_service.get_doctor_by_id(db, doctor_id=doctor_id)
    if db_doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doutor não encontrado",
        )
    return db_doctor


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int, doctor_data: DoctorUpdate, db: Session = Depends(get_db)
):
    """
    Atualiza os dados de um Doutor existente.

    Args:
        doctor_id (int): O ID único do doutor passado na URL.
        doctor_data (DoctorUpdate): Os novos dados enviados no corpo da requisição.
        db (Session): A sessão do banco de dados injetada automaticamente.

    Returns:
        DoctorResponse: Os dados do doutor atualizados.

    Raises:
        HTTPException: Retorna erro 404 se o doutor não for encontrado.
    """
    updated_doctor = doctor_service.update_doctor(
        db, doctor_id=doctor_id, doctor_data=doctor_data
    )
    if updated_doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doutor não encontrado",
        )
    return updated_doctor


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """
    Exclui um Doutor do sistema.
    Aviso: a remoção deve respeitar a regra de negócio que impede
    excluir doutores com casos pendentes ou em andamento associados.

    Args:
        doctor_id (int): O ID único do doutor passado na URL.
        db (Session): A sessão do banco de dados injetada automaticamente.

    Raises:
        HTTPException: Retorna erro 404 se o doutor não for encontrado.
    """
    db_doctor = doctor_service.get_doctor_by_id(db, doctor_id=doctor_id)
    if db_doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doutor não encontrado",
        )

    active_cases = [
        case
        for case in db_doctor.cases
        if case.deleted_at is None and case.status in {"pending", "completed"}
    ]

    if active_cases:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Não é possível excluir este doutor porque existem casos pendentes ou em andamento."
            ),
        )

    success = doctor_service.delete_doctor(db, doctor_id=doctor_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha inesperada ao excluir doutor",
        )

    return None
