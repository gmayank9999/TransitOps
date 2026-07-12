"""
Maintenance router.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.maintenance import MaintenanceCreate, MaintenanceOut, PaginatedMaintenance
from app.services import maintenance_service

router = APIRouter()

_FM_ADMIN = (UserRole.FLEET_MANAGER, UserRole.ADMIN)


@router.get("", response_model=PaginatedMaintenance)
async def list_maintenance(
    vehicle_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST, UserRole.ADMIN)),
):
    return await maintenance_service.get_maintenance(db, vehicle_id, status, page, limit)


@router.post("", response_model=MaintenanceOut, status_code=201)
async def create_maintenance(
    data: MaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_FM_ADMIN)),
):
    return await maintenance_service.create_maintenance(db, data, current_user.id)


@router.post("/{log_id}/close", response_model=MaintenanceOut)
async def close_maintenance(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_FM_ADMIN)),
):
    return await maintenance_service.close_maintenance(db, log_id, current_user.id)
