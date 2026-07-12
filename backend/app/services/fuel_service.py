"""
Fuel log service.
"""

from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.fuel_log import FuelLog
from app.models.vehicle import Vehicle
from app.schemas.fuel_log import FuelLogCreate


async def get_fuel_logs(
    db: AsyncSession,
    vehicle_id: int | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    q = select(FuelLog)
    if vehicle_id:
        q = q.where(FuelLog.vehicle_id == vehicle_id)
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()
    q = q.offset((page - 1) * limit).limit(limit).order_by(FuelLog.log_date.desc(), FuelLog.id.desc())
    items = (await db.execute(q)).scalars().all()
    return {"items": list(items), "total": total, "page": page, "limit": limit}


async def create_fuel_log(db: AsyncSession, data: FuelLogCreate, created_by: int) -> FuelLog:
    # Validate vehicle exists
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == data.vehicle_id))
    if v_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    log = FuelLog(
        vehicle_id=data.vehicle_id,
        trip_id=data.trip_id,
        liters=data.liters,
        cost=data.cost,
        log_date=data.log_date or date.today(),
        created_by=created_by,
    )
    db.add(log)
    await db.flush()
    db.add(
        AuditLog(
            table_name="fuel_logs",
            record_id=log.id,
            action="CREATE",
            new_data={"vehicle_id": data.vehicle_id, "liters": str(data.liters), "cost": str(data.cost)},
            performed_by=created_by,
        )
    )
    await db.refresh(log)
    return log
