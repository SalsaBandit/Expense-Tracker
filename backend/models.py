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
    owner_id: int = Field(foreign_key="user.id")

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseRead(ExpenseBase):
    id: int
    owner_id: int

class ExpenseUpdate(SQLModel):
    title: str | None = None
    amount: float | None = None
    category: str | None = None
    date: date | None = None
    notes: str | None = None

class UserBase (SQLModel):
    email: str = Field(index=True, unique=True)

class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

class CategoryTotal(SQLModel):
    category: str
    total: float
    