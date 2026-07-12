"""
Fuel log router.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.fuel_log import FuelLogCreate, FuelLogOut, PaginatedFuelLogs
from app.services import fuel_service

router = APIRouter()

_FM_FA_ADMIN = (UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST, UserRole.ADMIN)


@router.get("", response_model=PaginatedFuelLogs)
async def list_fuel_logs(
    vehicle_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FM_FA_ADMIN)),
):
    return await fuel_service.get_fuel_logs(db, vehicle_id, page, limit)


@router.post("", response_model=FuelLogOut, status_code=201)
async def create_fuel_log(
    data: FuelLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_FM_FA_ADMIN)),
):
    return await fuel_service.create_fuel_log(db, data, current_user.id)
