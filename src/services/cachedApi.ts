import { api } from './api';
import { cacheService } from './cache';

// Cache TTL configurations (in milliseconds)
const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes - frequently changing data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - moderate change frequency
  LONG: 15 * 60 * 1000,      // 15 minutes - rarely changing data
  VERY_LONG: 60 * 60 * 1000, // 1 hour - static data
};

// Cache keys
const CACHE_KEYS = {
  ACCOUNTS: 'accounts',
  ACCOUNTS_SUMMARY: 'accounts_summary',
  TRANSACTIONS: 'transactions',
  MACHINES: 'machines',
  MACHINE_SUMMARY: 'machine_summary',
  EXPENSES: 'expenses',
  RECEIVABLES: 'receivables',
  MACHINE_PERSONS: 'machine_persons',
  MACHINE_PERSONS_SUMMARY: 'machine_persons_summary',
  MACHINE_FIELDS: 'machine_fields',
  MACHINE_RECEIVABLES: 'machine_receivables',
  FARM_FIELDS: 'farm_fields',
  FARM_INCOMES: 'farm_incomes',
  FARM_EXPENSES: 'farm_expenses',
  FARM_CREDITS: 'farm_credits',
  FARM_HARVESTS: 'farm_harvests',
  FARM_SALES: 'farm_sales',
  FARM_STOCKS: 'farm_stocks',
  FARM_SUMMARY: 'farm_summary',
  FARM_CREDIT_SUMMARY: 'farm_credit_summary',
  ANNUAL_STOCKS: 'annual_stocks',
  ANNUAL_STOCK_SUMMARY: 'annual_stock_summary',
  FIELD_STOCK_USAGE: 'field_stock_usage',
  YEAR_SUMMARY: 'year_summary',
  CHART_DATA: 'chart_data',
};

export const cachedApi = {
  // ==================== ACCOUNTS ====================
  
  async getAccounts(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.ACCOUNTS,
      () => api.getAccounts(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getAccountsSummary(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.ACCOUNTS_SUMMARY,
      () => api.getAccountsSummary(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getTransactions(filters?: any, forceRefresh = false) {
    const key = filters ? `${CACHE_KEYS.TRANSACTIONS}_${JSON.stringify(filters)}` : CACHE_KEYS.TRANSACTIONS;
    return cacheService.fetchWithCache(
      key,
      () => api.getTransactions(filters),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  // Invalidate accounts cache on mutation
  async invalidateAccounts() {
    await cacheService.invalidateByPrefix('accounts');
    await cacheService.invalidate(CACHE_KEYS.TRANSACTIONS);
  },

  // ==================== MACHINES ====================

  async getMachines(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.MACHINES,
      () => api.getMachines(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getMachineSummary(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.MACHINE_SUMMARY,
      () => api.getMachinesSummary(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getExpenses(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.EXPENSES,
      () => api.getExpenses(),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  async getMachinePersons(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.MACHINE_PERSONS,
      () => api.getMachinePersons(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getMachinePersonsSummary(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.MACHINE_PERSONS_SUMMARY,
      () => api.getMachinePersonsSummary(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getMachineFields(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.MACHINE_FIELDS,
      () => api.getMachineFields(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getMachineReceivables(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.MACHINE_RECEIVABLES,
      () => api.getMachineReceivables(),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  async invalidateMachines() {
    await cacheService.invalidateByPrefix('machine');
    await cacheService.invalidate(CACHE_KEYS.EXPENSES);
  },

  // ==================== FARM ====================

  async getFarmFields(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_FIELDS,
      () => api.getFarmFields(),
      { ttl: CACHE_TTL.LONG, forceRefresh }
    );
  },

  async getFarmIncomes(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_INCOMES,
      () => api.getFarmIncomes(),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  async getFarmExpenses(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_EXPENSES,
      () => api.getFarmExpenses(),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  async getFarmCredits(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_CREDITS,
      () => api.getFarmCredits(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getFarmHarvests(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_HARVESTS,
      () => api.getFarmHarvests(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getFarmSales(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_SALES,
      () => api.getFarmSales(),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  async getFarmStocks(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_STOCKS,
      () => api.getFarmStocks(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getFarmSummary(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_SUMMARY,
      () => api.getFarmSummary(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getFarmCreditSummary(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FARM_CREDIT_SUMMARY,
      () => api.getCreditSummary(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getAnnualStocks(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.ANNUAL_STOCKS,
      () => api.getAnnualStocks(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getAnnualStockSummary(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.ANNUAL_STOCK_SUMMARY,
      () => api.getAnnualStockSummary(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getFieldStockUsage(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.FIELD_STOCK_USAGE,
      () => api.getFieldStockUsage(),
      { ttl: CACHE_TTL.SHORT, forceRefresh }
    );
  },

  async invalidateFarm() {
    await cacheService.invalidateByPrefix('farm');
    await cacheService.invalidateByPrefix('annual');
    await cacheService.invalidateByPrefix('field');
  },

  // ==================== REPORTS ====================

  async getYearSummary(year: number, forceRefresh = false) {
    return cacheService.fetchWithCache(
      `${CACHE_KEYS.YEAR_SUMMARY}_${year}`,
      () => api.getYearSummary(year),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  async getChartData(forceRefresh = false) {
    return cacheService.fetchWithCache(
      CACHE_KEYS.CHART_DATA,
      () => api.getChartData(),
      { ttl: CACHE_TTL.MEDIUM, forceRefresh }
    );
  },

  // ==================== CACHE MANAGEMENT ====================

  async invalidateAll() {
    await cacheService.clearAll();
  },

  async getCacheStats() {
    return cacheService.getStats();
  },
};

export default cachedApi;
