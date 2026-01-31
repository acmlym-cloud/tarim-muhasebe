// Offline Storage Service - Tüm veriler telefonda saklanır
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const KEYS = {
  ACCOUNTS: 'ciftlik_accounts',
  TRANSACTIONS: 'ciftlik_transactions',
  MACHINES: 'ciftlik_machines',
  MACHINE_PERSONS: 'ciftlik_machine_persons',
  MACHINE_FIELDS: 'ciftlik_machine_fields',
  MACHINE_EXPENSES: 'ciftlik_machine_expenses',
  MACHINE_RECEIVABLES: 'ciftlik_machine_receivables',
  FARM_FIELDS: 'ciftlik_farm_fields',
  FARM_INCOMES: 'ciftlik_farm_incomes',
  FARM_EXPENSES: 'ciftlik_farm_expenses',
  FARM_CREDITS: 'ciftlik_farm_credits',
  FARM_HARVESTS: 'ciftlik_farm_harvests',
  FARM_SALES: 'ciftlik_farm_sales',
  FARM_STOCKS: 'ciftlik_farm_stocks',
  ANNUAL_STOCKS: 'ciftlik_annual_stocks',
};

// Helper: Generate UUID
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper: Get current timestamp
const now = (): string => new Date().toISOString();

// Generic CRUD operations
async function getAll<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return [];
  }
}

async function saveAll<T>(key: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

async function addItem<T extends { id?: string; created_at?: string }>(
  key: string,
  item: Omit<T, 'id' | 'created_at'>
): Promise<T> {
  const items = await getAll<T>(key);
  const newItem = {
    ...item,
    id: generateId(),
    created_at: now(),
  } as T;
  items.unshift(newItem);
  await saveAll(key, items);
  return newItem;
}

async function updateItem<T extends { id: string }>(
  key: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const items = await getAll<T>(key);
  // ID karşılaştırmasını string olarak yap
  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    console.warn(`updateItem: ID ${id} bulunamadı - key: ${key}`);
    return null;
  }
  // ID'yi koruyarak güncelle
  items[index] = { ...items[index], ...updates, id: items[index].id };
  await saveAll(key, items);
  return items[index];
}

async function deleteItem(key: string, id: string): Promise<boolean> {
  const items = await getAll<any>(key);
  const filtered = items.filter((item: any) => item.id !== id);
  if (filtered.length === items.length) return false;
  await saveAll(key, filtered);
  return true;
}

async function getById<T extends { id: string }>(key: string, id: string): Promise<T | null> {
  const items = await getAll<T>(key);
  return items.find((item) => item.id === id) || null;
}

// ==================== ACCOUNTS ====================

export const accountsStorage = {
  getAll: () => getAll(KEYS.ACCOUNTS),
  add: (account: any) => addItem(KEYS.ACCOUNTS, account),
  update: (id: string, data: any) => updateItem(KEYS.ACCOUNTS, id, data),
  delete: (id: string) => deleteItem(KEYS.ACCOUNTS, id),
  getById: (id: string) => getById(KEYS.ACCOUNTS, id),
};

// ==================== TRANSACTIONS ====================

export const transactionsStorage = {
  getAll: () => getAll(KEYS.TRANSACTIONS),
  add: async (transaction: any) => {
    const newTxn = await addItem(KEYS.TRANSACTIONS, {
      ...transaction,
      date: transaction.date || now(),
      is_paid: transaction.is_paid || false,
    });
    // Update account balance
    const accounts = await getAll<any>(KEYS.ACCOUNTS);
    const accountIndex = accounts.findIndex((a: any) => a.id === transaction.account_id);
    if (accountIndex !== -1) {
      if (transaction.type === 'debt') {
        accounts[accountIndex].balance = (accounts[accountIndex].balance || 0) + transaction.amount;
      } else {
        accounts[accountIndex].balance = (accounts[accountIndex].balance || 0) - transaction.amount;
      }
      await saveAll(KEYS.ACCOUNTS, accounts);
    }
    return newTxn;
  },
  update: (id: string, data: any) => updateItem(KEYS.TRANSACTIONS, id, data),
  delete: async (id: string) => {
    const txn = await getById<any>(KEYS.TRANSACTIONS, id);
    if (txn) {
      // Reverse balance change
      const accounts = await getAll<any>(KEYS.ACCOUNTS);
      const accountIndex = accounts.findIndex((a: any) => a.id === txn.account_id);
      if (accountIndex !== -1) {
        if (txn.type === 'debt') {
          accounts[accountIndex].balance = (accounts[accountIndex].balance || 0) - txn.amount;
        } else {
          accounts[accountIndex].balance = (accounts[accountIndex].balance || 0) + txn.amount;
        }
        await saveAll(KEYS.ACCOUNTS, accounts);
      }
    }
    return deleteItem(KEYS.TRANSACTIONS, id);
  },
};

