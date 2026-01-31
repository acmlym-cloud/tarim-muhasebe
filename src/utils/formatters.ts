// ==================== CURRENCY ====================

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// ==================== DATE ====================

export const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleString('tr-TR');
  } catch {
    return dateStr;
  }
};

// Bugünün tarihini dd/mm/yyyy formatında döndür
export const getTodayFormatted = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

// Bugünün tarihini yyyy-mm-dd formatında döndür (input için)
export const getTodayISO = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${year}-${month}-${day}`;
};

// dd/mm/yyyy -> yyyy-mm-dd (backend için)
export const parseToISO = (dateStr: string): string => {
  if (!dateStr) return '';
  // Zaten ISO formatındaysa direkt döndür
  if (dateStr.includes('-') && dateStr.length === 10) return dateStr;
  // dd/mm/yyyy formatını parse et
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// yyyy-mm-dd -> dd/mm/yyyy (görüntüleme için)
export const formatToDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  // Zaten dd/mm/yyyy formatındaysa direkt döndür
  if (dateStr.includes('/')) return dateStr;
  // ISO formatını parse et
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// ==================== LABELS ====================

export const accountTypeLabels: Record<string, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  worker: 'İşçi/Operatör',
  other: 'Diğer',
};

export const machineTypeLabels: Record<string, string> = {
  tractor: 'Traktör',
  harvester: 'Biçerdöver',
  seeder: 'Ekim Makinesi',
  sprayer: 'İlaçlama Makinesi',
  trailer: 'Römork',
  other: 'Diğer',
};

export const expenseTypeLabels: Record<string, string> = {
  fuel: 'Yakıt',
  maintenance: 'Bakım',
  repair: 'Tamir',
  insurance: 'Sigorta',
  tax: 'Vergi',
  labor: 'İşçilik',
  other: 'Diğer',
};

export const transactionTypeLabels: Record<string, string> = {
  debt: 'Borç',
  credit: 'Alacak',
};

export const receivableStatusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  partial: 'Kısmi Ödendi',
  paid: 'Ödendi',
  overdue: 'Gecikmiş',
};

export const receivableStatusColors: Record<string, string> = {
  pending: '#FFA000',
  partial: '#1976D2',
  paid: '#388E3C',
  overdue: '#D32F2F',
};
