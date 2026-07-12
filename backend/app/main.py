"""
TransitOps Backend
==================
Main FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, vehicles, drivers, trips, maintenance, fuel, expenses, dashboard, reports

app = FastAPI(
    title="TransitOps API",
    description="Smart Transport Operations Platform — REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — explicit origins only, never wildcard in any environment
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,        prefix="/api/v1/auth",         tags=["Auth"])
app.include_router(vehicles.router,    prefix="/api/v1/vehicles",     tags=["Vehicles"])
app.include_router(drivers.router,     prefix="/api/v1/drivers",      tags=["Drivers"])
app.include_router(trips.router,       prefix="/api/v1/trips",        tags=["Trips"])
app.include_router(maintenance.router, prefix="/api/v1/maintenance",  tags=["Maintenance"])
app.include_router(fuel.router,        prefix="/api/v1/fuel-logs",    tags=["Fuel"])
app.include_router(expenses.router,    prefix="/api/v1/expenses",     tags=["Expenses"])
app.include_router(dashboard.router,   prefix="/api/v1/dashboard",    tags=["Dashboard"])
app.include_router(reports.router,     prefix="/api/v1/reports",      tags=["Reports"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "TransitOps API"}
