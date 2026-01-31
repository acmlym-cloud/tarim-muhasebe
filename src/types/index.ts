// ==================== ENUMS ====================

export type AccountType = 'customer' | 'supplier' | 'worker' | 'other';
export type MachineType = 'tractor' | 'harvester' | 'seeder' | 'sprayer' | 'trailer' | 'other';
export type TransactionType = 'debt' | 'credit';
export type ExpenseType = 'fuel' | 'maintenance' | 'repair' | 'insurance' | 'tax' | 'labor' | 'other';
export type ReceivableStatus = 'pending' | 'partial' | 'paid' | 'overdue';

// ==================== MAKİNE KİŞİSİ (MACHINE PERSON) ====================

export interface MachinePerson {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
  total_receivables: number;
  total_paid: number;
  field_count: number;
  created_at: string;
}

export interface MachinePersonCreate {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// ==================== MAKİNE TARLASI (MACHINE FIELD) ====================

export interface MachineField {
  id: string;
  person_id: string;
  person_name: string;
  name: string;
  size_decare?: number;
  location?: string;
  crop?: string;
  harvest_date?: string;
  notes?: string;
  created_at: string;
}

export interface MachineFieldCreate {
  person_id: string;
  name: string;
  size_decare?: number;
  location?: string;
  crop?: string;
  harvest_date?: string;
  notes?: string;
}

// ==================== MAKİNE ALACAĞI (MACHINE RECEIVABLE) ====================

export interface MachineReceivable {
  id: string;
  person_id: string;
  person_name: string;
  field_id?: string;
  field_name?: string;
  machine_id?: string;
  machine_name?: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  description?: string;
  work_date?: string;
  due_date?: string;
  decare_count?: number;
  price_per_decare?: number;
  status: ReceivableStatus;
  created_at: string;
}

export interface MachineReceivableCreate {
  person_id: string;
  field_id?: string;
  machine_id?: string;
  amount: number;
  description?: string;
  work_date?: string;
  due_date?: string;
  decare_count?: number;
  price_per_decare?: number;
}

// ==================== CARİ HESAP (ACCOUNT) ====================

export interface Account {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  account_type: AccountType;
  tax_number?: string;
  balance: number;
  total_debt: number;
  total_credit: number;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  account_type: AccountType;
  tax_number?: string;
}

export interface AccountUpdate {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  account_type?: AccountType;
  tax_number?: string;
}

// ==================== CARİ HAREKET (TRANSACTION) ====================

export interface Transaction {
  id: string;
  account_id: string;
  account_name: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  date: string;
  machine_id?: string;
  machine_name?: string;
  field_id?: string;
  field_name?: string;
  is_paid: boolean;
  created_at: string;
}

export interface TransactionCreate {
  account_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  date?: string;
  machine_id?: string;
  field_id?: string;
}

// ==================== MAKİNE ====================

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  plate_number?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  total_expenses: number;
  total_income: number;
  created_at: string;
}

export interface MachineCreate {
  name: string;
  type: MachineType;
  plate_number?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
}

// ==================== GİDER (EXPENSE) ====================

export interface Expense {
  id: string;
  machine_id: string;
  machine_name: string;
  amount: number;
  expense_type: ExpenseType;
  description?: string;
  date: string;
  account_id?: string;
  account_name?: string;
  created_at: string;
}

export interface ExpenseCreate {
  machine_id: string;
  amount: number;
  expense_type: ExpenseType;
  description?: string;
  date?: string;
  account_id?: string;
}

// ==================== TARLA (FIELD) ====================

export interface Field {
  id: string;
  name: string;
  size_decare?: number;
  location?: string;
  notes?: string;
  account_id?: string;
  account_name?: string;
  created_at: string;
}

export interface FieldCreate {
  name: string;
  size_decare?: number;
  location?: string;
  notes?: string;
  account_id?: string;
}

// ==================== ALACAK (RECEIVABLE) ====================

export interface Receivable {
  id: string;
  account_id: string;
  account_name: string;
  field_id?: string;
  field_name?: string;
  machine_id?: string;
  machine_name?: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  description?: string;
  due_date?: string;
  work_date?: string;
  decare_count?: number;
  price_per_decare?: number;
  status: ReceivableStatus;
  created_at: string;
}

export interface ReceivableCreate {
  account_id: string;
  field_id?: string;
  machine_id?: string;
  amount: number;
  description?: string;
  due_date?: string;
  work_date?: string;
  decare_count?: number;
  price_per_decare?: number;
}

// ==================== ÖZETLER (SUMMARIES) ====================

export interface AccountsSummary {
  total_accounts: number;
  total_balance: number;
  total_debt: number;
  total_credit: number;
  by_type: Record<string, { count: number; balance: number }>;
}

export interface MachinesSummary {
  total_machines: number;
  total_expenses: number;
  total_income: number;
  total_receivables: number;
  total_remaining: number;
  net_profit: number;
}

export interface ReceivablesSummary {
  total_receivables: number;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  by_status: Record<string, { count: number; amount: number }>;
}

export interface MachinePersonsSummary {
  total_persons: number;
  total_receivables: number;
  total_paid: number;
  total_remaining: number;
  by_status: Record<string, number>;
}

// ==================== API TYPES ====================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
