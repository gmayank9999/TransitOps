"""
Vehicle schemas.
"""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.vehicle import VehicleStatus


class VehicleCreate(BaseModel):
    registration_number: str = Field(min_length=1, max_length=20)
    name_model: str = Field(min_length=1, max_length=100)
    vehicle_type: str = Field(min_length=1, max_length=50)
    max_load_capacity_kg: Decimal = Field(gt=0, description="Must be > 0")
    odometer_km: Decimal = Field(ge=0, default=Decimal("0"))
    acquisition_cost: Decimal = Field(ge=0)
    region: Optional[str] = Field(default=None, max_length=100)

    model_config = {"str_strip_whitespace": True}

    @field_validator("registration_number")
    @classmethod
    def reg_number_uppercase(cls, v: str) -> str:
        return v.upper().strip()


class VehicleUpdate(BaseModel):
    name_model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    vehicle_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    max_load_capacity_kg: Optional[Decimal] = Field(default=None, gt=0)
    odometer_km: Optional[Decimal] = Field(default=None, ge=0)
    acquisition_cost: Optional[Decimal] = Field(default=None, ge=0)
    region: Optional[str] = Field(default=None, max_length=100)

    model_config = {"str_strip_whitespace": True}


class VehicleOut(BaseModel):
    id: int
    registration_number: str
    name_model: str
    vehicle_type: str
    max_load_capacity_kg: Decimal
    odometer_km: Decimal
    acquisition_cost: Decimal
    status: VehicleStatus
    region: Optional[str]

    model_config = {"from_attributes": True}


class PaginatedVehicles(BaseModel):
    items: list[VehicleOut]
    total: int
    page: int
    limit: int
