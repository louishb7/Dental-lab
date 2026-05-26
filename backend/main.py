"""
Ponto de entrada principal da API Cadista.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from backend.core import settings
from backend.middleware.security import SecurityHeadersMiddleware

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
    docs_url=None if settings.APP_ENV == "production" else "/docs",
    redoc_url=None if settings.APP_ENV == "production" else "/redoc",
    openapi_url=None if settings.APP_ENV == "production" else "/openapi.json",
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin"],
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(doctor.router)
app.include_router(case.router)
app.include_router(case_item.router)
app.include_router(dashboard.router)
app.include_router(auth.router)


@app.get("/")
def read_root():
    return {"message": "API Cadista operante!"}
