"""
Módulo de configuração do banco de dados para a API Cadista.
Responsável por estabelecer a conexão com o PostgreSQL e fornecer
sessões de banco de dados para as rotas da aplicação.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://cadista_user:cadista123@localhost:5432/cadista_db",
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Função geradora que gerencia o ciclo de vida da sessão do banco de dados.

    Utiliza 'yield' para injetar a sessão nas requisições do FastAPI,
    garantindo que a conexão seja fechada corretamente após o uso,
    evitando vazamento de conexões.

    Yields:
        Session: Uma sessão ativa do SQLAlchemy.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
