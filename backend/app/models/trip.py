"""
Trip model.
"""

import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TripStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("cargo_weight_kg > 0", name="chk_cargo_positive"),
        CheckConstraint("planned_distance_km > 0", name="chk_planned_distance_positive"),
        # Dispatch requires both vehicle and driver to be assigned
        CheckConstraint(
            "status = 'DRAFT' OR (vehicle_id IS NOT NULL AND driver_id IS NOT NULL)",
            name="chk_dispatch_requires_assignment",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(150), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)

    # Nullable — Draft trips can be created before vehicle/driver is picked
    vehicle_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("vehicles.id"), nullable=True, index=True
    )
    driver_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("drivers.id"), nullable=True, index=True
    )

    cargo_weight_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    planned_distance_km: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    actual_distance_km: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    revenue: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, name="trip_status"),
        nullable=False,
        default=TripStatus.DRAFT,
        index=True,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
