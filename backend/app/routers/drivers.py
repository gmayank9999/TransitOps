"""
Driver router.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.driver import DriverCreate, DriverOut, DriverStatusToggle, DriverUpdate, PaginatedDrivers
from app.services import driver_service

router = APIRouter()

_SAFETY_ROLES = (UserRole.SAFETY_OFFICER, UserRole.FLEET_MANAGER, UserRole.ADMIN)
_SAFETY_ONLY = (UserRole.SAFETY_OFFICER, UserRole.FLEET_MANAGER, UserRole.ADMIN)


@router.get("", response_model=PaginatedDrivers)
async def list_drivers(
    status: Optional[str] = Query(default=None),
    license_category: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await driver_service.get_drivers(db, status, license_category, page, limit)


@router.post("", response_model=DriverOut, status_code=201)
async def create_driver(
    data: DriverCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_SAFETY_ROLES)),
):
    return await driver_service.create_driver(db, data, current_user.id)


@router.get("/{driver_id}", response_model=DriverOut)
async def get_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await driver_service.get_driver_by_id(db, driver_id)


@router.put("/{driver_id}", response_model=DriverOut)
async def update_driver(
    driver_id: int,
    data: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_SAFETY_ROLES)),
):
    return await driver_service.update_driver(db, driver_id, data, current_user.id)


@router.post("/{driver_id}/status", response_model=DriverOut)
async def toggle_status(
    driver_id: int,
    data: DriverStatusToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_SAFETY_ROLES)),
):
    return await driver_service.toggle_driver_status(db, driver_id, data, current_user.id)


@router.post("/{driver_id}/suspend", response_model=DriverOut)
async def suspend_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_SAFETY_ONLY)),
):
    return await driver_service.suspend_driver(db, driver_id, current_user.id)


@router.post("/{driver_id}/reinstate", response_model=DriverOut)
async def reinstate_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_SAFETY_ONLY)),
):
    return await driver_service.reinstate_driver(db, driver_id, current_user.id)
