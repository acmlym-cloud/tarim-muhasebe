from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from datetime import datetime
from enum import Enum
import asyncpg
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Static files directory
STATIC_DIR = ROOT_DIR / 'static'

# PostgreSQL bağlantısı
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Global connection pool
pool = None

async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    return pool

async def init_db():
    """Veritabanı tablolarını oluştur"""
    p = await get_pool()
    async with p.acquire() as conn:
        # Accounts table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'customer',
                balance DECIMAL DEFAULT 0,
                phone TEXT,
                address TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Transactions table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Machines table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS machines (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT,
                brand TEXT,
                model TEXT,
                year INTEGER,
                purchase_price DECIMAL DEFAULT 0,
                purchase_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Machine persons table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS machine_persons (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                notes TEXT,
                total_debt DECIMAL DEFAULT 0,
                total_paid DECIMAL DEFAULT 0,
                field_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Machine fields table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS machine_fields (
                id TEXT PRIMARY KEY,
                person_id TEXT REFERENCES machine_persons(id) ON DELETE CASCADE,
                machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
                field_name TEXT,
                location TEXT,
                size_decare DECIMAL DEFAULT 0,
                work_date TIMESTAMP,
                price_per_decare DECIMAL DEFAULT 0,
                total_price DECIMAL DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Machine expenses table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS machine_expenses (
                id TEXT PRIMARY KEY,
                machine_id TEXT REFERENCES machines(id) ON DELETE CASCADE,
                expense_type TEXT,
                amount DECIMAL NOT NULL,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Machine receivables table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS machine_receivables (
                id TEXT PRIMARY KEY,
                person_id TEXT REFERENCES machine_persons(id) ON DELETE CASCADE,
                amount DECIMAL NOT NULL,
                paid_amount DECIMAL DEFAULT 0,
                remaining_amount DECIMAL DEFAULT 0,
                decare_count DECIMAL DEFAULT 0,
                price_per_decare DECIMAL DEFAULT 0,
                description TEXT,
                status TEXT DEFAULT 'pending',
                due_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Machine payments table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS machine_payments (
                id TEXT PRIMARY KEY,
                receivable_id TEXT REFERENCES machine_receivables(id) ON DELETE CASCADE,
                amount DECIMAL NOT NULL,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm fields table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_fields (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT,
                size_decare DECIMAL DEFAULT 0,
                soil_type TEXT,
                irrigation_type TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm incomes table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_incomes (
                id TEXT PRIMARY KEY,
                income_type TEXT,
                amount DECIMAL NOT NULL,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm expenses table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_expenses (
                id TEXT PRIMARY KEY,
                field_id TEXT REFERENCES farm_fields(id) ON DELETE SET NULL,
                expense_type TEXT,
                amount DECIMAL NOT NULL,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm credits table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_credits (
                id TEXT PRIMARY KEY,
                creditor TEXT,
                amount DECIMAL NOT NULL,
                paid_amount DECIMAL DEFAULT 0,
                interest_rate DECIMAL DEFAULT 0,
                start_date TIMESTAMP,
                due_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm harvests table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_harvests (
                id TEXT PRIMARY KEY,
                field_id TEXT REFERENCES farm_fields(id) ON DELETE SET NULL,
                product TEXT,
                quantity DECIMAL DEFAULT 0,
                unit TEXT DEFAULT 'kg',
                harvest_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm sales table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_sales (
                id TEXT PRIMARY KEY,
                product TEXT,
                quantity DECIMAL DEFAULT 0,
                unit TEXT DEFAULT 'kg',
                price_per_unit DECIMAL DEFAULT 0,
                total_price DECIMAL DEFAULT 0,
                buyer TEXT,
                sale_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Farm stocks table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS farm_stocks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                quantity DECIMAL DEFAULT 0,
                unit TEXT DEFAULT 'kg',
                category TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Annual stocks table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS annual_stocks (
                id TEXT PRIMARY KEY,
                year INTEGER NOT NULL,
                product TEXT NOT NULL,
                opening_stock DECIMAL DEFAULT 0,
                closing_stock DECIMAL DEFAULT 0,
                unit TEXT DEFAULT 'kg',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        print("Database tables created successfully!")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Startup event
@app.on_event("startup")
async def startup():
    await init_db()

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint for Render"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@api_router.get("/health/ready")
async def readiness_check():
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"status": "not_ready", "error": str(e)})

@api_router.get("/health/live")
async def liveness_check():
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

# ==================== HELPER FUNCTIONS ====================

def row_to_dict(row):
    """Convert asyncpg Record to dict"""
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    """Convert list of asyncpg Records to list of dicts"""
    return [dict(row) for row in rows]

# ==================== ACCOUNTS ====================

class AccountCreate(BaseModel):
    name: str
    type: str = "customer"
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class TransactionCreate(BaseModel):
    account_id: str
    type: str  # 'debt' or 'credit'
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None

@api_router.get("/accounts")
async def get_accounts():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM accounts ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/accounts")
async def create_account(account: AccountCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        account_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO accounts (id, name, type, phone, address, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
        ''', account_id, account.name, account.type, account.phone, account.address, account.notes)
        row = await conn.fetchrow('SELECT * FROM accounts WHERE id = $1', account_id)
        return row_to_dict(row)

@api_router.get("/accounts/{account_id}")
async def get_account(account_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow('SELECT * FROM accounts WHERE id = $1', account_id)
        if not row:
            raise HTTPException(status_code=404, detail="Account not found")
        return row_to_dict(row)

@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, account: AccountCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('''
            UPDATE accounts SET name=$1, type=$2, phone=$3, address=$4, notes=$5
            WHERE id=$6
        ''', account.name, account.type, account.phone, account.address, account.notes, account_id)
        row = await conn.fetchrow('SELECT * FROM accounts WHERE id = $1', account_id)
        return row_to_dict(row)

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM accounts WHERE id = $1', account_id)
        return {"message": "Account deleted"}

# ==================== TRANSACTIONS ====================

@api_router.get("/transactions")
async def get_transactions():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM transactions ORDER BY date DESC')
        return rows_to_list(rows)

@api_router.post("/transactions")
async def create_transaction(txn: TransactionCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        txn_id = str(uuid.uuid4())
        txn_date = txn.date or datetime.utcnow()
        await conn.execute('''
            INSERT INTO transactions (id, account_id, type, amount, description, date)
            VALUES ($1, $2, $3, $4, $5, $6)
        ''', txn_id, txn.account_id, txn.type, txn.amount, txn.description, txn_date)
        
        # Update account balance
        if txn.type == 'debt':
            await conn.execute('UPDATE accounts SET balance = balance + $1 WHERE id = $2', txn.amount, txn.account_id)
        else:
            await conn.execute('UPDATE accounts SET balance = balance - $1 WHERE id = $2', txn.amount, txn.account_id)
        
        row = await conn.fetchrow('SELECT * FROM transactions WHERE id = $1', txn_id)
        return row_to_dict(row)

@api_router.delete("/transactions/{txn_id}")
async def delete_transaction(txn_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        # Get transaction first
        txn = await conn.fetchrow('SELECT * FROM transactions WHERE id = $1', txn_id)
        if txn:
            # Reverse balance change
            if txn['type'] == 'debt':
                await conn.execute('UPDATE accounts SET balance = balance - $1 WHERE id = $2', txn['amount'], txn['account_id'])
            else:
                await conn.execute('UPDATE accounts SET balance = balance + $1 WHERE id = $2', txn['amount'], txn['account_id'])
        await conn.execute('DELETE FROM transactions WHERE id = $1', txn_id)
        return {"message": "Transaction deleted"}

# ==================== ACCOUNTS SUMMARY ====================

@api_router.get("/summary/accounts")
async def get_accounts_summary():
    p = await get_pool()
    async with p.acquire() as conn:
        total_accounts = await conn.fetchval('SELECT COUNT(*) FROM accounts')
        total_debt = await conn.fetchval('SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE balance > 0') or 0
        total_credit = await conn.fetchval('SELECT COALESCE(SUM(ABS(balance)), 0) FROM accounts WHERE balance < 0') or 0
        return {
            "total_accounts": total_accounts,
            "total_debt": float(total_debt),
            "total_credit": float(total_credit),
            "net_balance": float(total_debt) - float(total_credit)
        }

# ==================== MACHINES ====================

class MachineCreate(BaseModel):
    name: str
    type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    purchase_price: Optional[float] = 0
    notes: Optional[str] = None

@api_router.get("/machines")
async def get_machines():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM machines ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/machines")
async def create_machine(machine: MachineCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        machine_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO machines (id, name, type, brand, model, year, purchase_price, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ''', machine_id, machine.name, machine.type, machine.brand, machine.model, 
           machine.year, machine.purchase_price or 0, machine.notes)
        row = await conn.fetchrow('SELECT * FROM machines WHERE id = $1', machine_id)
        return row_to_dict(row)

@api_router.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM machines WHERE id = $1', machine_id)
        return {"message": "Machine deleted"}

@api_router.get("/summary/machines")
async def get_machines_summary():
    p = await get_pool()
    async with p.acquire() as conn:
        total = await conn.fetchval('SELECT COUNT(*) FROM machines')
        total_value = await conn.fetchval('SELECT COALESCE(SUM(purchase_price), 0) FROM machines') or 0
        return {"total_machines": total, "total_value": float(total_value)}

# ==================== MACHINE PERSONS ====================

class MachinePersonCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/machine-persons")
async def get_machine_persons():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM machine_persons ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/machine-persons")
async def create_machine_person(person: MachinePersonCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        person_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO machine_persons (id, name, phone, address, notes)
            VALUES ($1, $2, $3, $4, $5)
        ''', person_id, person.name, person.phone, person.address, person.notes)
        row = await conn.fetchrow('SELECT * FROM machine_persons WHERE id = $1', person_id)
        return row_to_dict(row)

@api_router.put("/machine-persons/{person_id}")
async def update_machine_person(person_id: str, person: MachinePersonCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('''
            UPDATE machine_persons SET name=$1, phone=$2, address=$3, notes=$4
            WHERE id=$5
        ''', person.name, person.phone, person.address, person.notes, person_id)
        row = await conn.fetchrow('SELECT * FROM machine_persons WHERE id = $1', person_id)
        return row_to_dict(row)

@api_router.delete("/machine-persons/{person_id}")
async def delete_machine_person(person_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM machine_persons WHERE id = $1', person_id)
        return {"message": "Person deleted"}

@api_router.get("/summary/machine-persons")
async def get_machine_persons_summary():
    p = await get_pool()
    async with p.acquire() as conn:
        total = await conn.fetchval('SELECT COUNT(*) FROM machine_persons')
        total_receivables = await conn.fetchval('SELECT COALESCE(SUM(amount), 0) FROM machine_receivables') or 0
        total_paid = await conn.fetchval('SELECT COALESCE(SUM(paid_amount), 0) FROM machine_receivables') or 0
        return {
            "total_persons": total,
            "total_receivables": float(total_receivables),
            "total_paid": float(total_paid),
            "total_remaining": float(total_receivables) - float(total_paid)
        }

# ==================== MACHINE FIELDS ====================

class MachineFieldCreate(BaseModel):
    person_id: str
    machine_id: Optional[str] = None
    field_name: Optional[str] = None
    location: Optional[str] = None
    size_decare: Optional[float] = 0
    work_date: Optional[datetime] = None
    price_per_decare: Optional[float] = 0
    total_price: Optional[float] = 0
    notes: Optional[str] = None

@api_router.get("/machine-fields")
async def get_machine_fields():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM machine_fields ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/machine-fields")
async def create_machine_field(field: MachineFieldCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        field_id = str(uuid.uuid4())
        total = field.total_price or (field.size_decare or 0) * (field.price_per_decare or 0)
        await conn.execute('''
            INSERT INTO machine_fields (id, person_id, machine_id, field_name, location, size_decare, work_date, price_per_decare, total_price, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ''', field_id, field.person_id, field.machine_id, field.field_name, field.location,
           field.size_decare or 0, field.work_date, field.price_per_decare or 0, total, field.notes)
        row = await conn.fetchrow('SELECT * FROM machine_fields WHERE id = $1', field_id)
        return row_to_dict(row)

@api_router.delete("/machine-fields/{field_id}")
async def delete_machine_field(field_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM machine_fields WHERE id = $1', field_id)
        return {"message": "Field deleted"}

# ==================== MACHINE EXPENSES ====================

class MachineExpenseCreate(BaseModel):
    machine_id: Optional[str] = None
    expense_type: Optional[str] = None
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None

@api_router.get("/expenses")
async def get_machine_expenses():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM machine_expenses ORDER BY date DESC')
        return rows_to_list(rows)

@api_router.post("/expenses")
async def create_machine_expense(expense: MachineExpenseCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        expense_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO machine_expenses (id, machine_id, expense_type, amount, description, date)
            VALUES ($1, $2, $3, $4, $5, $6)
        ''', expense_id, expense.machine_id, expense.expense_type, expense.amount, 
           expense.description, expense.date or datetime.utcnow())
        row = await conn.fetchrow('SELECT * FROM machine_expenses WHERE id = $1', expense_id)
        return row_to_dict(row)

@api_router.delete("/expenses/{expense_id}")
async def delete_machine_expense(expense_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM machine_expenses WHERE id = $1', expense_id)
        return {"message": "Expense deleted"}

# ==================== MACHINE RECEIVABLES ====================

class MachineReceivableCreate(BaseModel):
    person_id: str
    amount: float
    decare_count: Optional[float] = 0
    price_per_decare: Optional[float] = 0
    description: Optional[str] = None
    due_date: Optional[datetime] = None

@api_router.get("/machine-receivables")
async def get_machine_receivables():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM machine_receivables ORDER BY created_at DESC')
        result = []
        for row in rows:
            r = dict(row)
            # Get payments for this receivable
            payments = await conn.fetch('SELECT * FROM machine_payments WHERE receivable_id = $1', row['id'])
            r['payments'] = rows_to_list(payments)
            result.append(r)
        return result

@api_router.post("/machine-receivables")
async def create_machine_receivable(rec: MachineReceivableCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        rec_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO machine_receivables (id, person_id, amount, paid_amount, remaining_amount, decare_count, price_per_decare, description, due_date)
            VALUES ($1, $2, $3, 0, $3, $4, $5, $6, $7)
        ''', rec_id, rec.person_id, rec.amount, rec.decare_count or 0, rec.price_per_decare or 0, rec.description, rec.due_date)
        row = await conn.fetchrow('SELECT * FROM machine_receivables WHERE id = $1', rec_id)
        result = dict(row)
        result['payments'] = []
        return result

@api_router.post("/machine-receivables/{rec_id}/payment")
async def add_payment(rec_id: str, payment: dict):
    p = await get_pool()
    async with p.acquire() as conn:
        payment_id = str(uuid.uuid4())
        amount = payment.get('amount', 0)
        description = payment.get('description', '')
        
        await conn.execute('''
            INSERT INTO machine_payments (id, receivable_id, amount, description)
            VALUES ($1, $2, $3, $4)
        ''', payment_id, rec_id, amount, description)
        
        # Update receivable
        await conn.execute('''
            UPDATE machine_receivables 
            SET paid_amount = paid_amount + $1, 
                remaining_amount = amount - paid_amount - $1,
                status = CASE WHEN amount <= paid_amount + $1 THEN 'paid' ELSE 'pending' END
            WHERE id = $2
        ''', amount, rec_id)
        
        row = await conn.fetchrow('SELECT * FROM machine_receivables WHERE id = $1', rec_id)
        result = dict(row)
        payments = await conn.fetch('SELECT * FROM machine_payments WHERE receivable_id = $1', rec_id)
        result['payments'] = rows_to_list(payments)
        return result

@api_router.delete("/machine-receivables/{rec_id}")
async def delete_machine_receivable(rec_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM machine_receivables WHERE id = $1', rec_id)
        return {"message": "Receivable deleted"}

# ==================== FARM FIELDS ====================

class FarmFieldCreate(BaseModel):
    name: str
    location: Optional[str] = None
    size_decare: Optional[float] = 0
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/farm/fields")
async def get_farm_fields():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_fields ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/farm/fields")
async def create_farm_field(field: FarmFieldCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        field_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO farm_fields (id, name, location, size_decare, soil_type, irrigation_type, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        ''', field_id, field.name, field.location, field.size_decare or 0, field.soil_type, field.irrigation_type, field.notes)
        row = await conn.fetchrow('SELECT * FROM farm_fields WHERE id = $1', field_id)
        return row_to_dict(row)

@api_router.delete("/farm/fields/{field_id}")
async def delete_farm_field(field_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_fields WHERE id = $1', field_id)
        return {"message": "Field deleted"}

# ==================== FARM INCOMES ====================

class FarmIncomeCreate(BaseModel):
    income_type: Optional[str] = None
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None

@api_router.get("/farm/incomes")
async def get_farm_incomes():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_incomes ORDER BY date DESC')
        return rows_to_list(rows)

@api_router.post("/farm/incomes")
async def create_farm_income(income: FarmIncomeCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        income_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO farm_incomes (id, income_type, amount, description, date)
            VALUES ($1, $2, $3, $4, $5)
        ''', income_id, income.income_type, income.amount, income.description, income.date or datetime.utcnow())
        row = await conn.fetchrow('SELECT * FROM farm_incomes WHERE id = $1', income_id)
        return row_to_dict(row)

@api_router.delete("/farm/incomes/{income_id}")
async def delete_farm_income(income_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_incomes WHERE id = $1', income_id)
        return {"message": "Income deleted"}

# ==================== FARM EXPENSES ====================

class FarmExpenseCreate(BaseModel):
    field_id: Optional[str] = None
    expense_type: Optional[str] = None
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None

@api_router.get("/farm/expenses")
async def get_farm_expenses():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_expenses ORDER BY date DESC')
        return rows_to_list(rows)

@api_router.post("/farm/expenses")
async def create_farm_expense(expense: FarmExpenseCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        expense_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO farm_expenses (id, field_id, expense_type, amount, description, date)
            VALUES ($1, $2, $3, $4, $5, $6)
        ''', expense_id, expense.field_id, expense.expense_type, expense.amount, expense.description, expense.date or datetime.utcnow())
        row = await conn.fetchrow('SELECT * FROM farm_expenses WHERE id = $1', expense_id)
        return row_to_dict(row)

@api_router.delete("/farm/expenses/{expense_id}")
async def delete_farm_expense(expense_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_expenses WHERE id = $1', expense_id)
        return {"message": "Expense deleted"}

# ==================== FARM CREDITS ====================

class FarmCreditCreate(BaseModel):
    creditor: Optional[str] = None
    amount: float
    paid_amount: Optional[float] = 0
    interest_rate: Optional[float] = 0
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

@api_router.get("/farm/credits")
async def get_farm_credits():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_credits ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/farm/credits")
async def create_farm_credit(credit: FarmCreditCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        credit_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO farm_credits (id, creditor, amount, paid_amount, interest_rate, start_date, due_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ''', credit_id, credit.creditor, credit.amount, credit.paid_amount or 0, credit.interest_rate or 0, credit.start_date, credit.due_date, credit.notes)
        row = await conn.fetchrow('SELECT * FROM farm_credits WHERE id = $1', credit_id)
        return row_to_dict(row)

@api_router.delete("/farm/credits/{credit_id}")
async def delete_farm_credit(credit_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_credits WHERE id = $1', credit_id)
        return {"message": "Credit deleted"}

@api_router.get("/farm/credit-summary")
async def get_farm_credit_summary():
    p = await get_pool()
    async with p.acquire() as conn:
        total = await conn.fetchval('SELECT COALESCE(SUM(amount), 0) FROM farm_credits') or 0
        paid = await conn.fetchval('SELECT COALESCE(SUM(paid_amount), 0) FROM farm_credits') or 0
        return {
            "total_credits": float(total),
            "total_paid": float(paid),
            "remaining": float(total) - float(paid)
        }

# ==================== FARM HARVESTS ====================

class FarmHarvestCreate(BaseModel):
    field_id: Optional[str] = None
    product: Optional[str] = None
    quantity: Optional[float] = 0
    unit: Optional[str] = "kg"
    harvest_date: Optional[datetime] = None
    notes: Optional[str] = None

@api_router.get("/farm/harvests")
async def get_farm_harvests():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_harvests ORDER BY harvest_date DESC')
        return rows_to_list(rows)

@api_router.post("/farm/harvests")
async def create_farm_harvest(harvest: FarmHarvestCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        harvest_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO farm_harvests (id, field_id, product, quantity, unit, harvest_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        ''', harvest_id, harvest.field_id, harvest.product, harvest.quantity or 0, harvest.unit, harvest.harvest_date, harvest.notes)
        row = await conn.fetchrow('SELECT * FROM farm_harvests WHERE id = $1', harvest_id)
        return row_to_dict(row)

@api_router.delete("/farm/harvests/{harvest_id}")
async def delete_farm_harvest(harvest_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_harvests WHERE id = $1', harvest_id)
        return {"message": "Harvest deleted"}

# ==================== FARM SALES ====================

class FarmSaleCreate(BaseModel):
    product: Optional[str] = None
    quantity: Optional[float] = 0
    unit: Optional[str] = "kg"
    price_per_unit: Optional[float] = 0
    total_price: Optional[float] = 0
    buyer: Optional[str] = None
    sale_date: Optional[datetime] = None
    notes: Optional[str] = None

@api_router.get("/farm/sales")
async def get_farm_sales():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_sales ORDER BY sale_date DESC')
        return rows_to_list(rows)

@api_router.post("/farm/sales")
async def create_farm_sale(sale: FarmSaleCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        sale_id = str(uuid.uuid4())
        total = sale.total_price or (sale.quantity or 0) * (sale.price_per_unit or 0)
        await conn.execute('''
            INSERT INTO farm_sales (id, product, quantity, unit, price_per_unit, total_price, buyer, sale_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ''', sale_id, sale.product, sale.quantity or 0, sale.unit, sale.price_per_unit or 0, total, sale.buyer, sale.sale_date, sale.notes)
        row = await conn.fetchrow('SELECT * FROM farm_sales WHERE id = $1', sale_id)
        return row_to_dict(row)

@api_router.delete("/farm/sales/{sale_id}")
async def delete_farm_sale(sale_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_sales WHERE id = $1', sale_id)
        return {"message": "Sale deleted"}

# ==================== FARM STOCKS ====================

class FarmStockCreate(BaseModel):
    name: str
    quantity: Optional[float] = 0
    unit: Optional[str] = "kg"
    category: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/farm/stocks")
async def get_farm_stocks():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM farm_stocks ORDER BY created_at DESC')
        return rows_to_list(rows)

@api_router.post("/farm/stocks")
async def create_farm_stock(stock: FarmStockCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        stock_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO farm_stocks (id, name, quantity, unit, category, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
        ''', stock_id, stock.name, stock.quantity or 0, stock.unit, stock.category, stock.notes)
        row = await conn.fetchrow('SELECT * FROM farm_stocks WHERE id = $1', stock_id)
        return row_to_dict(row)

@api_router.delete("/farm/stocks/{stock_id}")
async def delete_farm_stock(stock_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM farm_stocks WHERE id = $1', stock_id)
        return {"message": "Stock deleted"}

# ==================== ANNUAL STOCKS ====================

class AnnualStockCreate(BaseModel):
    year: int
    product: str
    opening_stock: Optional[float] = 0
    closing_stock: Optional[float] = 0
    unit: Optional[str] = "kg"
    notes: Optional[str] = None

@api_router.get("/farm/annual-stocks")
async def get_annual_stocks():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM annual_stocks ORDER BY year DESC')
        return rows_to_list(rows)

@api_router.post("/farm/annual-stocks")
async def create_annual_stock(stock: AnnualStockCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        stock_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO annual_stocks (id, year, product, opening_stock, closing_stock, unit, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        ''', stock_id, stock.year, stock.product, stock.opening_stock or 0, stock.closing_stock or 0, stock.unit, stock.notes)
        row = await conn.fetchrow('SELECT * FROM annual_stocks WHERE id = $1', stock_id)
        return row_to_dict(row)

@api_router.delete("/farm/annual-stocks/{stock_id}")
async def delete_annual_stock(stock_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('DELETE FROM annual_stocks WHERE id = $1', stock_id)
        return {"message": "Annual stock deleted"}

@api_router.get("/farm/annual-stock-summary")
async def get_annual_stock_summary():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM annual_stocks ORDER BY year DESC')
        return rows_to_list(rows)

# ==================== FARM SUMMARY ====================

@api_router.get("/farm/summary")
async def get_farm_summary():
    p = await get_pool()
    async with p.acquire() as conn:
        total_fields = await conn.fetchval('SELECT COUNT(*) FROM farm_fields')
        total_decare = await conn.fetchval('SELECT COALESCE(SUM(size_decare), 0) FROM farm_fields') or 0
        total_income = await conn.fetchval('SELECT COALESCE(SUM(amount), 0) FROM farm_incomes') or 0
        total_expense = await conn.fetchval('SELECT COALESCE(SUM(amount), 0) FROM farm_expenses') or 0
        total_harvest = await conn.fetchval('SELECT COALESCE(SUM(quantity), 0) FROM farm_harvests') or 0
        total_sales = await conn.fetchval('SELECT COALESCE(SUM(total_price), 0) FROM farm_sales') or 0
        return {
            "total_fields": total_fields,
            "total_decare": float(total_decare),
            "total_income": float(total_income),
            "total_expense": float(total_expense),
            "net_profit": float(total_income) - float(total_expense),
            "total_harvest": float(total_harvest),
            "total_sales": float(total_sales)
        }

# ==================== YEAR SUMMARY ====================

@api_router.get("/year-summary")
async def get_year_summary(year: int = Query(default=2025)):
    p = await get_pool()
    async with p.acquire() as conn:
        # Bu yıl için özet
        income = await conn.fetchval('''
            SELECT COALESCE(SUM(amount), 0) FROM farm_incomes 
            WHERE EXTRACT(YEAR FROM date) = $1
        ''', year) or 0
        expense = await conn.fetchval('''
            SELECT COALESCE(SUM(amount), 0) FROM farm_expenses 
            WHERE EXTRACT(YEAR FROM date) = $1
        ''', year) or 0
        return {
            "year": year,
            "total_income": float(income),
            "total_expense": float(expense),
            "net_profit": float(income) - float(expense)
        }

# ==================== FIELD STOCK USAGE ====================

@api_router.get("/farm/field-stock-usage")
async def get_field_stock_usage():
    return []

# ==================== CORS ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(api_router)

# ==================== STATIC FILES (WEB APP) ====================

# Serve static files if directory exists
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")
    app.mount("/_expo", StaticFiles(directory=str(STATIC_DIR / "_expo")), name="expo")
    
    @app.get("/")
    async def serve_index():
        return FileResponse(str(STATIC_DIR / "index.html"))
    
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # API isteklerini atla
        if path.startswith("api/") or path.startswith("docs") or path.startswith("openapi"):
            raise HTTPException(status_code=404)
        
        file_path = STATIC_DIR / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
