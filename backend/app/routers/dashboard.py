"""
Dashboard router.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import dashboard_service

router = APIRouter()


@router.get("/kpis")
async def get_kpis(
    region: Optional[str] = Query(default=None),
    vehicle_type: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await dashboard_service.get_kpis(db, region, vehicle_type)


@router.get("/activity")
async def get_activity_timeline(
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await dashboard_service.get_activity_timeline(db, limit)
