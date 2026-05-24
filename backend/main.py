"""
Ponto de entrada principal da API Cadista.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.connection import engine
from backend.models import Base
from backend.routes import doctor

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Cadista",
    description="API para gestão operacional de laboratórios odontológicos e cadistas independentes",
    version="1.0.0",
)

# --- CONFIGURAÇÃO DE CORS ---
# Permite que o frontend (HTML/JS) faça requisições para esta API
# Apenas para testes iniciais. Remover depois!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Em produção, substitua "*" pelo domínio real do frontend
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Permite todos os cabeçalhos
)

app.include_router(doctor.router)


@app.get("/")
def read_root():
    return {"message": "API Cadista operante!"}
