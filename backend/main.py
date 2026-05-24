"""
Pacote de modelos ORM do sistema Cadista.

Este módulo importa e expõe explicitamente a classe Base e os modelos
para garantir que o SQLAlchemy registre as tabelas na ordem correta,
respeitando a hierarquia e as chaves estrangeiras (doctors -> dental_cases -> case_items).
"""

from fastapi import FastAPI
from backend.database.connection import engine
from backend.models import Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Cadista",
    description="API simples para gestão de laboratórios odontológicos",
    version="1.0.0",
)


@app.get("/")
def read_root():
    return {
        "message": "API Cadista rodando com sucesso! O banco PostgreSQL está conectado."
    }