// ==================== MACHINES ====================

export const machinesStorage = {
  getAll: () => getAll(KEYS.MACHINES),
  add: (machine: any) => addItem(KEYS.MACHINES, machine),
  update: (id: string, data: any) => updateItem(KEYS.MACHINES, id, data),
  delete: (id: string) => deleteItem(KEYS.MACHINES, id),
};

// ==================== MACHINE PERSONS ====================

export const machinePersonsStorage = {
  getAll: () => getAll(KEYS.MACHINE_PERSONS),
  add: (person: any) => addItem(KEYS.MACHINE_PERSONS, {
    ...person,
    total_debt: 0,
    total_paid: 0,
    field_count: 0,
  }),
  update: (id: string, data: any) => updateItem(KEYS.MACHINE_PERSONS, id, data),
  delete: (id: string) => deleteItem(KEYS.MACHINE_PERSONS, id),
  getById: (id: string) => getById(KEYS.MACHINE_PERSONS, id),
};

// ==================== MACHINE FIELDS ====================

export const machineFieldsStorage = {
  getAll: () => getAll(KEYS.MACHINE_FIELDS),
  add: (field: any) => addItem(KEYS.MACHINE_FIELDS, {
    ...field,
    total_price: field.total_price || (field.size_decare || 0) * (field.price_per_decare || 0),
  }),
  update: (id: string, data: any) => updateItem(KEYS.MACHINE_FIELDS, id, data),
  delete: (id: string) => deleteItem(KEYS.MACHINE_FIELDS, id),
  getById: (id: string) => getById(KEYS.MACHINE_FIELDS, id),
};

// ==================== MACHINE EXPENSES ====================

export const machineExpensesStorage = {
  getAll: () => getAll(KEYS.MACHINE_EXPENSES),
  add: (expense: any) => addItem(KEYS.MACHINE_EXPENSES, {
    ...expense,
    date: expense.date || now(),
  }),
  update: (id: string, data: any) => updateItem(KEYS.MACHINE_EXPENSES, id, data),
  delete: (id: string) => deleteItem(KEYS.MACHINE_EXPENSES, id),
};

// ==================== MACHINE RECEIVABLES ====================

export const machineReceivablesStorage = {
  getAll: async () => {
    const receivables = await getAll<any>(KEYS.MACHINE_RECEIVABLES);
    return receivables.map((r: any) => ({
      ...r,
      payments: r.payments || [],
    }));
  },
  add: (receivable: any) => addItem(KEYS.MACHINE_RECEIVABLES, {
    ...receivable,
    paid_amount: 0,
    remaining_amount: receivable.amount,
    status: 'pending',
    payments: [],
  }),
  update: (id: string, data: any) => updateItem(KEYS.MACHINE_RECEIVABLES, id, data),
  delete: (id: string) => deleteItem(KEYS.MACHINE_RECEIVABLES, id),
  addPayment: async (receivableId: string, payment: { amount: number; description?: string }) => {
    const receivables = await getAll<any>(KEYS.MACHINE_RECEIVABLES);
    const index = receivables.findIndex((r: any) => r.id === receivableId);
    if (index === -1) return null;
    
    const newPayment = {
      id: generateId(),
      receivable_id: receivableId,
      amount: payment.amount,
      description: payment.description || '',
      date: now(),
      created_at: now(),
    };
    
    receivables[index].payments = receivables[index].payments || [];
    receivables[index].payments.push(newPayment);
    receivables[index].paid_amount = (receivables[index].paid_amount || 0) + payment.amount;
    receivables[index].remaining_amount = receivables[index].amount - receivables[index].paid_amount;
    receivables[index].status = receivables[index].remaining_amount <= 0 ? 'paid' : 'pending';
    
    await saveAll(KEYS.MACHINE_RECEIVABLES, receivables);
    return receivables[index];
  },
};

