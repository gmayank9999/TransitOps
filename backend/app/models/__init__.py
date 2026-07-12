"""
Models package — import all models here so Alembic autogenerate sees them.
"""

from app.db.base import Base  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.driver import Driver  # noqa: F401
from app.models.expense import Expense  # noqa: F401
from app.models.fuel_log import FuelLog  # noqa: F401
from app.models.maintenance import MaintenanceLog  # noqa: F401
from app.models.trip import Trip  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.vehicle import Vehicle  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Vehicle",
    "Driver",
    "Trip",
    "MaintenanceLog",
    "FuelLog",
    "Expense",
    "AuditLog",
]
