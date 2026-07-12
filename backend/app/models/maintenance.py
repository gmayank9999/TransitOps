"""
MaintenanceLog model.
"""

import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MaintenanceStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    __table_args__ = (
        CheckConstraint("cost >= 0", name="chk_maintenance_cost_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus, name="maintenance_status"),
        nullable=False,
        default=MaintenanceStatus.OPEN,
    )
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