// ==================== FARM FIELDS ====================

export const farmFieldsStorage = {
  getAll: () => getAll(KEYS.FARM_FIELDS),
  add: (field: any) => addItem(KEYS.FARM_FIELDS, field),
  update: (id: string, data: any) => updateItem(KEYS.FARM_FIELDS, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_FIELDS, id),
};

// ==================== FARM INCOMES ====================

export const farmIncomesStorage = {
  getAll: () => getAll(KEYS.FARM_INCOMES),
  add: (income: any) => addItem(KEYS.FARM_INCOMES, {
    ...income,
    date: income.date || now(),
  }),
  update: (id: string, data: any) => updateItem(KEYS.FARM_INCOMES, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_INCOMES, id),
};

// ==================== FARM EXPENSES ====================

export const farmExpensesStorage = {
  getAll: () => getAll(KEYS.FARM_EXPENSES),
  add: (expense: any) => addItem(KEYS.FARM_EXPENSES, {
    ...expense,
    date: expense.date || now(),
  }),
  update: (id: string, data: any) => updateItem(KEYS.FARM_EXPENSES, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_EXPENSES, id),
};

// ==================== FARM CREDITS ====================

export const farmCreditsStorage = {
  getAll: () => getAll(KEYS.FARM_CREDITS),
  add: (credit: any) => addItem(KEYS.FARM_CREDITS, {
    ...credit,
    paid_amount: credit.paid_amount || 0,
  }),
  update: (id: string, data: any) => updateItem(KEYS.FARM_CREDITS, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_CREDITS, id),
};

// ==================== FARM HARVESTS ====================

export const farmHarvestsStorage = {
  getAll: () => getAll(KEYS.FARM_HARVESTS),
  add: (harvest: any) => addItem(KEYS.FARM_HARVESTS, harvest),
  update: (id: string, data: any) => updateItem(KEYS.FARM_HARVESTS, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_HARVESTS, id),
};

// ==================== FARM SALES ====================

export const farmSalesStorage = {
  getAll: () => getAll(KEYS.FARM_SALES),
  add: (sale: any) => addItem(KEYS.FARM_SALES, {
    ...sale,
    total_price: sale.total_price || (sale.quantity || 0) * (sale.unit_price || sale.price_per_unit || 0),
  }),
  update: (id: string, data: any) => updateItem(KEYS.FARM_SALES, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_SALES, id),
};

// ==================== FARM STOCKS ====================

export const farmStocksStorage = {
  getAll: () => getAll(KEYS.FARM_STOCKS),
  add: (stock: any) => addItem(KEYS.FARM_STOCKS, stock),
  update: (id: string, data: any) => updateItem(KEYS.FARM_STOCKS, id, data),
  delete: (id: string) => deleteItem(KEYS.FARM_STOCKS, id),
};

// ==================== ANNUAL STOCKS ====================

export const annualStocksStorage = {
  getAll: () => getAll(KEYS.ANNUAL_STOCKS),
  add: (stock: any) => addItem(KEYS.ANNUAL_STOCKS, stock),
  update: (id: string, data: any) => updateItem(KEYS.ANNUAL_STOCKS, id, data),
  delete: (id: string) => deleteItem(KEYS.ANNUAL_STOCKS, id),
};

// ==================== SUMMARIES ====================

