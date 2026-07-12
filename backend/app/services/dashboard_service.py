"""
Dashboard service — KPI aggregations and activity timeline.
"""

from sqlalchemy import case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.driver import Driver, DriverStatus
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus


async def get_kpis(
    db: AsyncSession,
    region: str | None = None,
    vehicle_type: str | None = None,
) -> dict:
    # Vehicle counts
    v_q = select(
        func.count(Vehicle.id).label("total"),
        func.sum(case((Vehicle.status == VehicleStatus.AVAILABLE, 1), else_=0)).label("available"),
        func.sum(case((Vehicle.status == VehicleStatus.ON_TRIP, 1), else_=0)).label("on_trip"),
        func.sum(case((Vehicle.status == VehicleStatus.IN_SHOP, 1), else_=0)).label("in_shop"),
        func.sum(case((Vehicle.status == VehicleStatus.RETIRED, 1), else_=0)).label("retired"),
    )
    if region:
        v_q = v_q.where(Vehicle.region == region)
    if vehicle_type:
        v_q = v_q.where(Vehicle.vehicle_type == vehicle_type)
    v_row = (await db.execute(v_q)).one()

    # Trip counts
    t_q = select(
        func.sum(case((Trip.status == TripStatus.DISPATCHED, 1), else_=0)).label("active"),
        func.sum(case((Trip.status == TripStatus.DRAFT, 1), else_=0)).label("pending"),
        func.sum(case((Trip.status == TripStatus.COMPLETED, 1), else_=0)).label("completed"),
    )
    t_row = (await db.execute(t_q)).one()

    # Drivers on duty (AVAILABLE + ON_TRIP)
    d_q = select(
        func.sum(case((Driver.status == DriverStatus.ON_TRIP, 1), else_=0)).label("on_trip"),
        func.sum(case((Driver.status == DriverStatus.AVAILABLE, 1), else_=0)).label("available"),
        func.count(Driver.id).label("total"),
    )
    d_row = (await db.execute(d_q)).one()

    total_vehicles = v_row.total or 0
    on_trip = v_row.on_trip or 0
    available = v_row.available or 0

    fleet_utilization_pct = (
        round((on_trip / total_vehicles) * 100, 1) if total_vehicles > 0 else 0.0
    )

    return {
        "vehicles": {
            "total": total_vehicles,
            "available": available,
            "on_trip": on_trip,
            "in_shop": v_row.in_shop or 0,
            "retired": v_row.retired or 0,
        },
        "trips": {
            "active": t_row.active or 0,
            "pending": t_row.pending or 0,
            "completed": t_row.completed or 0,
        },
        "drivers": {
            "total": d_row.total or 0,
            "on_trip": d_row.on_trip or 0,
            "available": d_row.available or 0,
        },
        "fleet_utilization_pct": fleet_utilization_pct,
    }


async def get_activity_timeline(db: AsyncSession, limit: int = 20) -> list[dict]:
    """
    Read the most recent audit_log rows and format them as a human-readable
    activity feed for the dashboard Activity Timeline widget.
    """
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.performed_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()

    def _format(log: AuditLog) -> dict:
        table = log.table_name
        action = log.action
        new_data = log.new_data or {}
        old_data = log.old_data or {}

        if table == "trips":
            status = new_data.get("status", "")
            src = new_data.get("source", "")
            dst = new_data.get("destination", "")
            if action == "CREATE":
                msg = f"Trip #{log.record_id} created ({src} to {dst})"
                icon = "plus-circle"
            elif status == "DISPATCHED":
                msg = f"Trip #{log.record_id} dispatched"
                icon = "send"
            elif status == "COMPLETED":
                msg = f"Trip #{log.record_id} completed"
                icon = "check-circle"
            elif status == "CANCELLED":
                reason = new_data.get("reason") or ""
                msg = f"Trip #{log.record_id} cancelled" + (f" — {reason}" if reason else "")
                icon = "x-circle"
            else:
                msg = f"Trip #{log.record_id} updated"
                icon = "edit"

        elif table == "vehicles":
            if action == "CREATE":
                reg = new_data.get("registration_number", f"#{log.record_id}")
                msg = f"Vehicle {reg} added to fleet"
                icon = "truck"
            elif action == "STATUS_CHANGE":
                new_status = new_data.get("status", "")
                msg = f"Vehicle #{log.record_id} status changed to {new_status}"
                icon = "activity"
            else:
                msg = f"Vehicle #{log.record_id} updated"
                icon = "edit"

        elif table == "drivers":
            if action == "CREATE":
                name = new_data.get("full_name", f"#{log.record_id}")
                msg = f"Driver {name} added"
                icon = "user-plus"
            elif action == "STATUS_CHANGE":
                new_status = new_data.get("status", "")
                msg = f"Driver #{log.record_id} {new_status.lower()}"
                icon = "user-check"
            else:
                msg = f"Driver #{log.record_id} updated"
                icon = "edit"

        elif table == "maintenance_logs":
            if action == "CREATE":
                desc = new_data.get("description", "")
                msg = f"Maintenance opened for vehicle #{new_data.get('vehicle_id', log.record_id)}: {desc}"
                icon = "tool"
            elif action == "STATUS_CHANGE":
                msg = f"Maintenance #{log.record_id} closed"
                icon = "check-square"
            else:
                msg = f"Maintenance #{log.record_id} updated"
                icon = "edit"

        elif table == "fuel_logs":
            msg = f"Fuel log added for vehicle #{new_data.get('vehicle_id', log.record_id)}"
            icon = "droplet"

        elif table == "expenses":
            cat = new_data.get("category", "expense")
            msg = f"{cat.title()} expense logged for vehicle #{new_data.get('vehicle_id', log.record_id)}"
            icon = "dollar-sign"

        else:
            msg = f"{table} #{log.record_id} {action.lower()}"
            icon = "info"

        return {
            "id": log.id,
            "message": msg,
            "icon": icon,
            "performed_by": log.performed_by,
            "performed_at": log.performed_at.isoformat() if log.performed_at else None,
            "table": table,
            "action": action,
        }

    return [_format(log) for log in logs]
