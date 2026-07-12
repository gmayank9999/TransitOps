"""
Maintenance schemas.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.maintenance import MaintenanceStatus


class MaintenanceCreate(BaseModel):
    vehicle_id: int
    description: str = Field(min_length=1, max_length=255)
    cost: Decimal = Field(default=Decimal("0"), ge=0)

    model_config = {"str_strip_whitespace": True}


class MaintenanceOut(BaseModel):
    id: int
    vehicle_id: int
    description: str
    cost: Decimal
    status: MaintenanceStatus
    opened_at: datetime
    closed_at: Optional[datetime]
    created_by: int

    model_config = {"from_attributes": True}


class PaginatedMaintenance(BaseModel):
    items: list[MaintenanceOut]
    total: int
    page: int
    limit: int
