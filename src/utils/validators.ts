// ==================== SIMPLE VALIDATION (NO ZOD) ====================

export interface ValidationResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ==================== PERSON VALIDATION ====================

export function validatePersonCreate(data: unknown): ValidationResult {
  const d = data as Record<string, unknown>;
  
  if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
    return { success: false, error: 'Ad gereklidir' };
  }
  if (d.name.length > 100) {
    return { success: false, error: 'Ad çok uzun' };
  }
  
  return { success: true };
}

// ==================== MACHINE VALIDATION ====================

export function validateMachineCreate(data: unknown): ValidationResult {
  const d = data as Record<string, unknown>;
  
  if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
    return { success: false, error: 'Makine adı gereklidir' };
  }
  if (d.name.length > 100) {
    return { success: false, error: 'Ad çok uzun' };
  }
  
  return { success: true };
}

// ==================== TRANSACTION VALIDATION ====================

export function validateTransactionCreate(data: unknown): ValidationResult {
  const d = data as Record<string, unknown>;
  
  if (!d.person_id || typeof d.person_id !== 'string') {
    return { success: false, error: 'Kişi seçilmelidir' };
  }
  if (typeof d.amount !== 'number' || d.amount <= 0) {
    return { success: false, error: 'Tutar pozitif olmalıdır' };
  }
  
  return { success: true };
}

// ==================== EXPENSE VALIDATION ====================

export function validateExpenseCreate(data: unknown): ValidationResult {
  const d = data as Record<string, unknown>;
  
  if (!d.machine_id || typeof d.machine_id !== 'string') {
    return { success: false, error: 'Makine seçilmelidir' };
  }
  if (typeof d.amount !== 'number' || d.amount <= 0) {
    return { success: false, error: 'Tutar pozitif olmalıdır' };
  }
  
  return { success: true };
}

// ==================== SYNC VALIDATION WRAPPER ====================

export function validateSync<T>(
  validatorFn: (data: unknown) => ValidationResult,
  data: unknown
): ValidationResult {
  return validatorFn(data);
}

// Backward compatible schemas (just functions)
export const personCreateSchema = validatePersonCreate;
export const machineCreateSchema = validateMachineCreate;
export const transactionCreateSchema = validateTransactionCreate;
export const expenseCreateSchema = validateExpenseCreate;

// ==================== SIMPLE VALIDATORS ====================

export const isValidAmount = (value: string): boolean => {
  const num = parseFloat(value.replace(',', '.'));
  return !isNaN(num) && num > 0;
};

export const isValidPhone = (value: string): boolean => {
  if (!value) return true;
  const cleaned = value.replace(/[\s\-()]/g, '');
  return /^[0-9+]{10,15}$/.test(cleaned);
};

export const isValidDate = (value: string): boolean => {
  if (!value) return true;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

export const sanitizeAmount = (value: string): string => {
  return value.replace(/[^0-9.,]/g, '').replace(',', '.');
};
