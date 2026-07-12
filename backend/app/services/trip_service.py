"""
Trip service — full business rule engine for trip lifecycle.

State machine:
    DRAFT --dispatch--> DISPATCHED --complete--> COMPLETED
    DRAFT --cancel--> CANCELLED
    DISPATCHED --cancel--> CANCELLED  (restores vehicle + driver to AVAILABLE)
"""

from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.driver import Driver, DriverStatus
from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.trip import TripCancelRequest, TripCompleteRequest, TripCreate, TripUpdate


async def _write_audit(
    db: AsyncSession,
    table: str,
    record_id: int,
    action: str,
    performed_by: int,
    old_data: dict | None = None,
    new_data: dict | None = None,
) -> None:
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


def _assignment_label(trip: Trip) -> str | None:
    """Derive a friendly label for draft trips with incomplete assignment."""
    if trip.status != TripStatus.DRAFT:
        return None
    if trip.vehicle_id is None and trip.driver_id is None:
        return "Awaiting vehicle and driver"
    if trip.vehicle_id is None:
        return "Awaiting vehicle"
    if trip.driver_id is None:
        return "Awaiting driver"
    return None


async def _get_trip_or_404(db: AsyncSession, trip_id: int) -> Trip:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


async def _get_vehicle_or_404(db: AsyncSession, vehicle_id: int) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    v = result.scalar_one_or_none()
    if v is None:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return v


async def _get_driver_or_404(db: AsyncSession, driver_id: int) -> Driver:
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    d = result.scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail=f"Driver {driver_id} not found")
    return d


async def get_trips(
    db: AsyncSession,
    status_filter: str | None = None,
    vehicle_id: int | None = None,
    driver_id: int | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    q = select(Trip)
    if status_filter:
        q = q.where(Trip.status == status_filter)
    if vehicle_id:
        q = q.where(Trip.vehicle_id == vehicle_id)
    if driver_id:
        q = q.where(Trip.driver_id == driver_id)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.offset((page - 1) * limit).limit(limit).order_by(Trip.created_at.desc())
    trips = (await db.execute(q)).scalars().all()

    items = []
    for trip in trips:
        d = trip.__dict__.copy()
        d["assignment_label"] = _assignment_label(trip)
        items.append(d)

    return {"items": items, "total": total, "page": page, "limit": limit}


async def create_trip(db: AsyncSession, data: TripCreate, created_by: int) -> Trip:
    # Validate vehicle if provided
    if data.vehicle_id is not None:
        vehicle = await _get_vehicle_or_404(db, data.vehicle_id)
        if vehicle.status in (VehicleStatus.RETIRED, VehicleStatus.IN_SHOP):
            raise HTTPException(
                status_code=409,
                detail=f"Vehicle is {vehicle.status.value} and cannot be assigned to a trip",
                headers={"X-Error-Code": f"VEHICLE_{vehicle.status.value}"},
            )
        # Cargo weight check
        if data.cargo_weight_kg > vehicle.max_load_capacity_kg:
            overage = data.cargo_weight_kg - vehicle.max_load_capacity_kg
            raise HTTPException(
                status_code=400,
                detail=f"Capacity exceeded by {overage:.2f} kg — dispatch blocked",
                headers={"X-Error-Code": "CARGO_OVERWEIGHT"},
            )

    # Validate driver if provided
    if data.driver_id is not None:
        driver = await _get_driver_or_404(db, data.driver_id)
        if driver.status in (DriverStatus.SUSPENDED, DriverStatus.OFF_DUTY):
            raise HTTPException(
                status_code=409,
                detail=f"Driver is {driver.status.value} and cannot be assigned",
                headers={"X-Error-Code": f"DRIVER_{driver.status.value}"},
            )
        if driver.license_expiry_date < date.today():
            raise HTTPException(
                status_code=409,
                detail="Driver's license has expired",
                headers={"X-Error-Code": "DRIVER_LICENSE_EXPIRED"},
            )

    trip = Trip(
        source=data.source,
        destination=data.destination,
        vehicle_id=data.vehicle_id,
        driver_id=data.driver_id,
        cargo_weight_kg=data.cargo_weight_kg,
        planned_distance_km=data.planned_distance_km,
        created_by=created_by,
    )
    db.add(trip)
    await db.flush()
    await _write_audit(
        db, "trips", trip.id, "CREATE", created_by,
        new_data={"source": trip.source, "destination": trip.destination, "status": "DRAFT"},
    )
    await db.refresh(trip)
    return trip


async def update_trip(
    db: AsyncSession, trip_id: int, data: TripUpdate, updated_by: int
) -> Trip:
    trip = await _get_trip_or_404(db, trip_id)
    if trip.status != TripStatus.DRAFT:
        raise HTTPException(
            status_code=409, detail="Only DRAFT trips can be edited"
        )

    # Re-validate vehicle if changing
    new_vehicle_id = data.vehicle_id if data.vehicle_id is not None else trip.vehicle_id
    new_driver_id = data.driver_id if data.driver_id is not None else trip.driver_id
    cargo = data.cargo_weight_kg if data.cargo_weight_kg is not None else trip.cargo_weight_kg

    if new_vehicle_id is not None:
        vehicle = await _get_vehicle_or_404(db, new_vehicle_id)
        if vehicle.status in (VehicleStatus.RETIRED, VehicleStatus.IN_SHOP):
            raise HTTPException(
                status_code=409,
                detail=f"Vehicle is {vehicle.status.value}",
                headers={"X-Error-Code": f"VEHICLE_{vehicle.status.value}"},
            )
        if cargo > vehicle.max_load_capacity_kg:
            overage = cargo - vehicle.max_load_capacity_kg
            raise HTTPException(
                status_code=400,
                detail=f"Capacity exceeded by {overage:.2f} kg — dispatch blocked",
                headers={"X-Error-Code": "CARGO_OVERWEIGHT"},
            )

    if new_driver_id is not None:
        driver = await _get_driver_or_404(db, new_driver_id)
        if driver.status in (DriverStatus.SUSPENDED, DriverStatus.OFF_DUTY):
            raise HTTPException(status_code=409, detail=f"Driver is {driver.status.value}")
        if driver.license_expiry_date < date.today():
            raise HTTPException(status_code=409, detail="Driver's license has expired")

    old_data = {"vehicle_id": trip.vehicle_id, "driver_id": trip.driver_id}
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trip, field, value)

    await _write_audit(db, "trips", trip_id, "UPDATE", updated_by, old_data=old_data)
    await db.flush()
    await db.refresh(trip)
    return trip


