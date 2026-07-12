"""
Expense schemas.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    vehicle_id: int
    category: ExpenseCategory
    amount: Decimal = Field(ge=0)
    description: Optional[str] = Field(default=None, max_length=255)
    expense_date: Optional[date] = None

    model_config = {"str_strip_whitespace": True}


class ExpenseOut(BaseModel):
    id: int
    vehicle_id: int
    category: ExpenseCategory
    amount: Decimal
    description: Optional[str]
    expense_date: date
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedExpenses(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    limit: int
