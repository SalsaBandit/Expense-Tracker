from datetime import date
from sqlmodel import SQLModel, Field

class ExpenseBase (SQLModel):
    title: str
    amount : float
    category : str
    date : date
    notes : str | None = None

class Expense(ExpenseBase, table=True):
    id: int | None = Field(default=None, primary_key=True)

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseRead(ExpenseBase):
    id: int

class ExpenseUpdate(SQLModel):
    title: str | None = None
    amount: float | None = None
    category: str | None = None
    date: date | None = None
    notes: str | None = None

class ExpenseDelete(SQLModel):
    id: int