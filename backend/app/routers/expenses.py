"""
Expense router.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.expense import ExpenseCreate, ExpenseOut, PaginatedExpenses
from app.services import expense_service

router = APIRouter()

_FM_FA_ADMIN = (UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST, UserRole.ADMIN)


@router.get("", response_model=PaginatedExpenses)
async def list_expenses(
    vehicle_id: Optional[int] = Query(default=None),
    category: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(*_FM_FA_ADMIN)),
):
    return await expense_service.get_expenses(db, vehicle_id, category, page, limit)


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*_FM_FA_ADMIN)),
):
    return await expense_service.create_expense(db, data, current_user.id)
