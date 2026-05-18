from typing import Annotated

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select

from database import engine, get_session
from models import Expense, ExpenseCreate, ExpenseRead, ExpenseUpdate, ExpenseDelete

app = FastAPI()