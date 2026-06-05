from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="Textile ERP",
    description="ERP system for textile industry",
    version="1.0"
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allow_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
from app.api import auth
from app.api import admin
from app.api import kpis
from app.api import finance
from app.api import production
from app.api import inventory
from app.api import master_product
from app.api import master_quality
from app.api import master_machine
from app.api import master_party
from app.routers import purchase_masters
from app.routers import purchase_order
from app.routers import purchase_grn
from app.routers import purchase_invoice
from app.api import crm
from app.api import sales

# ── Register ──────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(kpis.router)
app.include_router(finance.router)
app.include_router(production.router)
app.include_router(inventory.router)
app.include_router(master_product.router)
app.include_router(master_quality.router)
app.include_router(master_machine.router)
app.include_router(master_party.router)
app.include_router(purchase_masters.router)
app.include_router(purchase_order.router)
app.include_router(purchase_grn.router)
app.include_router(purchase_invoice.router)
app.include_router(crm.router)
app.include_router(sales.router)

@app.get("/")
def root():
    return {"status": "Textile ERP backend running ✓"}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
