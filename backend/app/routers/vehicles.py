"""
Vehicle router — thin handlers delegating to vehicle_service.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.vehicle import PaginatedVehicles, VehicleCreate, VehicleOut, VehicleUpdate
from app.services import vehicle_service

router = APIRouter()


@router.get("", response_model=PaginatedVehicles)
async def list_vehicles(
    status: Optional[str] = Query(default=None),
    vehicle_type: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await vehicle_service.get_vehicles(db, status, vehicle_type, region, page, limit)


@router.post("", response_model=VehicleOut, status_code=201)
async def create_vehicle(
    data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.FLEET_MANAGER, UserRole.ADMIN)),
):
    return await vehicle_service.create_vehicle(db, data, current_user.id)


@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await vehicle_service.get_vehicle_by_id(db, vehicle_id)


@router.put("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.FLEET_MANAGER, UserRole.ADMIN)),
):
    return await vehicle_service.update_vehicle(db, vehicle_id, data, current_user.id)


@router.post("/{vehicle_id}/retire", response_model=VehicleOut)
async def retire_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.FLEET_MANAGER, UserRole.ADMIN)),
):
    return await vehicle_service.retire_vehicle(db, vehicle_id, current_user.id)
