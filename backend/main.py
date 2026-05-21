import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import distinct, func
from sqlmodel import SQLModel, Session, select

from database import engine, get_session
from models import Expense, ExpenseCreate, ExpenseRead, ExpenseUpdate, User, UserCreate, UserRead, CategoryTotal

app = FastAPI()

SECRET_KEY = os.getenv("SECRET_KEY", "development_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://expense-tracker-cyan-alpha.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


SessionDep = Annotated[Session, Depends(get_session)]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_user_by_email(email: str, session: Session):
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()


def authenticate_user(email: str, password: str, session: Session):
    user = get_user_by_email(email, session)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: SessionDep,
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(email, session)
    if user is None:
        raise credentials_exception

    return user

@app.post("/register", response_model=UserRead)
def register_user(user: UserCreate, session: SessionDep):
    normalized_email = user.email.strip().lower()

    existing_user = get_user_by_email(normalized_email, session)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(user.password),
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@app.post("/token")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
):
    user = authenticate_user(
        form_data.username.strip().lower(),
        form_data.password,
        session,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/expenses", response_model=ExpenseRead)
def create_expense(
    expense: ExpenseCreate,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    cleaned_data = expense.model_dump()
    cleaned_data["category"] = cleaned_data["category"].strip().title()

    db_expense = Expense(**cleaned_data, owner_id=current_user.id)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense


@app.get("/expenses", response_model=list[ExpenseRead])
def read_expenses(
    session: SessionDep,
    current_user: User = Depends(get_current_user),
    category: str | None = None,
):
    statement = select(Expense).where(Expense.owner_id == current_user.id)

    if category:
        statement = statement.where(Expense.category == category)

    expenses = session.exec(statement).all()
    return expenses


@app.patch("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    expense = session.get(Expense, expense_id)

    if not expense or expense.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = expense_update.model_dump(exclude_unset=True)

    if "category" in update_data and update_data["category"]:
        update_data["category"] = update_data["category"].strip().title()

    expense.sqlmodel_update(update_data)

    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    expense = session.get(Expense, expense_id)

    if not expense or expense.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")

    session.delete(expense)
    session.commit()
    return {"message": "Expense deleted successfully"}


@app.get("/categories", response_model=list[str])
def read_categories(
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(distinct(Expense.category))
        .where(Expense.owner_id == current_user.id)
    )
    categories = session.exec(statement).all()
    return sorted([category for category in categories if category])

@app.get("/expenses/category-totals", response_model=list[CategoryTotal])
def get_category_totals(
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(Expense.category, func.sum(Expense.amount))
        .where(Expense.owner_id == current_user.id)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    )

    results = session.exec(statement).all()

    return [
        CategoryTotal(category=category, total=float(total))
        for category, total in results
    ]