import { create } from 'zustand';
import type {
  Account,
  Machine,
  Transaction,
  Expense,
  Field,
  Receivable,
  AccountsSummary,
  MachinesSummary,
  ReceivablesSummary,
  MachinePerson,
  MachineField,
  MachineReceivable,
  MachinePersonsSummary,
} from '../types';

// ==================== CARİ HESAP STORE ====================

interface AccountStore {
  accounts: Account[];
  transactions: Transaction[];
  summary: AccountsSummary | null;
  selectedAccount: Account | null;
  isLoading: boolean;
  error: string | null;

  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;

  setSummary: (summary: AccountsSummary | null) => void;
  setSelectedAccount: (account: Account | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAccountStore = create<AccountStore>((set) => ({
  accounts: [],
  transactions: [],
  summary: null,
  selectedAccount: null,
  isLoading: false,
  error: null,

  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((s) => ({ accounts: [account, ...s.accounts] })),
  updateAccount: (id, updates) => set((s) => ({
    accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  })),
  removeAccount: (id) => set((s) => ({
    accounts: s.accounts.filter((a) => a.id !== id),
    transactions: s.transactions.filter((t) => t.account_id !== id),
  })),

  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((s) => ({ transactions: [transaction, ...s.transactions] })),
  updateTransaction: (transaction) => set((s) => ({
    transactions: s.transactions.map((t) => (t.id === transaction.id ? transaction : t)),
  })),
  removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

  setSummary: (summary) => set({ summary }),
  setSelectedAccount: (selectedAccount) => set({ selectedAccount }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({
    accounts: [],
    transactions: [],
    summary: null,
    selectedAccount: null,
    isLoading: false,
    error: null,
  }),
}));

// ==================== MAKİNE STORE ====================

interface MachineStore {
  machines: Machine[];
  expenses: Expense[];
  receivables: Receivable[];
  fields: Field[];
  summary: MachinesSummary | null;
  receivablesSummary: ReceivablesSummary | null;
  selectedMachine: Machine | null;
  isLoading: boolean;
  error: string | null;

  setMachines: (machines: Machine[]) => void;
  addMachine: (machine: Machine) => void;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
  removeMachine: (id: string) => void;

  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;

  setReceivables: (receivables: Receivable[]) => void;
  addReceivable: (receivable: Receivable) => void;
  updateReceivable: (id: string, updates: Partial<Receivable>) => void;
  removeReceivable: (id: string) => void;

  setFields: (fields: Field[]) => void;
  addField: (field: Field) => void;
  removeField: (id: string) => void;

  setSummary: (summary: MachinesSummary | null) => void;
  setReceivablesSummary: (summary: ReceivablesSummary | null) => void;
  setSelectedMachine: (machine: Machine | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useMachineStore = create<MachineStore>((set) => ({
  machines: [],
  expenses: [],
  receivables: [],
  fields: [],
  summary: null,
  receivablesSummary: null,
  selectedMachine: null,
  isLoading: false,
  error: null,

  setMachines: (machines) => set({ machines }),
  addMachine: (machine) => set((s) => ({ machines: [machine, ...s.machines] })),
  updateMachine: (id, updates) => set((s) => ({
    machines: s.machines.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),
  removeMachine: (id) => set((s) => ({
    machines: s.machines.filter((m) => m.id !== id),
    expenses: s.expenses.filter((e) => e.machine_id !== id),
  })),

  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) => set((s) => ({ expenses: [expense, ...s.expenses] })),
  removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

  setReceivables: (receivables) => set({ receivables }),
  addReceivable: (receivable) => set((s) => ({ receivables: [receivable, ...s.receivables] })),
  updateReceivable: (id, updates) => set((s) => ({
    receivables: s.receivables.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),
  removeReceivable: (id) => set((s) => ({ receivables: s.receivables.filter((r) => r.id !== id) })),

  setFields: (fields) => set({ fields }),
  addField: (field) => set((s) => ({ fields: [field, ...s.fields] })),
  removeField: (id) => set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),

  setSummary: (summary) => set({ summary }),
  setReceivablesSummary: (receivablesSummary) => set({ receivablesSummary }),
  setSelectedMachine: (selectedMachine) => set({ selectedMachine }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({
    machines: [],
    expenses: [],
    receivables: [],
    fields: [],
    summary: null,
    receivablesSummary: null,
    selectedMachine: null,
    isLoading: false,
    error: null,
  }),
}));

// ==================== UI STORE ====================

type ModuleType = 'accounts' | 'machines' | 'farm';
type AccountsTab = 'summary' | 'list' | 'transactions' | 'reports';
type MachinesTab = 'summary' | 'list' | 'expenses' | 'receivables' | 'persons';
type FarmTab = 'summary' | 'fields' | 'incomes' | 'expenses' | 'credits' | 'harvests' | 'sales' | 'stocks' | 'annualStock';
type ThemeMode = 'light' | 'dark' | 'system';

interface TransactionFilters {
  account_id?: string;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
  machine_id?: string;
  is_paid?: boolean;
}

interface UIStore {
  activeModule: ModuleType;
  accountsTab: AccountsTab;
  machinesTab: MachinesTab;
  farmTab: FarmTab;
  isRefreshing: boolean;
  transactionFilters: TransactionFilters;
  chartData: any;
  themeMode: ThemeMode;
  lastDataRefresh: number;

  setActiveModule: (module: ModuleType) => void;
  setAccountsTab: (tab: AccountsTab) => void;
  setMachinesTab: (tab: MachinesTab) => void;
  setFarmTab: (tab: FarmTab) => void;
  setRefreshing: (refreshing: boolean) => void;
  setTransactionFilters: (filters: TransactionFilters) => void;
  setChartData: (data: any) => void;
  clearFilters: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLastDataRefresh: (timestamp: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeModule: 'accounts',
  accountsTab: 'summary',
  machinesTab: 'summary',
  farmTab: 'summary',
  isRefreshing: false,
  transactionFilters: {},
  chartData: null,
  themeMode: 'system',
  lastDataRefresh: Date.now(),

  setActiveModule: (activeModule) => set({ activeModule }),
  setAccountsTab: (accountsTab) => set({ accountsTab }),
  setMachinesTab: (machinesTab) => set({ machinesTab }),
  setFarmTab: (farmTab) => set({ farmTab }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  setTransactionFilters: (transactionFilters) => set({ transactionFilters }),
  setChartData: (chartData) => set({ chartData }),
  clearFilters: () => set({ transactionFilters: {} }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setLastDataRefresh: (lastDataRefresh) => set({ lastDataRefresh }),
}));

// ==================== MAKİNE KİŞİLER STORE ====================

interface MachinePersonStore {
  persons: MachinePerson[];
  machineFields: MachineField[];
  machineReceivables: MachineReceivable[];
  summary: MachinePersonsSummary | null;
  selectedPerson: MachinePerson | null;
  isLoading: boolean;
  error: string | null;

  setPersons: (persons: MachinePerson[]) => void;
  addPerson: (person: MachinePerson) => void;
  updatePerson: (id: string, updates: Partial<MachinePerson>) => void;
  removePerson: (id: string) => void;

  setMachineFields: (fields: MachineField[]) => void;
  addMachineField: (field: MachineField) => void;
  updateMachineField: (field: MachineField) => void;
  removeMachineField: (id: string) => void;

  setMachineReceivables: (receivables: MachineReceivable[]) => void;
  addMachineReceivable: (receivable: MachineReceivable) => void;
  updateMachineReceivable: (id: string, updates: Partial<MachineReceivable>) => void;
  removeMachineReceivable: (id: string) => void;

  setSummary: (summary: MachinePersonsSummary | null) => void;
  setSelectedPerson: (person: MachinePerson | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useMachinePersonStore = create<MachinePersonStore>((set) => ({
  persons: [],
  machineFields: [],
  machineReceivables: [],
  summary: null,
  selectedPerson: null,
  isLoading: false,
  error: null,

  setPersons: (persons) => set({ persons }),
  addPerson: (person) => set((s) => ({ persons: [person, ...s.persons] })),
  updatePerson: (id, updates) => set((s) => ({
    persons: s.persons.map((p) => (p.id === id ? { ...p, ...updates } : p)),
  })),
  removePerson: (id) => set((s) => ({
    persons: s.persons.filter((p) => p.id !== id),
    machineFields: s.machineFields.filter((f) => f.person_id !== id),
    machineReceivables: s.machineReceivables.filter((r) => r.person_id !== id),
  })),

  setMachineFields: (machineFields) => set({ machineFields }),
  addMachineField: (field) => set((s) => ({ machineFields: [field, ...s.machineFields] })),
  updateMachineField: (field) => set((s) => ({ 
    machineFields: s.machineFields.map((f) => (f.id === field.id ? field : f)) 
  })),
  removeMachineField: (id) => set((s) => ({ machineFields: s.machineFields.filter((f) => f.id !== id) })),

  setMachineReceivables: (machineReceivables) => set({ machineReceivables }),
  addMachineReceivable: (receivable) => set((s) => ({ machineReceivables: [receivable, ...s.machineReceivables] })),
  updateMachineReceivable: (id, updates) => set((s) => ({
    machineReceivables: s.machineReceivables.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),
  removeMachineReceivable: (id) => set((s) => ({ machineReceivables: s.machineReceivables.filter((r) => r.id !== id) })),

  setSummary: (summary) => set({ summary }),
  setSelectedPerson: (selectedPerson) => set({ selectedPerson }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({
    persons: [],
    machineFields: [],
    machineReceivables: [],
    summary: null,
    selectedPerson: null,
    isLoading: false,
    error: null,
  }),
}));

// ==================== ÇİFTLİK (FARM) STORE ====================

interface FarmStore {
  fields: any[];
  incomes: any[];
  expenses: any[];
  credits: any[];
  harvests: any[];
  sales: any[];
  stocks: any[];
  summary: any;
  isLoading: boolean;
  error: string | null;

  setFields: (fields: any[]) => void;
  addField: (field: any) => void;
  updateField: (id: string, updates: any) => void;
  removeField: (id: string) => void;

  setIncomes: (incomes: any[]) => void;
  addIncome: (income: any) => void;
  updateIncome: (id: string, updates: any) => void;
  removeIncome: (id: string) => void;

  setExpenses: (expenses: any[]) => void;
  addExpense: (expense: any) => void;
  updateExpense: (id: string, updates: any) => void;
  removeExpense: (id: string) => void;

  setCredits: (credits: any[]) => void;
  addCredit: (credit: any) => void;
  updateCredit: (credit: any) => void;
  removeCredit: (id: string) => void;

  setHarvests: (harvests: any[]) => void;
  addHarvest: (harvest: any) => void;
  updateHarvest: (id: string, updates: any) => void;
  removeHarvest: (id: string) => void;

  setSales: (sales: any[]) => void;
  addSale: (sale: any) => void;
  updateSale: (id: string, updates: any) => void;
  removeSale: (id: string) => void;

  setStocks: (stocks: any[]) => void;
  addStock: (stock: any) => void;
  updateStock: (id: string, updates: any) => void;
  removeStock: (id: string) => void;

  setSummary: (summary: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useFarmStore = create<FarmStore>((set) => ({
  fields: [],
  incomes: [],
  expenses: [],
  credits: [],
  harvests: [],
  sales: [],
  stocks: [],
  summary: null,
  isLoading: false,
  error: null,

  setFields: (fields) => set({ fields }),
  addField: (field) => set((s) => ({ fields: [field, ...s.fields] })),
  updateField: (id, updates) => set((s) => ({
    fields: s.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
  })),
  removeField: (id) => set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),

  setIncomes: (incomes) => set({ incomes }),
  addIncome: (income) => set((s) => ({ incomes: [income, ...s.incomes] })),
  updateIncome: (id, updates) => set((s) => ({
    incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
  })),
  removeIncome: (id) => set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),

  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) => set((s) => ({ expenses: [expense, ...s.expenses] })),
  updateExpense: (id, updates) => set((s) => ({
    expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
  })),
  removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

  setCredits: (credits) => set({ credits }),
  addCredit: (credit) => set((s) => ({ credits: [credit, ...s.credits] })),
  updateCredit: (credit) => set((s) => ({ credits: s.credits.map((c) => c.id === credit.id ? credit : c) })),
  removeCredit: (id) => set((s) => ({ credits: s.credits.filter((c) => c.id !== id) })),

  setHarvests: (harvests) => set({ harvests }),
  addHarvest: (harvest) => set((s) => ({ harvests: [harvest, ...s.harvests] })),
  updateHarvest: (id, updates) => set((s) => ({
    harvests: s.harvests.map((h) => (h.id === id ? { ...h, ...updates } : h)),
  })),
  removeHarvest: (id) => set((s) => ({ harvests: s.harvests.filter((h) => h.id !== id) })),

  setSales: (sales) => set({ sales }),
  addSale: (sale) => set((s) => ({ sales: [sale, ...s.sales] })),
  updateSale: (id, updates) => set((s) => ({
    sales: s.sales.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl)),
  })),
  removeSale: (id) => set((s) => ({ sales: s.sales.filter((s) => s.id !== id) })),

  setStocks: (stocks) => set({ stocks }),
  addStock: (stock) => set((s) => ({ stocks: [stock, ...s.stocks] })),
  updateStock: (id, updates) => set((s) => ({ stocks: s.stocks.map((st) => st.id === id ? { ...st, ...updates } : st) })),
  removeStock: (id) => set((s) => ({ stocks: s.stocks.filter((st) => st.id !== id) })),

  setSummary: (summary) => set({ summary }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({
    fields: [],
    incomes: [],
    expenses: [],
    credits: [],
    harvests: [],
    sales: [],
    stocks: [],
    summary: null,
    isLoading: false,
    error: null,
  }),
}));
