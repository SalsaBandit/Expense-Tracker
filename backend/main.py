from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select

from database import engine, get_session
from models import Expense, ExpenseCreate, ExpenseRead, ExpenseUpdate

app = FastAPI()

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://your-frontend-app.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_table():
    SQLModel.metadata.create_all(engine)

@app.on_event("startup")
def on_startup():
    create_table()

SessionDep = Annotated[Session, Depends(get_session)]

@app.post("/expenses", response_model=ExpenseRead)
def create_expense(expense: ExpenseCreate, session: SessionDep):
    db_expense = Expense.model_validate(expense)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense

@app.get("/expenses", response_model=list[ExpenseRead])
def read_expenses(session: SessionDep, category: str | None = None):
    query = select(Expense)
    if category:
        query = query.where(Expense.category == category)
    expenses = session.exec(query).all()
    return expenses

@app.get("/expenses/{expense_id}", response_model=ExpenseRead)
def read_expense(expense_id: int, session: SessionDep):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@app.patch("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, expense_update: ExpenseUpdate, session: SessionDep):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    new_data = expense_update.model_dump(exclude_unset=True)
    expense.sqlmodel_update(new_data)
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, session: SessionDep):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()
    return {"message": "Expense deleted!!!"}