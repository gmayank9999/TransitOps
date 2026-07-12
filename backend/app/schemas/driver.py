"""
Driver schemas.
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.driver import DriverStatus


class DriverCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    license_number: str = Field(min_length=1, max_length=50)
    license_category: str = Field(min_length=1, max_length=20)
    license_expiry_date: date
    contact_number: str = Field(min_length=7, max_length=20, pattern=r"^\d+$")
    safety_score: Decimal = Field(default=Decimal("100.0"), ge=0, le=100)

    model_config = {"str_strip_whitespace": True}

    @field_validator("license_number")
    @classmethod
    def license_uppercase(cls, v: str) -> str:
        return v.upper().strip()


class DriverUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    license_category: Optional[str] = Field(default=None, min_length=1, max_length=20)
    license_expiry_date: Optional[date] = None
    contact_number: Optional[str] = Field(default=None, min_length=7, max_length=20, pattern=r"^\d+$")
    safety_score: Optional[Decimal] = Field(default=None, ge=0, le=100)

    model_config = {"str_strip_whitespace": True}


class DriverStatusToggle(BaseModel):
    """Only AVAILABLE <-> OFF_DUTY manual toggle allowed."""
    status: DriverStatus

    @field_validator("status")
    @classmethod
    def only_manual_statuses(cls, v: DriverStatus) -> DriverStatus:
        if v not in (DriverStatus.AVAILABLE, DriverStatus.OFF_DUTY):
            raise ValueError("Manual toggle only allows AVAILABLE or OFF_DUTY")
        return v


class DriverOut(BaseModel):
    id: int
    full_name: str
    license_number: str
    license_category: str
    license_expiry_date: date
    contact_number: str
    safety_score: Decimal
    status: DriverStatus
    trip_completion_pct: Optional[float] = None  # computed field, injected by service

    model_config = {"from_attributes": True}


class PaginatedDrivers(BaseModel):
    items: list[DriverOut]
    total: int
    page: int
    limit: int
