"""
Reports router — analytics endpoints + CSV export.
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services import reports_service

router = APIRouter()

_FA_FM_ADMIN = (UserRole.FINANCIAL_ANALYST, UserRole.FLEET_MANAGER, UserRole.ADMIN)


@router.get("/fuel-efficiency")
async def fuel_efficiency(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FA_FM_ADMIN)),
):
    return await reports_service.get_fuel_efficiency(db)


@router.get("/operational-cost")
async def operational_cost(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FA_FM_ADMIN)),
):
    return await reports_service.get_operational_cost(db)


@router.get("/roi")
async def roi_report(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.FINANCIAL_ANALYST, UserRole.ADMIN)),
):
    return await reports_service.get_roi(db)


@router.get("/monthly-revenue")
async def monthly_revenue(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FA_FM_ADMIN)),
):
    return await reports_service.get_monthly_revenue(db)


@router.get("/top-costliest-vehicles")
async def top_costliest_vehicles(
    top_n: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FA_FM_ADMIN)),
):
    return await reports_service.get_top_costliest_vehicles(db, top_n)


@router.get("/export.csv")
async def export_csv(
    report: str = Query(
        description="One of: fuel-efficiency, operational-cost, roi, monthly-revenue, top-costliest-vehicles"
    ),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FA_FM_ADMIN)),
):
    csv_content = await reports_service.export_csv(db, report)
    filename = f"transitops_{report}.csv"
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
