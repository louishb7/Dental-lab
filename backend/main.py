"""
Ponto de entrada principal da API Cadista.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import auth, case, case_item, dashboard, doctor

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
