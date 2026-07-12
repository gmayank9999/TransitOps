"""
Vehicle service — all business logic for vehicle CRUD and status transitions.
"""

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


async def _write_audit(
    db: AsyncSession,
    table: str,
    record_id: int,
    action: str,
    performed_by: int,
    old_data: dict | None = None,
    new_data: dict | None = None,
) -> None:
    log = AuditLog(
        table_name=table,
        record_id=record_id,
        action=action,
        old_data=old_data,
        new_data=new_data,
        performed_by=performed_by,
    )
    db.add(log)


async def get_vehicles(
    db: AsyncSession,
    status_filter: str | None = None,
    vehicle_type: str | None = None,
    region: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    q = select(Vehicle)
    if status_filter:
        q = q.where(Vehicle.status == status_filter)
    if vehicle_type:
        q = q.where(Vehicle.vehicle_type == vehicle_type)
    if region:
        q = q.where(Vehicle.region == region)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.offset((page - 1) * limit).limit(limit).order_by(Vehicle.id)
    items = (await db.execute(q)).scalars().all()
    return {"items": list(items), "total": total, "page": page, "limit": limit}


async def get_vehicle_by_id(db: AsyncSession, vehicle_id: int) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


async def create_vehicle(db: AsyncSession, data: VehicleCreate, created_by: int) -> Vehicle:
    vehicle = Vehicle(
        registration_number=data.registration_number,
        name_model=data.name_model,
        vehicle_type=data.vehicle_type,
        max_load_capacity_kg=data.max_load_capacity_kg,
        odometer_km=data.odometer_km,
        acquisition_cost=data.acquisition_cost,
        region=data.region,
    )
    db.add(vehicle)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Registration number '{data.registration_number}' is already in use",
            headers={"X-Error-Code": "DUPLICATE_REGISTRATION"},
        )
    await _write_audit(
        db, "vehicles", vehicle.id, "CREATE", created_by,
        new_data={"registration_number": vehicle.registration_number, "status": vehicle.status.value},
    )
    await db.refresh(vehicle)
    return vehicle


async def update_vehicle(
    db: AsyncSession, vehicle_id: int, data: VehicleUpdate, updated_by: int
) -> Vehicle:
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    old_data = {"status": vehicle.status.value, "name_model": vehicle.name_model}

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(vehicle, field, value)

    await _write_audit(db, "vehicles", vehicle_id, "UPDATE", updated_by, old_data=old_data)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


async def retire_vehicle(db: AsyncSession, vehicle_id: int, retired_by: int) -> Vehicle:
    vehicle = await get_vehicle_by_id(db, vehicle_id)

    if vehicle.status == VehicleStatus.RETIRED:
        raise HTTPException(status_code=409, detail="Vehicle is already retired")

    # Block if there is an active dispatched trip
    active_trip = await db.execute(
        select(Trip).where(
            Trip.vehicle_id == vehicle_id, Trip.status == TripStatus.DISPATCHED
        )
    )
    if active_trip.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Cannot retire a vehicle that is currently on an active trip",
            headers={"X-Error-Code": "VEHICLE_ON_TRIP"},
        )

    old_status = vehicle.status.value
    vehicle.status = VehicleStatus.RETIRED
    await _write_audit(
        db, "vehicles", vehicle_id, "STATUS_CHANGE", retired_by,
        old_data={"status": old_status},
        new_data={"status": "RETIRED"},
    )
    await db.flush()
    await db.refresh(vehicle)
    return vehicle
