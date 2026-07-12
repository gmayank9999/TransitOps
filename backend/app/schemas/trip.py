"""
Trip schemas.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.trip import TripStatus


class TripCreate(BaseModel):
    source: str = Field(min_length=1, max_length=150)
    destination: str = Field(min_length=1, max_length=150)
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    cargo_weight_kg: Decimal = Field(gt=0)
    planned_distance_km: Decimal = Field(gt=0)

    model_config = {"str_strip_whitespace": True}

    @field_validator("destination")
    @classmethod
    def destination_not_same_as_source(cls, v: str, info) -> str:
        source = info.data.get("source", "")
        if v.strip().lower() == source.strip().lower():
            raise ValueError("Source and destination cannot be the same")
        return v


class TripUpdate(BaseModel):
    """Allowed on DRAFT trips only — update assignment."""
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    source: Optional[str] = Field(default=None, min_length=1, max_length=150)
    destination: Optional[str] = Field(default=None, min_length=1, max_length=150)
    cargo_weight_kg: Optional[Decimal] = Field(default=None, gt=0)
    planned_distance_km: Optional[Decimal] = Field(default=None, gt=0)

    model_config = {"str_strip_whitespace": True}


class TripCompleteRequest(BaseModel):
    actual_distance_km: Decimal = Field(gt=0)
    final_odometer_km: Decimal = Field(gt=0)
    fuel_liters: Optional[Decimal] = Field(default=None, gt=0)
    fuel_cost: Optional[Decimal] = Field(default=None, ge=0)
    revenue: Optional[Decimal] = Field(default=None, ge=0)


class TripCancelRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=255)


class TripOut(BaseModel):
    id: int
    source: str
    destination: str
    vehicle_id: Optional[int]
    driver_id: Optional[int]
    cargo_weight_kg: Decimal
    planned_distance_km: Decimal
    actual_distance_km: Optional[Decimal]
    revenue: Optional[Decimal]
    status: TripStatus
    cancellation_reason: Optional[str]
    dispatched_at: Optional[datetime]
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_by: int
    created_at: datetime
    # Derived label for Draft trips
    assignment_label: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedTrips(BaseModel):
    items: list[TripOut]
    total: int
    page: int
    limit: int
