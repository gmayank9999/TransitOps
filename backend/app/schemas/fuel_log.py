"""
Fuel log schemas.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class FuelLogCreate(BaseModel):
    vehicle_id: int
    trip_id: Optional[int] = None
    liters: Decimal = Field(gt=0)
    cost: Decimal = Field(ge=0)
    log_date: Optional[date] = None

    model_config = {"str_strip_whitespace": True}


class FuelLogOut(BaseModel):
    id: int
    vehicle_id: int
    trip_id: Optional[int]
    liters: Decimal
    cost: Decimal
    log_date: date
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedFuelLogs(BaseModel):
    items: list[FuelLogOut]
    total: int
    page: int
    limit: int
