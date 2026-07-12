"""
Vehicle model.
"""

import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    IN_SHOP = "IN_SHOP"
    RETIRED = "RETIRED"


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("max_load_capacity_kg > 0", name="chk_capacity_positive"),
        CheckConstraint("odometer_km >= 0", name="chk_odometer_non_negative"),
        CheckConstraint("acquisition_cost >= 0", name="chk_acquisition_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    registration_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name_model: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False)
    max_load_capacity_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    odometer_km: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    acquisition_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus, name="vehicle_status"),
        nullable=False,
        default=VehicleStatus.AVAILABLE,
    )
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
