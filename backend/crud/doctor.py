"""
Módulo de operações CRUD (Create, Read, Update, Delete) para a entidade Doctor.
Responsável por isolar a lógica de acesso a dados (SQLAlchemy) das rotas da API.
"""

from sqlalchemy.orm import Session
from backend.models.doctor import Doctor
from backend.schemas.doctor import DoctorCreate


def create_doctor(db: Session, doctor: DoctorCreate) -> Doctor:
    """
    Cria um novo registro de Doutor (cliente) no banco de dados.

    Args:
        db (Session): Sessão ativa do banco de dados injetada pela rota.
        doctor (DoctorCreate): Dados validados do doutor recebidos via Pydantic.

    Returns:
        Doctor: A instância do modelo Doctor recém-criada e salva no banco.
    """

    db_doctor = Doctor(**doctor.model_dump())

    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)

    return db_doctor


def get_doctor_by_id(db: Session, doctor_id: int) -> Doctor | None:
    """
    Busca um Doutor específico pelo seu ID único.

    Args:
        db (Session): Sessão ativa do banco de dados.
        doctor_id (int): ID do doutor a ser buscado.

    Returns:
        Doctor | None: Retorna o modelo Doctor se encontrado, caso contrário, None.
    """
    return db.query(Doctor).filter(Doctor.id == doctor_id).first()


def get_all_doctors(
    db: Session, skip: int = 0, limit: int = 100
) -> list[Doctor]:
    """
    Lista os Doutores cadastrados no sistema, com suporte a paginação simples.

    Args:
        db (Session): Sessão ativa do banco de dados.
        skip (int): Número de registros para pular (offset). Padrão é 0.
        limit (int): Número máximo de registros para retornar. Padrão é 100.

    Returns:
        list[Doctor]: Uma lista contendo os doutores encontrados.
    """
    return db.query(Doctor).offset(skip).limit(limit).all()


def update_doctor(
    db: Session, doctor_id: int, doctor_data: DoctorCreate
) -> Doctor | None:
    """
    Atualiza os dados de um Doutor existente.

    Args:
        db (Session): Sessão ativa do banco de dados.
        doctor_id (int): ID do doutor que será atualizado.
        doctor_data (DoctorCreate): Novos dados validados para atualização.

    Returns:
        Doctor | None: O modelo atualizado se o doutor existir, ou None se não for encontrado.
    """
    db_doctor = get_doctor_by_id(db, doctor_id)

    if db_doctor:
        update_data = doctor_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_doctor, key, value)

        db.commit()
        db.refresh(db_doctor)

    return db_doctor


def delete_doctor(db: Session, doctor_id: int) -> bool:
    """
    Remove um Doutor do banco de dados.
    Devido ao comportamento 'cascade' no modelo, todos os casos atrelados a ele também serão excluídos.

    Args:
        db (Session): Sessão ativa do banco de dados.
        doctor_id (int): ID do doutor a ser excluído.

    Returns:
        bool: True se o doutor foi excluído com sucesso, False se o doutor não foi encontrado.
    """
    db_doctor = get_doctor_by_id(db, doctor_id)

    if db_doctor:
        db.delete(db_doctor)
        db.commit()
        return True

    return False
