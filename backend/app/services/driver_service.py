"""
Driver service — CRUD, suspend/reinstate, status toggle, computed trip completion %.
"""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.driver import Driver, DriverStatus
from app.models.trip import Trip, TripStatus
from app.schemas.driver import DriverCreate, DriverStatusToggle, DriverUpdate


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


async def _compute_completion_pct(db: AsyncSession, driver_id: int) -> float | None:
    """
    Trip completion % = COMPLETED / (COMPLETED + CANCELLED) * 100
    Excludes DRAFT-only trips (never dispatched).
    Returns None if no attempted trips exist.
    """
    result = await db.execute(
        select(
            func.count(case((Trip.status == TripStatus.COMPLETED, 1))).label("completed"),
            func.count(
                case(
                    (Trip.status.in_([TripStatus.COMPLETED, TripStatus.CANCELLED]), 1)
                )
            ).label("attempted"),
        ).where(Trip.driver_id == driver_id)
    )
    row = result.one()
    if row.attempted == 0:
        return None
    return round((row.completed / row.attempted) * 100, 1)


async def get_drivers(
    db: AsyncSession,
    status_filter: str | None = None,
    license_category: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    q = select(Driver)
    if status_filter:
        q = q.where(Driver.status == status_filter)
    if license_category:
        q = q.where(Driver.license_category == license_category)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.offset((page - 1) * limit).limit(limit).order_by(Driver.id)
    drivers = (await db.execute(q)).scalars().all()

    items = []
    for driver in drivers:
        pct = await _compute_completion_pct(db, driver.id)
        d = driver.__dict__.copy()
        d["trip_completion_pct"] = pct
        items.append(d)

    return {"items": items, "total": total, "page": page, "limit": limit}


async def get_driver_by_id(db: AsyncSession, driver_id: int) -> Driver:
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()
    if driver is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


async def create_driver(db: AsyncSession, data: DriverCreate, created_by: int) -> Driver:
    driver = Driver(
        full_name=data.full_name,
        license_number=data.license_number,
        license_category=data.license_category,
        license_expiry_date=data.license_expiry_date,
        contact_number=data.contact_number,
        safety_score=data.safety_score,
    )
    db.add(driver)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"License number '{data.license_number}' is already registered",
            headers={"X-Error-Code": "DUPLICATE_LICENSE"},
        )
    await _write_audit(
        db, "drivers", driver.id, "CREATE", created_by,
        new_data={"full_name": driver.full_name, "license_number": driver.license_number},
    )
    await db.refresh(driver)
    return driver


async def update_driver(
    db: AsyncSession, driver_id: int, data: DriverUpdate, updated_by: int
) -> Driver:
    driver = await get_driver_by_id(db, driver_id)
    old_data = {"full_name": driver.full_name, "status": driver.status.value}

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)

    await _write_audit(db, "drivers", driver_id, "UPDATE", updated_by, old_data=old_data)
    await db.flush()
    await db.refresh(driver)
    return driver


async def toggle_driver_status(
    db: AsyncSession, driver_id: int, data: DriverStatusToggle, toggled_by: int
) -> Driver:
    driver = await get_driver_by_id(db, driver_id)
    if driver.status == DriverStatus.ON_TRIP:
        raise HTTPException(
            status_code=409, detail="Cannot manually change status of a driver currently on a trip"
        )
    if driver.status == DriverStatus.SUSPENDED:
        raise HTTPException(
            status_code=409, detail="Use the reinstate endpoint to change a suspended driver's status"
        )
    old_status = driver.status.value
    driver.status = data.status
    await _write_audit(
        db, "drivers", driver_id, "STATUS_CHANGE", toggled_by,
        old_data={"status": old_status},
        new_data={"status": data.status.value},
    )
    await db.flush()
    await db.refresh(driver)
    return driver


async def suspend_driver(db: AsyncSession, driver_id: int, suspended_by: int) -> Driver:
    driver = await get_driver_by_id(db, driver_id)
    old_status = driver.status.value
    driver.status = DriverStatus.SUSPENDED
    await _write_audit(
        db, "drivers", driver_id, "STATUS_CHANGE", suspended_by,
        old_data={"status": old_status},
        new_data={"status": "SUSPENDED"},
    )
    await db.flush()
    await db.refresh(driver)
    return driver


async def reinstate_driver(db: AsyncSession, driver_id: int, reinstated_by: int) -> Driver:
    driver = await get_driver_by_id(db, driver_id)
    if driver.status != DriverStatus.SUSPENDED:
        raise HTTPException(status_code=409, detail="Driver is not currently suspended")
    driver.status = DriverStatus.AVAILABLE
    await _write_audit(
        db, "drivers", driver_id, "STATUS_CHANGE", reinstated_by,
        old_data={"status": "SUSPENDED"},
        new_data={"status": "AVAILABLE"},
    )
    await db.flush()
    await db.refresh(driver)
    return driver
