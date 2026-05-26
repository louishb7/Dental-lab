"""
Ponto de entrada principal da API Cadista.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Permite executar tanto `uvicorn backend.main:app` na raiz do projeto quanto
# `uvicorn main:app` dentro de `backend/` sem quebrar a resolução do pacote.
if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from backend.models import Base
    from backend.routes import auth, case, case_item, dashboard, doctor
else:
    from backend.models import Base
    from .routes import auth, case, case_item, dashboard, doctor

# Manter a metadata em uma constante de modulo garante que `backend.models.__init__`
# seja executado durante o bootstrap da API, registrando todos os mappers antes
# de qualquer chamada futura a `Base.metadata.create_all(...)`.
ORM_METADATA = Base.metadata

app = FastAPI(
    title="API Cadista",
    description="API para gestão operacional de laboratórios odontológicos e cadistas independentes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(doctor.router)
app.include_router(case.router)
app.include_router(case_item.router)
app.include_router(dashboard.router)
app.include_router(auth.router)


@app.get("/")
def read_root():
    return {"message": "API Cadista operante!"}
