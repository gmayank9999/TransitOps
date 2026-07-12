"""
Expense service.
"""

from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.schemas.expense import ExpenseCreate


async def get_expenses(
    db: AsyncSession,
    vehicle_id: int | None = None,
    category: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    q = select(Expense)
    if vehicle_id:
        q = q.where(Expense.vehicle_id == vehicle_id)
    if category:
        q = q.where(Expense.category == category)
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()
    q = q.offset((page - 1) * limit).limit(limit).order_by(Expense.expense_date.desc(), Expense.id.desc())
    items = (await db.execute(q)).scalars().all()
    return {"items": list(items), "total": total, "page": page, "limit": limit}


async def create_expense(db: AsyncSession, data: ExpenseCreate, created_by: int) -> Expense:
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == data.vehicle_id))
    if v_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    expense = Expense(
        vehicle_id=data.vehicle_id,
        category=data.category,
        amount=data.amount,
        description=data.description,
        expense_date=data.expense_date or date.today(),
        created_by=created_by,
    )
    db.add(expense)
    await db.flush()
    db.add(
        AuditLog(
            table_name="expenses",
            record_id=expense.id,
            action="CREATE",
            new_data={"vehicle_id": data.vehicle_id, "category": data.category.value, "amount": str(data.amount)},
            performed_by=created_by,
        )
    )
    await db.refresh(expense)
    return expense
