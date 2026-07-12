"""
Maintenance service.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.maintenance import MaintenanceLog, MaintenanceStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.maintenance import MaintenanceCreate


async def _write_audit(db, table, record_id, action, performed_by, old_data=None, new_data=None):
    db.add(
        AuditLog(
            table_name=table,
            record_id=record_id,
            action=action,
            old_data=old_data,
            new_data=new_data,
            performed_by=performed_by,
        )
    )


async def get_maintenance(
    db: AsyncSession,
    vehicle_id: int | None = None,
    status_filter: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    q = select(MaintenanceLog)
    if vehicle_id:
        q = q.where(MaintenanceLog.vehicle_id == vehicle_id)
    if status_filter:
        q = q.where(MaintenanceLog.status == status_filter)
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()
    q = q.offset((page - 1) * limit).limit(limit).order_by(MaintenanceLog.opened_at.desc())
    items = (await db.execute(q)).scalars().all()
    return {"items": list(items), "total": total, "page": page, "limit": limit}


async def create_maintenance(
    db: AsyncSession, data: MaintenanceCreate, created_by: int
) -> MaintenanceLog:
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == data.vehicle_id))
    vehicle = v_result.scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if vehicle.status == VehicleStatus.ON_TRIP:
        raise HTTPException(
            status_code=409,
            detail="Cannot open maintenance on a vehicle currently on a trip",
            headers={"X-Error-Code": "VEHICLE_ON_TRIP"},
        )
    if vehicle.status == VehicleStatus.RETIRED:
        raise HTTPException(
            status_code=409,
            detail="Cannot open maintenance on a retired vehicle",
            headers={"X-Error-Code": "VEHICLE_RETIRED"},
        )

    # Block duplicate OPEN maintenance on same vehicle
    existing = await db.execute(
        select(MaintenanceLog).where(
            MaintenanceLog.vehicle_id == data.vehicle_id,
            MaintenanceLog.status == MaintenanceStatus.OPEN,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Vehicle already has an open maintenance record",
            headers={"X-Error-Code": "MAINTENANCE_ALREADY_OPEN"},
        )

    old_vehicle_status = vehicle.status.value
    vehicle.status = VehicleStatus.IN_SHOP

    log = MaintenanceLog(
        vehicle_id=data.vehicle_id,
        description=data.description,
        cost=data.cost,
        created_by=created_by,
    )
    db.add(log)
    await db.flush()

    await _write_audit(
        db, "maintenance_logs", log.id, "CREATE", created_by,
        new_data={"vehicle_id": data.vehicle_id, "description": data.description, "status": "OPEN"},
    )
    await _write_audit(
        db, "vehicles", vehicle.id, "STATUS_CHANGE", created_by,
        old_data={"status": old_vehicle_status},
        new_data={"status": "IN_SHOP"},
    )
    await db.refresh(log)
    return log


async def close_maintenance(db: AsyncSession, log_id: int, closed_by: int) -> MaintenanceLog:
    result = await db.execute(select(MaintenanceLog).where(MaintenanceLog.id == log_id))
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    if log.status == MaintenanceStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Maintenance record is already closed")

    log.status = MaintenanceStatus.CLOSED
    log.closed_at = datetime.now(timezone.utc)

    # Restore vehicle unless RETIRED
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == log.vehicle_id))
    vehicle = v_result.scalar_one_or_none()
    if vehicle and vehicle.status != VehicleStatus.RETIRED:
        vehicle.status = VehicleStatus.AVAILABLE
        await _write_audit(
            db, "vehicles", vehicle.id, "STATUS_CHANGE", closed_by,
            old_data={"status": "IN_SHOP"},
            new_data={"status": "AVAILABLE"},
        )

    await _write_audit(
        db, "maintenance_logs", log_id, "STATUS_CHANGE", closed_by,
        old_data={"status": "OPEN"},
        new_data={"status": "CLOSED"},
    )
    await db.flush()
    await db.refresh(log)
    return log