async def dispatch_trip(db: AsyncSession, trip_id: int, dispatched_by: int) -> Trip:
    """
    Dispatch a DRAFT trip atomically:
    1. Validate all business rules (vehicle available, driver valid, cargo weight, no double-booking)
    2. Set trip status = DISPATCHED
    3. Set vehicle status = ON_TRIP
    4. Set driver status = ON_TRIP
    5. Write audit log
    All in one transaction (auto-committed by get_db on success).
    """
    trip = await _get_trip_or_404(db, trip_id)

    if trip.status != TripStatus.DRAFT:
        raise HTTPException(
            status_code=409,
            detail=f"Trip is already {trip.status.value} — cannot dispatch again",
            headers={"X-Error-Code": "TRIP_ALREADY_DISPATCHED"},
        )

    if trip.vehicle_id is None or trip.driver_id is None:
        raise HTTPException(
            status_code=400,
            detail="Assign both a vehicle and a driver before dispatching",
            headers={"X-Error-Code": "MISSING_ASSIGNMENT"},
        )

    # --- Vehicle checks ---
    vehicle = await _get_vehicle_or_404(db, trip.vehicle_id)
    if vehicle.status == VehicleStatus.RETIRED:
        raise HTTPException(status_code=409, detail="Vehicle is retired", headers={"X-Error-Code": "VEHICLE_RETIRED"})
    if vehicle.status == VehicleStatus.IN_SHOP:
        raise HTTPException(status_code=409, detail="Vehicle is in the shop", headers={"X-Error-Code": "VEHICLE_IN_SHOP"})
    if vehicle.status == VehicleStatus.ON_TRIP:
        raise HTTPException(status_code=409, detail="Vehicle is already on another trip", headers={"X-Error-Code": "VEHICLE_ON_TRIP"})

    # Cargo weight check (re-validated here — never trust that the draft values haven't changed)
    if trip.cargo_weight_kg > vehicle.max_load_capacity_kg:
        overage = trip.cargo_weight_kg - vehicle.max_load_capacity_kg
        raise HTTPException(
            status_code=400,
            detail=f"Capacity exceeded by {overage:.2f} kg — dispatch blocked",
            headers={"X-Error-Code": "CARGO_OVERWEIGHT"},
        )

    # --- Driver checks ---
    driver = await _get_driver_or_404(db, trip.driver_id)
    if driver.status == DriverStatus.SUSPENDED:
        raise HTTPException(status_code=409, detail="Driver is suspended", headers={"X-Error-Code": "DRIVER_SUSPENDED"})
    if driver.status == DriverStatus.OFF_DUTY:
        raise HTTPException(status_code=409, detail="Driver is off duty", headers={"X-Error-Code": "DRIVER_OFF_DUTY"})
    if driver.status == DriverStatus.ON_TRIP:
        raise HTTPException(status_code=409, detail="Driver is already on another trip", headers={"X-Error-Code": "DRIVER_ON_TRIP"})
    if driver.license_expiry_date < date.today():
        raise HTTPException(status_code=409, detail="Driver's license has expired", headers={"X-Error-Code": "DRIVER_LICENSE_EXPIRED"})

    # --- Atomic status transitions ---
    now = datetime.now(timezone.utc)
    trip.status = TripStatus.DISPATCHED
    trip.dispatched_at = now
    vehicle.status = VehicleStatus.ON_TRIP
    driver.status = DriverStatus.ON_TRIP

    await _write_audit(
        db, "trips", trip_id, "STATUS_CHANGE", dispatched_by,
        old_data={"status": "DRAFT"},
        new_data={"status": "DISPATCHED", "vehicle_id": trip.vehicle_id, "driver_id": trip.driver_id},
    )
    await db.flush()
    await db.refresh(trip)

    # Inject label (will be None since it's now DISPATCHED)
    trip.__dict__["assignment_label"] = None
    return trip


