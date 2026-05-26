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
    from backend.routes import auth, case, case_item, dashboard, doctor
else:
    from .routes import auth, case, case_item, dashboard, doctor

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
