"""
Trip router.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.trip import (
    PaginatedTrips,
    TripCancelRequest,
    TripCompleteRequest,
    TripCreate,
    TripOut,
    TripUpdate,
)
from app.services import trip_service

router = APIRouter()

_DISPATCH_ROLES = (UserRole.DISPATCHER, UserRole.FLEET_MANAGER, UserRole.ADMIN)


@router.get("", response_model=PaginatedTrips)
async def list_trips(
    status: Optional[str] = Query(default=None),
    vehicle_id: Optional[int] = Query(default=None),
    driver_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await trip_service.get_trips(db, status, vehicle_id, driver_id, page, limit)


@router.post("", response_model=TripOut, status_code=201)
async def create_trip(
    data: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_DISPATCH_ROLES)),
):
    return await trip_service.create_trip(db, data, current_user.id)


@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(
    trip_id: int,
    data: TripUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_DISPATCH_ROLES)),
):
    return await trip_service.update_trip(db, trip_id, data, current_user.id)


@router.post("/{trip_id}/dispatch", response_model=TripOut)
async def dispatch_trip(
    trip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_DISPATCH_ROLES)),
):
    return await trip_service.dispatch_trip(db, trip_id, current_user.id)


@router.post("/{trip_id}/complete", response_model=TripOut)
async def complete_trip(
    trip_id: int,
    data: TripCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_DISPATCH_ROLES)),
):
    return await trip_service.complete_trip(db, trip_id, data, current_user.id)


@router.post("/{trip_id}/cancel", response_model=TripOut)
async def cancel_trip(
    trip_id: int,
    data: TripCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_DISPATCH_ROLES)),
):
    return await trip_service.cancel_trip(db, trip_id, data, current_user.id)
