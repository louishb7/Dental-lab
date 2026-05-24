"""
Módulo de configuração do banco de dados para a API Cadista.
Responsável por estabelecer a conexão com o PostgreSQL e fornecer
sessões de banco de dados para as rotas da aplicação.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.core.settings import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

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