export const getSummaries = {
  accounts: async () => {
    const accounts = await getAll<any>(KEYS.ACCOUNTS);
    const totalDebt = accounts.reduce((sum: number, a: any) => sum + (a.balance > 0 ? a.balance : 0), 0);
    const totalCredit = accounts.reduce((sum: number, a: any) => sum + (a.balance < 0 ? Math.abs(a.balance) : 0), 0);
    return {
      total_accounts: accounts.length,
      total_debt: totalDebt,
      total_credit: totalCredit,
      net_balance: totalDebt - totalCredit,
    };
  },
  
  machines: async () => {
    const machines = await getAll<any>(KEYS.MACHINES);
    const totalValue = machines.reduce((sum: number, m: any) => sum + (m.purchase_price || 0), 0);
    return {
      total_machines: machines.length,
      total_value: totalValue,
    };
  },
  
  machinePersons: async () => {
    const persons = await getAll<any>(KEYS.MACHINE_PERSONS);
    const receivables = await getAll<any>(KEYS.MACHINE_RECEIVABLES);
    const totalReceivables = receivables.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const totalPaid = receivables.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0);
    return {
      total_persons: persons.length,
      total_receivables: totalReceivables,
      total_paid: totalPaid,
      total_remaining: totalReceivables - totalPaid,
    };
  },
  
  farm: async () => {
    const fields = await getAll<any>(KEYS.FARM_FIELDS);
    const incomes = await getAll<any>(KEYS.FARM_INCOMES);
    const expenses = await getAll<any>(KEYS.FARM_EXPENSES);
    const harvests = await getAll<any>(KEYS.FARM_HARVESTS);
    const sales = await getAll<any>(KEYS.FARM_SALES);
    
    const totalDecare = fields.reduce((sum: number, f: any) => sum + (f.size_decare || 0), 0);
    const totalIncome = incomes.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
    const totalExpense = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalHarvest = harvests.reduce((sum: number, h: any) => sum + (h.quantity || 0), 0);
    const totalSales = sales.reduce((sum: number, s: any) => sum + (s.total_price || 0), 0);
    
    return {
      total_fields: fields.length,
      total_decare: totalDecare,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: totalIncome - totalExpense,
      total_harvest: totalHarvest,
      total_sales: totalSales,
    };
  },
  
  credits: async () => {
    const credits = await getAll<any>(KEYS.FARM_CREDITS);
    const total = credits.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
    const paid = credits.reduce((sum: number, c: any) => sum + (c.paid_amount || 0), 0);
    return {
      total_credits: total,
      total_paid: paid,
      remaining: total - paid,
    };
  },
};

// ==================== DATA BACKUP & RESTORE ====================

export const backupData = async (): Promise<string> => {
  const allData: Record<string, any> = {};
  for (const [name, key] of Object.entries(KEYS)) {
    allData[name] = await getAll(key);
  }
  return JSON.stringify(allData, null, 2);
};

export const restoreData = async (jsonData: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonData);
    for (const [name, key] of Object.entries(KEYS)) {
      if (data[name]) {
        await saveAll(key, data[name]);
      }
    }
    return true;
  } catch (error) {
    console.error('Restore error:', error);
    return false;
  }
};

export const clearAllData = async (): Promise<void> => {
  for (const key of Object.values(KEYS)) {
    await AsyncStorage.removeItem(key);
  }
};

export default {
  accounts: accountsStorage,
  transactions: transactionsStorage,
  machines: machinesStorage,
  machinePersons: machinePersonsStorage,
  machineFields: machineFieldsStorage,
  machineExpenses: machineExpensesStorage,
  machineReceivables: machineReceivablesStorage,
  farmFields: farmFieldsStorage,
  farmIncomes: farmIncomesStorage,
  farmExpenses: farmExpensesStorage,
  farmCredits: farmCreditsStorage,
  farmHarvests: farmHarvestsStorage,
  farmSales: farmSalesStorage,
  farmStocks: farmStocksStorage,
  annualStocks: annualStocksStorage,
  summaries: getSummaries,
  backup: backupData,
  restore: restoreData,
  clear: clearAllData,
};