async def complete_trip(
    db: AsyncSession, trip_id: int, data: TripCompleteRequest, completed_by: int
) -> Trip:
    trip = await _get_trip_or_404(db, trip_id)

    if trip.status != TripStatus.DISPATCHED:
        raise HTTPException(
            status_code=409,
            detail=f"Only DISPATCHED trips can be completed (current status: {trip.status.value})",
        )

    # Update trip
    trip.status = TripStatus.COMPLETED
    trip.actual_distance_km = data.actual_distance_km
    trip.revenue = data.revenue
    trip.completed_at = datetime.now(timezone.utc)

    # Update vehicle odometer
    vehicle = await _get_vehicle_or_404(db, trip.vehicle_id)
    vehicle.odometer_km = data.final_odometer_km
    vehicle.status = VehicleStatus.AVAILABLE

    # Update driver
    driver = await _get_driver_or_404(db, trip.driver_id)
    driver.status = DriverStatus.AVAILABLE

    # Optional fuel log
    if data.fuel_liters is not None:
        fuel_log = FuelLog(
            vehicle_id=trip.vehicle_id,
            trip_id=trip_id,
            liters=data.fuel_liters,
            cost=data.fuel_cost or 0,
            created_by=completed_by,
        )
        db.add(fuel_log)

    await _write_audit(
        db, "trips", trip_id, "STATUS_CHANGE", completed_by,
        old_data={"status": "DISPATCHED"},
        new_data={"status": "COMPLETED", "actual_distance_km": str(data.actual_distance_km)},
    )
    await db.flush()
    await db.refresh(trip)
    return trip


async def cancel_trip(
    db: AsyncSession, trip_id: int, data: TripCancelRequest, cancelled_by: int
) -> Trip:
    trip = await _get_trip_or_404(db, trip_id)

    if trip.status in (TripStatus.COMPLETED, TripStatus.CANCELLED):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel a trip that is already {trip.status.value}",
        )

    was_dispatched = trip.status == TripStatus.DISPATCHED
    old_status = trip.status.value

    trip.status = TripStatus.CANCELLED
    trip.cancellation_reason = data.reason
    trip.cancelled_at = datetime.now(timezone.utc)

    # Restore vehicle + driver if trip was dispatched
    if was_dispatched:
        if trip.vehicle_id:
            vehicle = await _get_vehicle_or_404(db, trip.vehicle_id)
            vehicle.status = VehicleStatus.AVAILABLE
        if trip.driver_id:
            driver = await _get_driver_or_404(db, trip.driver_id)
            driver.status = DriverStatus.AVAILABLE

    await _write_audit(
        db, "trips", trip_id, "STATUS_CHANGE", cancelled_by,
        old_data={"status": old_status},
        new_data={"status": "CANCELLED", "reason": data.reason},
    )
    await db.flush()
    await db.refresh(trip)
    return trip
