import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  LogBox,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

// React.Fragment uyarısını gizle (expo-router kaynaklı)
LogBox.ignoreLogs([
  'Invalid prop `style` supplied to `React.Fragment`',
  'React.Fragment can only have `key` and `children` props',
]);

// Cross-platform confirm dialog
const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(
      title, 
      message, 
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet, Sil', style: 'destructive', onPress: () => onConfirm() }
      ],
      { cancelable: true }
    );
  }
};

const showSuccess = (message: string) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Başarılı', message);
  }
};

// Stores
import { useAccountStore, useMachineStore, useUIStore, useMachinePersonStore, useFarmStore } from '../src/stores';
import { api } from '../src/services';
import { 
  lightColors, 
  spacing, 
  typography, 
  borders,
  scale,
  moderateScale,
  verticalScale,
  screen,
  layout,
} from '../src/constants/theme';
import {
  formatCurrency,
  formatDate,
  getTodayISO,
  getTodayFormatted,
  parseToISO,
  accountTypeLabels,
  machineTypeLabels,
  expenseTypeLabels,
  receivableStatusLabels,
  receivableStatusColors,
} from '../src/utils/formatters';
import type {
  Account,
  Machine,
  Transaction,
  Expense,
  Receivable,
  Field,
  AccountType,
  MachineType,
  ExpenseType,
  TransactionType,
  MachinePerson,
  MachineField,
  MachineReceivable,
} from '../src/types';

// Screen dimensions for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
const isLargePhone = SCREEN_WIDTH >= 414;

// Default colors for static components (memo components use this)
const colors = lightColors;

// Çiftlik label'ları
const farmIncomeTypeLabels: Record<string, string> = {
  satis: 'Satış',
  hasat: 'Hasat',
  destek: 'Destek',
  kira: 'Kira',
  diger: 'Diğer',
};

const farmExpenseTypeLabels: Record<string, string> = {
  tohum: 'Tohum',
  gubre: 'Gübre',
  ilac: 'İlaç',
  yakit: 'Yakıt',
  iscilik: 'İşçilik',
  kira: 'Kira',
  elektrik: 'Elektrik',
  su: 'Su',
  bakim: 'Bakım',
  diger: 'Diğer',
};

const creditStatusLabels: Record<string, string> = {
  aktif: 'Aktif',
  odendi: 'Ödendi',
  gecikti: 'Gecikti',
};

const creditStatusColors: Record<string, string> = {
  aktif: '#3B82F6',
  odendi: '#10B981',
  gecikti: '#EF4444',
};

const stockUnitLabels: Record<string, string> = {
  kg: 'Kg',
  ton: 'Ton',
  adet: 'Adet',
  litre: 'Litre',
  cuval: 'Çuval',
};

const screenWidth = Dimensions.get('window').width;

// ==================== MEMOIZED COMPONENTS ====================

const AccountCard = memo(({ item, onPress }: { item: Account; onPress: (a: Account) => void }) => {
  const balance = item.balance || 0;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: lightColors.primary }]}>
          <Ionicons name="person" size={20} color={lightColors.textOnPrimary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>{accountTypeLabels[item.account_type] || 'Genel'}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.balanceText, { color: balance >= 0 ? lightColors.credit : lightColors.debt }]}>
          {formatCurrency(Math.abs(balance))}
        </Text>
        <Text style={styles.balanceLabel}>{balance >= 0 ? 'Alacak' : 'Borç'}</Text>
      </View>
    </TouchableOpacity>
  );
});

const MachineCard = memo(({ item, onPress }: { item: Machine; onPress: (m: Machine) => void }) => {
  const totalIncome = item.total_income || 0;
  const totalExpenses = item.total_expenses || 0;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: lightColors.secondary }]}>
          <Ionicons name="construct" size={20} color={lightColors.textOnPrimary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>{machineTypeLabels[item.type] || item.type || 'Makine'}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.balanceText, { color: lightColors.income }]}>
          {formatCurrency(totalIncome)}
        </Text>
        <Text style={[styles.smallText, { color: lightColors.expense }]}>
          Gider: {formatCurrency(totalExpenses)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const TransactionCard = memo(({ item, onEdit, onDelete, onMarkPaid }: { item: Transaction; onEdit: (item: Transaction) => void; onDelete: (id: string) => void; onMarkPaid: (id: string) => void }) => {
  const isCredit = item.transaction_type === 'credit';
  const isPaid = item.is_paid;
  return (
    <View style={[styles.transactionCard, isPaid && { opacity: 0.6, backgroundColor: '#f0f0f0' }]}>
      <TouchableOpacity style={styles.transactionMainArea} onPress={() => onEdit(item)} activeOpacity={0.8}>
        <View style={[styles.transactionIcon, { backgroundColor: isPaid ? '#9CA3AF' : (isCredit ? lightColors.credit : lightColors.debt) }]}>
          <Ionicons name={isPaid ? 'checkmark' : (isCredit ? 'arrow-down' : 'arrow-up')} size={16} color="#FFF" />
        </View>
        <View style={styles.transactionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.transactionName}>{item.account_name}</Text>
            {isPaid && <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>ÖDENDİ</Text></View>}
          </View>
          <Text style={styles.transactionDesc}>{item.description || (isCredit ? 'Alacak' : 'Borç')}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: isPaid ? '#9CA3AF' : (isCredit ? lightColors.credit : lightColors.debt), textDecorationLine: isPaid ? 'line-through' : 'none' }]}>
          {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
      <View style={styles.cardActionButtons}>
        <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: isPaid ? '#10B981' : '#6B7280' }]} onPress={() => onMarkPaid(item.id)}>
          <Ionicons name={isPaid ? 'close' : 'checkmark'} size={14} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: lightColors.secondary }]} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={14} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: lightColors.error }]} onPress={() => onDelete(item.id)}>
          <Ionicons name="trash" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ExpenseCard = memo(({ item, onEdit, onDelete }: { item: Expense; onEdit: (item: Expense) => void; onDelete: (id: string) => void }) => (
  <View style={styles.transactionCard}>
    <TouchableOpacity style={styles.transactionMainArea} onPress={() => onEdit(item)} activeOpacity={0.8}>
      <View style={[styles.transactionIcon, { backgroundColor: lightColors.expense }]}>
        <Ionicons name="receipt" size={16} color="#FFF" />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionName}>{item.machine_name}</Text>
        <Text style={styles.transactionDesc}>{expenseTypeLabels[item.expense_type] || item.expense_type}</Text>
        {item.description ? <Text style={[styles.transactionDesc, { color: lightColors.textSecondary, fontSize: 11 }]}>{item.description}</Text> : null}
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: lightColors.expense }]}>
        -{formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
    <View style={styles.cardActionButtons}>
      <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: lightColors.secondary }]} onPress={() => onEdit(item)}>
        <Ionicons name="pencil" size={14} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: lightColors.error }]} onPress={() => onDelete(item.id)}>
        <Ionicons name="trash" size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
  </View>
));

const ReceivableCard = memo(({ item, onPress }: { item: Receivable; onPress: (r: Receivable) => void }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
    <View style={styles.cardLeft}>
      <View style={[styles.avatar, { backgroundColor: receivableStatusColors[item.status] || lightColors.warning }]}>
        <Ionicons name="document-text" size={20} color="#FFF" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.account_name}</Text>
        <Text style={styles.cardSubtitle}>
          {item.field_name ? `${item.field_name} - ` : ''}{receivableStatusLabels[item.status]}
        </Text>
      </View>
    </View>
    <View style={styles.cardRight}>
      <Text style={[styles.balanceText, { color: lightColors.income }]}>
        {formatCurrency(item.remaining_amount)}
      </Text>
      <Text style={styles.smallText}>/ {formatCurrency(item.amount)}</Text>
    </View>
  </TouchableOpacity>
));

const FieldCard = memo(({ item, onPress }: { item: Field; onPress: (f: Field) => void }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
    <View style={styles.cardLeft}>
      <View style={[styles.avatar, { backgroundColor: lightColors.accent }]}>
        <Ionicons name="leaf" size={20} color="#FFF" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>
          {item.size_decare ? `${item.size_decare} dönüm` : ''} {item.account_name ? `- ${item.account_name}` : ''}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
));

// ==================== MAKİNE KİŞİ KARTLARI ====================

const MachinePersonCard = memo(({ item, onPress }: { item: MachinePerson; onPress: (p: MachinePerson) => void }) => {
  const balance = item.balance || 0;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: '#8B5CF6' }]}>
          <Ionicons name="person-circle" size={22} color="#FFF" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>
            {item.field_count || 0} tarla • {item.phone || 'Tel yok'}
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.balanceText, { color: balance > 0 ? lightColors.warning : lightColors.credit }]}>
          {formatCurrency(balance)}
        </Text>
        <Text style={styles.balanceLabel}>{balance > 0 ? 'Alacak' : 'Ödendi'}</Text>
      </View>
    </TouchableOpacity>
  );
});

const MachineFieldCard = memo(({ item, onPress }: { item: MachineField; onPress: (f: MachineField) => void }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
    <View style={styles.cardLeft}>
      <View style={[styles.avatar, { backgroundColor: '#10B981' }]}>
        <Ionicons name="map" size={20} color="#FFF" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>
          {item.person_name} • {item.size_decare ? `${item.size_decare} dönüm` : ''} {item.crop ? `• ${item.crop}` : ''}
        </Text>
        {item.harvest_date && (
          <Text style={[styles.cardSubtitle, { color: lightColors.warning }]}>
            Hasat: {formatDate(item.harvest_date)}
          </Text>
        )}
      </View>
    </View>
  </TouchableOpacity>
));

// ==================== SUMMARY CARDS ====================

const SummaryCard = ({ title, items, color }: { title: string; items: { label: string; value: string; color?: string }[]; color: string }) => (
  <View style={[styles.summaryCard, { borderLeftColor: color }]}>
    <Text style={styles.summaryTitle}>{title}</Text>
    {items.map((item, idx) => (
      <View key={idx} style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{item.label}</Text>
        <Text style={[styles.summaryValue, { color: item.color || lightColors.text }]}>{item.value}</Text>
      </View>
    ))}
  </View>
);

const EmptyState = ({ icon, title, message }: { icon: string; title: string; message: string }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon as any} size={64} color={lightColors.textSecondary} />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
  </View>
);

// ==================== MAIN APP ====================

export default function App() {
  const accountStore = useAccountStore();
  const machineStore = useMachineStore();
  const machinePersonStore = useMachinePersonStore();
  const uiStore = useUIStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [accountModal, setAccountModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState(false);
  const [machineModal, setMachineModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [receivableModal, setReceivableModal] = useState(false);
  const [fieldModal, setFieldModal] = useState(false);
  const [machinePersonModal, setMachinePersonModal] = useState(false);
  const [machineFieldModal, setMachineFieldModal] = useState(false);
  const [editAccountModal, setEditAccountModal] = useState(false);
  const [editTransactionModal, setEditTransactionModal] = useState(false);
  // Çiftlik modalları
  const [farmFieldModal, setFarmFieldModal] = useState(false);
  const [farmIncomeModal, setFarmIncomeModal] = useState(false);
  const [farmExpenseModal, setFarmExpenseModal] = useState(false);
  const [farmCreditModal, setFarmCreditModal] = useState(false);
  const [farmHarvestModal, setFarmHarvestModal] = useState(false);
  const [farmSaleModal, setFarmSaleModal] = useState(false);
  const [farmStockModal, setFarmStockModal] = useState(false);
  const [machineReceivableModal, setMachineReceivableModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [detailModal, setDetailModal] = useState<{ type: string; data: any } | null>(null);
  const [selectedReceivableForPayment, setSelectedReceivableForPayment] = useState<any>(null);
  const [receivablePayments, setReceivablePayments] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: getTodayFormatted(), description: '' });

  // Kişi bazlı toplu ödeme state'leri
  const [bulkPaymentModal, setBulkPaymentModal] = useState(false);
  const [selectedPersonForBulkPayment, setSelectedPersonForBulkPayment] = useState<MachinePerson | null>(null);
  const [bulkPaymentForm, setBulkPaymentForm] = useState({ amount: '', payment_date: getTodayFormatted(), description: '' });
  const [bulkPaymentResult, setBulkPaymentResult] = useState<any>(null);

  // Toplu alacak girişi state'leri
  const [bulkReceivableModal, setBulkReceivableModal] = useState(false);
  const [selectedPersonForBulkReceivable, setSelectedPersonForBulkReceivable] = useState<string>('');
  const [bulkReceivableItems, setBulkReceivableItems] = useState<Array<{
    field_id: string;
    machine_id: string;
    amount: string;
    description: string;
    work_date: string;
    decare_count: string;
    price_per_decare: string;
  }>>([{ field_id: '', machine_id: '', amount: '', description: '', work_date: getTodayFormatted(), decare_count: '', price_per_decare: '' }]);

  // Kişi düzenleme state'i
  const [editingMachinePerson, setEditingMachinePerson] = useState<MachinePerson | null>(null);

  // Form states
  const [accountForm, setAccountForm] = useState({ name: '', phone: '', account_type: 'customer' as AccountType });
  const [editAccountForm, setEditAccountForm] = useState<{ id: string; name: string; phone: string; account_type: AccountType } | null>(null);
  const [editTransactionForm, setEditTransactionForm] = useState<any>(null);
  const [transactionForm, setTransactionForm] = useState({ account_id: '', amount: '', transaction_type: 'credit' as TransactionType, description: '' });
  const [machineForm, setMachineForm] = useState({ name: '', type: 'tractor' as MachineType, plate_number: '' });
  const [expenseForm, setExpenseForm] = useState({ machine_id: '', amount: '', expense_type: '', description: '', date: getTodayFormatted() });
  const [editingMachineExpenseId, setEditingMachineExpenseId] = useState<string | null>(null);
  const [receivableForm, setReceivableForm] = useState({ account_id: '', machine_id: '', field_id: '', amount: '', description: '', decare_count: '', price_per_decare: '' });
  const [fieldForm, setFieldForm] = useState({ name: '', size_decare: '', account_id: '' });
  const [machinePersonForm, setMachinePersonForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [machineFieldForm, setMachineFieldForm] = useState({ person_id: '', name: '', size_decare: '', crop: '', harvest_date: '', location: '', notes: '' });
  const [editingMachineField, setEditingMachineField] = useState<any>(null);
  // Çiftlik form states
  const [farmFieldForm, setFarmFieldForm] = useState({ name: '', size_decare: '', location: '', crop: '', notes: '' });
  const [farmIncomeForm, setFarmIncomeForm] = useState({ field_id: '', income_type: '', amount: '', description: '', date: getTodayFormatted() });
  const [farmExpenseForm, setFarmExpenseForm] = useState({ field_id: '', expense_type: '', amount: '', description: '', date: getTodayFormatted() });
  const [farmCreditForm, setFarmCreditForm] = useState({ bank_name: '', amount: '', interest_rate: '', interest_type: 'simple', start_date: getTodayFormatted(), due_date: '', term_months: '', notes: '' });
  const [farmHarvestForm, setFarmHarvestForm] = useState({ field_id: '', crop_name: '', quantity: '', unit: 'kg', harvest_date: getTodayFormatted(), notes: '' });
  const [farmSaleForm, setFarmSaleForm] = useState({ field_id: '', crop_name: '', quantity: '', unit: 'kg', unit_price: '', buyer_name: '', sale_date: getTodayFormatted(), notes: '' });
  const [farmStockForm, setFarmStockForm] = useState({ item_name: '', quantity: '', unit: 'kg', category: '', notes: '' });
  const [machineReceivableForm, setMachineReceivableForm] = useState({ person_id: '', field_id: '', machine_id: '', amount: '', description: '', due_date: getTodayFormatted(), price_per_decare: '', discount_type: '', discount_value: '' });
  const [editingMachineReceivableId, setEditingMachineReceivableId] = useState<string | null>(null);

  // Çiftlik düzenleme state'leri
  const [editingFarmFieldId, setEditingFarmFieldId] = useState<string | null>(null);
  const [editingFarmIncomeId, setEditingFarmIncomeId] = useState<string | null>(null);
  const [editingFarmExpenseId, setEditingFarmExpenseId] = useState<string | null>(null);
  const [editingFarmHarvestId, setEditingFarmHarvestId] = useState<string | null>(null);
  const [editingFarmSaleId, setEditingFarmSaleId] = useState<string | null>(null);
  const [editingFarmStockId, setEditingFarmStockId] = useState<string | null>(null);

  // Kredi özet state
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);

  // Yıl özeti state
  const [yearSummary, setYearSummary] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Yıllık stok state'leri
  const [annualStocks, setAnnualStocks] = useState<any[]>([]);
  const [annualStockForm, setAnnualStockForm] = useState({ stock_type: '', name: '', quantity: '', unit: 'kg', unit_price: '', purchase_date: getTodayFormatted(), notes: '' });
  const [fieldStockUsages, setFieldStockUsages] = useState<any[]>([]);
  const [fieldStockUsageForm, setFieldStockUsageForm] = useState({ field_id: '', stock_id: '', used_quantity: '', usage_date: getTodayFormatted(), notes: '', add_to_expense: false });
  const [annualStockSummary, setAnnualStockSummary] = useState<any>(null);
  const [showAnnualStockModal, setShowAnnualStockModal] = useState(false);
  const [showFieldStockUsageModal, setShowFieldStockUsageModal] = useState(false);
  const [editingAnnualStock, setEditingAnnualStock] = useState<any>(null);
  const [editingFieldStockUsage, setEditingFieldStockUsage] = useState<any>(null);

  // Tarla bazlı özet state
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [fieldSummary, setFieldSummary] = useState<any>(null);
  const [fieldSummaryLoading, setFieldSummaryLoading] = useState(false);

  // Yedekleme state'leri
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Bugünün tarihi helper (dd/mm/yyyy formatında)
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Yedekleme fonksiyonları
  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      const backup = await api.exportBackup();
      
      // JSON olarak indir (web için)
      const dataStr = JSON.stringify(backup, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileName = `farmapp_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', exportFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setLastBackupDate(new Date().toLocaleString('tr-TR'));
      showSuccess('Yedek dosyası oluşturuldu');
    } catch (e: any) {
      Alert.alert('Hata', 'Yedekleme başarısız: ' + e.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          
          setBackupLoading(true);
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const content = event.target?.result as string;
              const backup = JSON.parse(content);
              
              if (!backup.data) {
                Alert.alert('Hata', 'Geçersiz yedek dosyası formatı');
                return;
              }
              
              const result = await api.importBackup(backup.data, 'skip');
              showSuccess(`İçe aktarma tamamlandı. ${Object.values(result.imported).reduce((a: any, b: any) => a + b, 0)} kayıt eklendi.`);
              
              // Verileri yeniden yükle
              loadData();
              loadMachinesData();
              loadFarmData();
            } catch (parseError: any) {
              Alert.alert('Hata', 'Dosya okunamadı: ' + parseError.message);
            } finally {
              setBackupLoading(false);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      } else {
        Alert.alert('Bilgi', 'Mobil cihazlarda içe aktarma için dosya seçici kullanılacak');
      }
    } catch (e: any) {
      Alert.alert('Hata', 'İçe aktarma başarısız: ' + e.message);
      setBackupLoading(false);
    }
  };

  // Farm store
  const farmStore = useFarmStore();
  
  // Kişi özeti için seçili kişi state'i
  const [selectedPersonForSummary, setSelectedPersonForSummary] = useState<string>('');
  
  // Dekar özeti hesapla - ALACAK KAYITLARINDAN (receivables)
  const decareSummary = useMemo(() => {
    // Toplam dekar = tüm alacak kayıtlarındaki decare_count toplamı
    const totalDecare = machinePersonStore.machineReceivables.reduce((sum, rec) => sum + (rec.decare_count || 0), 0);
    
    // Kişi bazlı dekar hesapla - alacak kayıtlarından
    const personDecares = machinePersonStore.persons.map(person => {
      const personReceivables = machinePersonStore.machineReceivables.filter(r => r.person_id === person.id);
      const totalPersonDecare = personReceivables.reduce((sum, r) => sum + (r.decare_count || 0), 0);
      const receivableCount = personReceivables.length;
      return { 
        name: person.name, 
        decare: totalPersonDecare, 
        fieldCount: receivableCount // Alacak sayısı = iş sayısı
      };
    }).filter(p => p.decare > 0).sort((a, b) => b.decare - a.decare);
    
    return { totalDecare, personDecares };
  }, [machinePersonStore.machineReceivables, machinePersonStore.persons]);
  
  // Seçilen kişinin özet bilgileri - ALACAK KAYITLARINDAN
  const selectedPersonSummary = useMemo(() => {
    if (!selectedPersonForSummary) return null;
    
    const person = machinePersonStore.persons.find(p => p.id === selectedPersonForSummary);
    if (!person) return null;
    
    // Kişinin alacakları
    const personReceivables = machinePersonStore.machineReceivables.filter(r => r.person_id === selectedPersonForSummary);
    
    // Alacaklardan toplam dekar hesapla
    const totalDecare = personReceivables.reduce((sum, r) => sum + (r.decare_count || 0), 0);
    
    // Nakdi durum hesapla
    const totalReceivable = personReceivables.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPaid = personReceivables.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
    const remaining = totalReceivable - totalPaid;
    
    return {
      person,
      totalDecare,
      fieldCount: personReceivables.length, // Alacak sayısı = iş sayısı
      totalReceivable,
      totalPaid,
      remaining,
      receivableCount: personReceivables.length
    };
  }, [selectedPersonForSummary, machinePersonStore.persons, machinePersonStore.machineReceivables]);

  // ==================== DATA LOADING ====================

  const loadAccountsData = useCallback(async () => {
    try {
      const [accounts, transactions, summary, chartData] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
        api.getAccountsSummary(),
        api.getChartData().catch(() => null),
      ]);
      accountStore.setAccounts(accounts);
      accountStore.setTransactions(transactions);
      accountStore.setSummary(summary);
      if (chartData) {
        uiStore.setChartData(chartData);
      }
    } catch (e) {
      console.error('Accounts load error:', e);
    }
  }, []);

  const loadMachinesData = useCallback(async () => {
    try {
      const [machines, expenses, summary] = await Promise.all([
        api.getMachines(),
        api.getExpenses(),
        api.getMachinesSummary(),
      ]);
      machineStore.setMachines(machines);
      machineStore.setExpenses(expenses);
      machineStore.setSummary(summary);
    } catch (e) {
      console.error('Machines load error:', e);
    }
  }, []);

  const loadMachinePersonsData = useCallback(async () => {
    try {
      const [persons, machineFields, machineReceivables, summary] = await Promise.all([
        api.getMachinePersons(),
        api.getMachineFields(),
        api.getMachineReceivables(),
        api.getMachinePersonsSummary(),
      ]);
      machinePersonStore.setPersons(persons);
      machinePersonStore.setMachineFields(machineFields);
      machinePersonStore.setMachineReceivables(machineReceivables);
      machinePersonStore.setSummary(summary);
    } catch (e) {
      console.error('Machine persons load error:', e);
    }
  }, []);

  const loadFarmData = useCallback(async () => {
    try {
      const [fields, incomes, expenses, credits, harvests, sales, stocks, summary] = await Promise.all([
        api.getFarmFields(),
        api.getFarmIncomes(),
        api.getFarmExpenses(),
        api.getFarmCredits(),
        api.getFarmHarvests(),
        api.getFarmSales(),
        api.getFarmStocks(),
        api.getFarmSummary(),
      ]);
      farmStore.setFields(fields);
      farmStore.setIncomes(incomes);
      farmStore.setExpenses(expenses);
      farmStore.setCredits(credits);
      farmStore.setHarvests(harvests);
      farmStore.setSales(sales);
      farmStore.setStocks(stocks);
      farmStore.setSummary(summary);
    } catch (e) {
      console.error('Farm load error:', e);
    }
  }, []);

  // Tarla bazlı özet yükleme
  const loadFieldSummary = useCallback(async (fieldId: string) => {
    if (!fieldId) {
      setFieldSummary(null);
      return;
    }
    setFieldSummaryLoading(true);
    try {
      const summary = await api.getFarmFieldSummary(fieldId);
      setFieldSummary(summary);
    } catch (e) {
      console.error('Field summary load error:', e);
      setFieldSummary(null);
    }
    setFieldSummaryLoading(false);
  }, []);

  // Tarla seçildiğinde özeti yükle
  useEffect(() => {
    if (selectedFieldId) {
      loadFieldSummary(selectedFieldId);
    }
  }, [selectedFieldId, loadFieldSummary]);

  // Yıllık stok verilerini yükle
  const loadAnnualStockData = useCallback(async () => {
    try {
      const [stocks, usages, summary] = await Promise.all([
        api.getAnnualStocks(),
        api.getFieldStockUsage(),
        api.getAnnualStockSummary()
      ]);
      setAnnualStocks(stocks);
      setFieldStockUsages(usages);
      setAnnualStockSummary(summary);
    } catch (e) {
      console.error('Annual stock load error:', e);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadAccountsData(), loadMachinesData(), loadMachinePersonsData(), loadFarmData(), loadAnnualStockData()]);
    setLoading(false);
  }, [loadAccountsData, loadMachinesData, loadMachinePersonsData, loadFarmData, loadAnnualStockData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
    loadCreditSummary();
    loadYearSummary();
  }, []);

  // Web platformu kontrolü - Web'de sadece makine modülü aktif olsun
  const isWebPlatform = Platform.OS === 'web';
  useEffect(() => {
    if (isWebPlatform && uiStore.activeModule !== 'machines') {
      uiStore.setActiveModule('machines');
    }
  }, [isWebPlatform, uiStore.activeModule]);

  // ==================== CRUD HANDLERS ====================

  const handleCreateAccount = async () => {
    if (!accountForm.name.trim()) {
      Alert.alert('Hata', 'Cari hesap adı gereklidir');
      return;
    }
    try {
      const account = await api.createAccount(accountForm);
      accountStore.addAccount(account);
      setAccountModal(false);
      setAccountForm({ name: '', phone: '', account_type: 'customer' });
      loadAccountsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateTransaction = async () => {
    if (!transactionForm.account_id || !transactionForm.amount) {
      Alert.alert('Hata', 'Cari hesap ve tutar gereklidir');
      return;
    }
    try {
      const transaction = await api.createTransaction({
        ...transactionForm,
        amount: parseFloat(transactionForm.amount),
      });
      accountStore.addTransaction(transaction);
      setTransactionModal(false);
      setTransactionForm({ account_id: '', amount: '', transaction_type: 'credit', description: '' });
      loadAccountsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateMachine = async () => {
    if (!machineForm.name.trim()) {
      Alert.alert('Hata', 'Makine adı gereklidir');
      return;
    }
    try {
      const machine = await api.createMachine(machineForm);
      machineStore.addMachine(machine);
      setMachineModal(false);
      setMachineForm({ name: '', type: 'tractor', plate_number: '' });
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.machine_id || !expenseForm.amount) {
      Alert.alert('Hata', 'Makine ve tutar gereklidir');
      return;
    }
    try {
      const data = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        date: parseToISO(expenseForm.date),
      };
      
      if (editingMachineExpenseId) {
        // Güncelleme
        const updated = await api.updateExpense(editingMachineExpenseId, data);
        machineStore.updateExpense(editingMachineExpenseId, updated);
        showSuccess('Gider güncellendi');
      } else {
        // Yeni kayıt
        const expense = await api.createExpense(data);
        machineStore.addExpense(expense);
        showSuccess('Gider eklendi');
      }
      
      setExpenseModal(false);
      setExpenseForm({ machine_id: '', amount: '', expense_type: '', description: '', date: getTodayFormatted() });
      setEditingMachineExpenseId(null);
      loadMachinesData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateReceivable = async () => {
    if (!receivableForm.account_id || !receivableForm.amount) {
      Alert.alert('Hata', 'Cari hesap ve tutar gereklidir');
      return;
    }
    try {
      const receivable = await api.createReceivable({
        account_id: receivableForm.account_id,
        machine_id: receivableForm.machine_id || undefined,
        field_id: receivableForm.field_id || undefined,
        amount: parseFloat(receivableForm.amount),
        description: receivableForm.description,
        decare_count: receivableForm.decare_count ? parseFloat(receivableForm.decare_count) : undefined,
        price_per_decare: receivableForm.price_per_decare ? parseFloat(receivableForm.price_per_decare) : undefined,
      });
      machineStore.addReceivable(receivable);
      setReceivableModal(false);
      setReceivableForm({ account_id: '', machine_id: '', field_id: '', amount: '', description: '', decare_count: '', price_per_decare: '' });
      loadMachinesData();
      loadAccountsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateField = async () => {
    if (!fieldForm.name.trim()) {
      Alert.alert('Hata', 'Tarla adı gereklidir');
      return;
    }
    try {
      const field = await api.createField({
        name: fieldForm.name,
        size_decare: fieldForm.size_decare ? parseFloat(fieldForm.size_decare) : undefined,
        account_id: fieldForm.account_id || undefined,
      });
      machineStore.addField(field);
      setFieldModal(false);
      setFieldForm({ name: '', size_decare: '', account_id: '' });
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    showConfirm('Sil', 'Bu işlemi silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteTransaction(id);
        accountStore.removeTransaction(id);
        loadAccountsData();
        showSuccess('İşlem silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleMarkTransactionPaid = async (id: string) => {
    try {
      const updatedTransaction = await api.markTransactionPaid(id);
      accountStore.updateTransaction(updatedTransaction);
      loadAccountsData();
      showSuccess(updatedTransaction.is_paid ? 'İşlem ödendi olarak işaretlendi' : 'Ödendi işareti kaldırıldı');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditTransactionForm({
      id: transaction.id,
      account_id: transaction.account_id,
      amount: transaction.amount.toString(),
      transaction_type: transaction.transaction_type,
      description: transaction.description || '',
    });
    setEditTransactionModal(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editTransactionForm) return;
    try {
      await api.updateTransaction(editTransactionForm.id, {
        account_id: editTransactionForm.account_id,
        amount: parseFloat(editTransactionForm.amount),
        transaction_type: editTransactionForm.transaction_type,
        description: editTransactionForm.description,
      });
      setEditTransactionModal(false);
      setEditTransactionForm(null);
      loadAccountsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingMachineExpenseId(expense.id);
    // Tarihi dd/mm/yyyy formatına çevir
    let dateStr = getTodayFormatted();
    if (expense.date) {
      try {
        const d = new Date(expense.date);
        if (!isNaN(d.getTime())) {
          dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      } catch (e) {}
    }
    setExpenseForm({
      machine_id: expense.machine_id,
      amount: expense.amount.toString(),
      expense_type: expense.expense_type,
      description: expense.description || '',
      date: dateStr,
    });
    setExpenseModal(true);
  };

  const handleDeleteExpense = (id: string) => {
    showConfirm('Sil', 'Bu gideri silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteExpense(id);
        machineStore.removeExpense(id);
        loadMachinesData();
        showSuccess('Gider silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleDeleteAccount = (id: string) => {
    showConfirm('Sil', 'Bu cari hesabı silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteAccount(id);
        accountStore.removeAccount(id);
        setDetailModal(null);
        loadAccountsData();
        showSuccess('Cari hesap silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleDeleteMachine = (id: string) => {
    showConfirm('Sil', 'Bu makineyi silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteMachine(id);
        machineStore.removeMachine(id);
        setDetailModal(null);
        loadMachinesData();
        showSuccess('Makine silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  // ==================== FAB HANDLER ====================

  const handleFabPress = () => {
    if (uiStore.activeModule === 'accounts') {
      if (uiStore.accountsTab === 'list') {
        setAccountModal(true);
      } else if (uiStore.accountsTab === 'transactions') {
        if (accountStore.accounts.length === 0) {
          Alert.alert('Uyarı', 'Önce cari hesap ekleyin', [
            { text: 'Tamam', onPress: () => uiStore.setAccountsTab('list') }
          ]);
        } else {
          setTransactionModal(true);
        }
      }
    } else if (uiStore.activeModule === 'machines') {
      switch (uiStore.machinesTab) {
        case 'list':
          setMachineModal(true);
          break;
        case 'expenses':
          if (machineStore.machines.length === 0) {
            Alert.alert('Uyarı', 'Önce makine ekleyin');
          } else {
            setExpenseModal(true);
          }
          break;
        case 'receivables':
          if (machinePersonStore.persons.length === 0) {
            Alert.alert('Uyarı', 'Önce kişi ekleyin');
          } else {
            setMachineReceivableModal(true);
          }
          break;
        case 'persons':
          setMachinePersonModal(true);
          break;
      }
    } else if (uiStore.activeModule === 'farm') {
      switch (uiStore.farmTab) {
        case 'fields':
          setFarmFieldModal(true);
          break;
        case 'incomes':
          setFarmIncomeModal(true);
          break;
        case 'expenses':
          setFarmExpenseModal(true);
          break;
        case 'credits':
          setEditingCreditId(null);
          setFarmCreditForm({ bank_name: '', amount: '', interest_rate: '', interest_type: 'simple', start_date: getTodayFormatted(), due_date: '', term_months: '', notes: '' });
          setFarmCreditModal(true);
          break;
        case 'harvests':
          setFarmHarvestModal(true);
          break;
        case 'sales':
          // Stokta ürün kontrolü
          if (farmStore.stocks.length === 0) {
            Alert.alert('Uyarı', 'Depoda satılacak ürün yok. Önce hasat yapın.');
            return;
          }
          setFarmSaleModal(true);
          break;
        case 'stocks':
          // Depo manuel eklenemez - sadece hasattan otomatik eklenir
          Alert.alert('Bilgi', 'Depo sadece hasat yapıldığında otomatik olarak güncellenir. Manuel depo ekleme kapatılmıştır.');
          return;
        case 'annualStock':
          setShowAnnualStockModal(true);
          break;
      }
    }
  };

  // ==================== MAKİNE KİŞİ CRUD HANDLERS ====================

  const handleCreateMachinePerson = async () => {
    if (!machinePersonForm.name.trim()) {
      Alert.alert('Hata', 'Kişi adı gereklidir');
      return;
    }
    try {
      const person = await api.createMachinePerson(machinePersonForm);
      machinePersonStore.addPerson(person);
      setMachinePersonModal(false);
      setMachinePersonForm({ name: '', phone: '', address: '', notes: '' });
      loadMachinePersonsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateMachineField = async () => {
    if (!machineFieldForm.person_id || !machineFieldForm.name.trim()) {
      Alert.alert('Hata', 'Kişi ve tarla adı gereklidir');
      return;
    }
    try {
      const fieldData = {
        person_id: machineFieldForm.person_id,
        name: machineFieldForm.name,
        size_decare: machineFieldForm.size_decare ? parseFloat(machineFieldForm.size_decare) : undefined,
        crop: machineFieldForm.crop || undefined,
        harvest_date: machineFieldForm.harvest_date || undefined,
        location: machineFieldForm.location || undefined,
        notes: machineFieldForm.notes || undefined,
      };
      
      if (editingMachineField) {
        const updated = await api.updateMachineField(editingMachineField.id, fieldData);
        machinePersonStore.updateMachineField(updated);
        showSuccess('Tarla güncellendi');
      } else {
        const field = await api.createMachineField(fieldData);
        machinePersonStore.addMachineField(field);
        showSuccess('Tarla eklendi');
      }
      setMachineFieldModal(false);
      setMachineFieldForm({ person_id: '', name: '', size_decare: '', crop: '', harvest_date: '', location: '', notes: '' });
      setEditingMachineField(null);
      loadMachinePersonsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeleteMachinePerson = (id: string) => {
    showConfirm('Sil', 'Bu kişiyi silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteMachinePerson(id);
        machinePersonStore.removePerson(id);
        setDetailModal(null);
        loadMachinePersonsData();
        showSuccess('Kişi silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  // Kişi düzenleme handler
  const handleUpdateMachinePerson = async () => {
    if (!editingMachinePerson || !machinePersonForm.name.trim()) {
      Alert.alert('Hata', 'Kişi adı gereklidir');
      return;
    }
    try {
      const updated = await api.updateMachinePerson(editingMachinePerson.id, machinePersonForm);
      setEditingMachinePerson(null);
      setMachinePersonModal(false);
      setMachinePersonForm({ name: '', phone: '', address: '', notes: '' });
      loadMachinePersonsData();
      showSuccess('Kişi güncellendi');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  // Kişi bazlı toplu ödeme handler
  const handleBulkPayment = async () => {
    if (!selectedPersonForBulkPayment || !bulkPaymentForm.amount) {
      Alert.alert('Hata', 'Tutar giriniz');
      return;
    }
    try {
      const result = await api.addPersonBulkPayment(selectedPersonForBulkPayment.id, {
        amount: parseFloat(bulkPaymentForm.amount),
        payment_date: bulkPaymentForm.payment_date ? parseToISO(bulkPaymentForm.payment_date) : undefined,
        description: bulkPaymentForm.description || 'Toplu ödeme',
      });
      setBulkPaymentResult(result);
      loadMachinePersonsData();
      loadYearSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const openBulkPaymentModal = (person: MachinePerson) => {
    setSelectedPersonForBulkPayment(person);
    setBulkPaymentForm({ amount: '', payment_date: getTodayFormatted(), description: '' });
    setBulkPaymentResult(null);
    setBulkPaymentModal(true);
  };

  const closeBulkPaymentModal = () => {
    setBulkPaymentModal(false);
    setSelectedPersonForBulkPayment(null);
    setBulkPaymentResult(null);
  };

  // Toplu alacak girişi handlers
  const addBulkReceivableItem = () => {
    setBulkReceivableItems([...bulkReceivableItems, { 
      field_id: '', 
      machine_id: '', 
      amount: '', 
      description: '', 
      work_date: getTodayFormatted(),
      decare_count: '',
      price_per_decare: ''
    }]);
  };

  const removeBulkReceivableItem = (index: number) => {
    if (bulkReceivableItems.length > 1) {
      setBulkReceivableItems(bulkReceivableItems.filter((_, i) => i !== index));
    }
  };

  const updateBulkReceivableItem = (index: number, field: string, value: string) => {
    const updated = [...bulkReceivableItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Dekar ve birim fiyat girildiğinde tutarı otomatik hesapla
    if (field === 'decare_count' || field === 'price_per_decare') {
      const decare = parseFloat(updated[index].decare_count) || 0;
      const price = parseFloat(updated[index].price_per_decare) || 0;
      if (decare > 0 && price > 0) {
        updated[index].amount = (decare * price).toFixed(2);
      }
    }
    
    setBulkReceivableItems(updated);
  };

  const handleCreateBulkReceivables = async () => {
    if (!selectedPersonForBulkReceivable) {
      Alert.alert('Hata', 'Kişi seçiniz');
      return;
    }
    
    const validItems = bulkReceivableItems.filter(item => item.amount && parseFloat(item.amount) > 0);
    if (validItems.length === 0) {
      Alert.alert('Hata', 'En az bir geçerli alacak girişi yapınız');
      return;
    }
    
    try {
      const items = validItems.map(item => ({
        field_id: item.field_id || undefined,
        machine_id: item.machine_id || undefined,
        amount: parseFloat(item.amount),
        description: item.description || undefined,
        work_date: item.work_date ? parseToISO(item.work_date) : undefined,
        decare_count: item.decare_count ? parseFloat(item.decare_count) : undefined,
        price_per_decare: item.price_per_decare ? parseFloat(item.price_per_decare) : undefined,
      }));
      
      const result = await api.createBulkReceivables(selectedPersonForBulkReceivable, items);
      setBulkReceivableModal(false);
      setSelectedPersonForBulkReceivable('');
      setBulkReceivableItems([{ field_id: '', machine_id: '', amount: '', description: '', work_date: getTodayFormatted(), decare_count: '', price_per_decare: '' }]);
      loadMachinePersonsData();
      loadMachinesData();
      loadYearSummary();
      showSuccess(`${result.created_count} alacak kaydı oluşturuldu`);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  // Kişi düzenleme modal açma
  const openEditPersonModal = (person: MachinePerson) => {
    setEditingMachinePerson(person);
    setMachinePersonForm({
      name: person.name,
      phone: person.phone || '',
      address: person.address || '',
      notes: person.notes || ''
    });
    setDetailModal(null);
    setMachinePersonModal(true);
  };

  const handleDeleteMachineField = (id: string) => {
    showConfirm('Sil', 'Bu tarlayı silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteMachineField(id);
        machinePersonStore.removeMachineField(id);
        setDetailModal(null);
        loadMachinePersonsData();
        showSuccess('Tarla silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleCreateMachineReceivable = async () => {
    if (!machineReceivableForm.person_id || !machineReceivableForm.field_id || !machineReceivableForm.amount) {
      Alert.alert('Hata', 'Kişi, tarla ve tutar seçimi zorunludur');
      return;
    }
    
    // İskonto validasyonu
    if (machineReceivableForm.discount_type && machineReceivableForm.discount_value) {
      const discountVal = parseFloat(machineReceivableForm.discount_value);
      if (discountVal < 0) {
        Alert.alert('Hata', 'İskonto değeri negatif olamaz');
        return;
      }
      if (machineReceivableForm.discount_type === 'percentage' && discountVal > 100) {
        Alert.alert('Hata', 'Yüzde iskontosu 100\'den büyük olamaz');
        return;
      }
      if (machineReceivableForm.discount_type === 'amount' && discountVal > parseFloat(machineReceivableForm.amount)) {
        Alert.alert('Hata', 'İskonto tutarı brüt tutardan büyük olamaz');
        return;
      }
    }
    
    try {
      // Seçili tarlanın dekar bilgisini al
      const selectedField = machinePersonStore.machineFields.find(f => f.id === machineReceivableForm.field_id);
      const decareCount = selectedField?.size_decare || 0;
      
      const data = {
        person_id: machineReceivableForm.person_id,
        field_id: machineReceivableForm.field_id,
        machine_id: machineReceivableForm.machine_id || undefined,
        amount: parseFloat(machineReceivableForm.amount),
        description: machineReceivableForm.description,
        due_date: machineReceivableForm.due_date ? parseToISO(machineReceivableForm.due_date) : undefined,
        discount_type: machineReceivableForm.discount_type || undefined,
        discount_value: machineReceivableForm.discount_value ? parseFloat(machineReceivableForm.discount_value) : undefined,
        decare_count: decareCount,
        price_per_decare: machineReceivableForm.price_per_decare ? parseFloat(machineReceivableForm.price_per_decare) : undefined,
      };
      
      if (editingMachineReceivableId) {
        // Güncelleme
        const updated = await api.updateMachineReceivable(editingMachineReceivableId, data);
        machinePersonStore.updateMachineReceivable(editingMachineReceivableId, updated);
        showSuccess('Alacak güncellendi');
      } else {
        // Yeni kayıt
        const receivable = await api.createMachineReceivable(data);
        machinePersonStore.addMachineReceivable(receivable);
        showSuccess('Alacak kaydı oluşturuldu');
      }
      
      setMachineReceivableModal(false);
      setMachineReceivableForm({ person_id: '', field_id: '', machine_id: '', amount: '', description: '', due_date: getTodayFormatted(), price_per_decare: '', discount_type: '', discount_value: '' });
      setEditingMachineReceivableId(null);
      loadMachinePersonsData();
      loadMachinesData();
      loadYearSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeleteMachineReceivable = (id: string) => {
    showConfirm('Sil', 'Bu alacak kaydını silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteMachineReceivable(id);
        machinePersonStore.removeMachineReceivable(id);
        setDetailModal(null);
        loadMachinePersonsData();
        loadMachinesData();
        showSuccess('Alacak kaydı silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  // ==================== ÖDEME İŞLEMLERİ ====================

  const openPaymentModal = async (receivable: any) => {
    setSelectedReceivableForPayment(receivable);
    setPaymentForm({ amount: '', payment_date: getTodayFormatted(), description: '' });
    try {
      const payments = await api.getReceivablePayments(receivable.id);
      setReceivablePayments(payments);
    } catch (e) {
      setReceivablePayments([]);
    }
    setPaymentModal(true);
  };

  const handleAddPayment = async () => {
    if (!selectedReceivableForPayment) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }
    try {
      await api.addMachineReceivablePayment(selectedReceivableForPayment.id, {
        amount: parseFloat(paymentForm.amount),
        payment_date: parseToISO(paymentForm.payment_date),
        description: paymentForm.description || undefined,
      });
      showSuccess('Ödeme kaydedildi');
      setPaymentForm({ amount: '', payment_date: getTodayFormatted(), description: '' });
      
      // Ödemeleri yeniden yükle
      const payments = await api.getReceivablePayments(selectedReceivableForPayment.id);
      setReceivablePayments(payments);
      
      // Alacakları yeniden yükle
      loadMachinePersonsData();
      loadMachinesData();
      
      // DetailModal'daki veriyi güncelle
      const updatedReceivables = await api.getMachineReceivables();
      const updatedReceivable = updatedReceivables.find((r: any) => r.id === selectedReceivableForPayment.id);
      if (updatedReceivable) {
        setSelectedReceivableForPayment(updatedReceivable);
        if (detailModal?.type === 'machineReceivable') {
          setDetailModal({ type: 'machineReceivable', data: updatedReceivable });
        }
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    showConfirm('Ödeme Sil', 'Bu ödemeyi silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deletePayment(paymentId);
        showSuccess('Ödeme silindi');
        
        // Ödemeleri yeniden yükle
        if (selectedReceivableForPayment) {
          const payments = await api.getReceivablePayments(selectedReceivableForPayment.id);
          setReceivablePayments(payments);
        }
        
        // Alacakları yeniden yükle
        loadMachinePersonsData();
        loadMachinesData();
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  // ==================== CARİ HESAP DÜZENLEME ====================

  const handleUpdateAccount = async () => {
    if (!editAccountForm) return;
    try {
      const updated = await api.updateAccount(editAccountForm.id, {
        name: editAccountForm.name,
        phone: editAccountForm.phone,
        account_type: editAccountForm.account_type,
      });
      accountStore.updateAccount(editAccountForm.id, updated);
      setEditAccountModal(false);
      setEditAccountForm(null);
      loadAccountsData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const openEditAccount = (account: Account) => {
    setEditAccountForm({
      id: account.id,
      name: account.name,
      phone: account.phone || '',
      account_type: account.account_type,
    });
    setDetailModal(null);
    setEditAccountModal(true);
  };

  // ==================== ÇİFTLİK HANDLERS ====================

  const handleCreateFarmField = async () => {
    if (!farmFieldForm.name.trim()) {
      Alert.alert('Hata', 'Tarla adı gereklidir');
      return;
    }
    try {
      if (editingFarmFieldId) {
        // Güncelleme
        const updated = await api.updateFarmField(editingFarmFieldId, farmFieldForm);
        farmStore.updateField(editingFarmFieldId, updated);
        showSuccess('Tarla güncellendi');
      } else {
        // Yeni kayıt
        const field = await api.createFarmField(farmFieldForm);
        farmStore.addField(field);
        showSuccess('Tarla eklendi');
      }
      setFarmFieldModal(false);
      setFarmFieldForm({ name: '', size_decare: '', location: '', crop: '', notes: '' });
      setEditingFarmFieldId(null);
      loadFarmData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateFarmIncome = async () => {
    if (!farmIncomeForm.income_type) {
      Alert.alert('Hata', 'Gelir tipi gereklidir');
      return;
    }
    if (!farmIncomeForm.amount) {
      Alert.alert('Hata', 'Tutar gereklidir');
      return;
    }
    try {
      const data = {
        ...farmIncomeForm,
        amount: parseFloat(farmIncomeForm.amount),
        date: parseToISO(farmIncomeForm.date),
      };
      
      if (editingFarmIncomeId) {
        // Güncelleme
        const updated = await api.updateFarmIncome(editingFarmIncomeId, data);
        farmStore.updateIncome(editingFarmIncomeId, updated);
        showSuccess('Gelir güncellendi');
      } else {
        // Yeni kayıt
        const income = await api.createFarmIncome(data);
        farmStore.addIncome(income);
        showSuccess('Gelir eklendi');
      }
      setFarmIncomeModal(false);
      setFarmIncomeForm({ field_id: '', income_type: '', amount: '', description: '', date: getTodayFormatted() });
      setEditingFarmIncomeId(null);
      loadFarmData();
      loadYearSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateFarmExpense = async () => {
    if (!farmExpenseForm.amount) {
      Alert.alert('Hata', 'Tutar gereklidir');
      return;
    }
    try {
      const data = {
        ...farmExpenseForm,
        amount: parseFloat(farmExpenseForm.amount),
        date: parseToISO(farmExpenseForm.date),
      };
      
      if (editingFarmExpenseId) {
        // Güncelleme
        const updated = await api.updateFarmExpense(editingFarmExpenseId, data);
        farmStore.updateExpense(editingFarmExpenseId, updated);
        showSuccess('Gider güncellendi');
      } else {
        // Yeni kayıt
        const expense = await api.createFarmExpense(data);
        farmStore.addExpense(expense);
        showSuccess('Gider eklendi');
      }
      setFarmExpenseModal(false);
      setFarmExpenseForm({ field_id: '', expense_type: '', amount: '', description: '', date: getTodayFormatted() });
      setEditingFarmExpenseId(null);
      loadFarmData();
      loadYearSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateFarmCredit = async () => {
    if (!farmCreditForm.bank_name || !farmCreditForm.amount) {
      Alert.alert('Hata', 'Banka adı ve tutar gereklidir');
      return;
    }
    try {
      const creditData = {
        bank_name: farmCreditForm.bank_name,
        amount: parseFloat(farmCreditForm.amount),
        interest_rate: farmCreditForm.interest_rate ? parseFloat(farmCreditForm.interest_rate) : 0,
        interest_type: farmCreditForm.interest_type || 'simple',
        start_date: farmCreditForm.start_date ? parseToISO(farmCreditForm.start_date) : undefined,
        due_date: farmCreditForm.due_date ? parseToISO(farmCreditForm.due_date) : undefined,
        term_months: farmCreditForm.term_months ? parseInt(farmCreditForm.term_months) : undefined,
        notes: farmCreditForm.notes || undefined,
      };

      if (editingCreditId) {
        // Güncelleme modu
        const updatedCredit = await api.updateFarmCredit(editingCreditId, creditData);
        farmStore.updateCredit(updatedCredit);
        showSuccess('Kredi güncellendi');
      } else {
        // Yeni ekleme modu
        const credit = await api.createFarmCredit(creditData);
        farmStore.addCredit(credit);
        showSuccess('Kredi eklendi');
      }

      setFarmCreditModal(false);
      setEditingCreditId(null);
      setFarmCreditForm({ bank_name: '', amount: '', interest_rate: '', interest_type: 'simple', start_date: getTodayFormatted(), due_date: '', term_months: '', notes: '' });
      loadFarmData();
      loadCreditSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleMarkCreditPaid = async (creditId: string) => {
    try {
      const updatedCredit = await api.markCreditPaid(creditId);
      farmStore.updateCredit(updatedCredit);
      loadFarmData();
      loadCreditSummary();
      loadYearSummary();
      showSuccess(updatedCredit.is_paid ? 'Kredi ödendi olarak işaretlendi' : 'Ödendi işareti kaldırıldı');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const loadCreditSummary = async () => {
    try {
      const summary = await api.getCreditSummary();
      setCreditSummary(summary);
    } catch (e) {
      console.error('Credit summary load error:', e);
    }
  };

  const loadYearSummary = async (year?: number) => {
    try {
      const targetYear = year || selectedYear;
      const summary = await api.getYearSummary(targetYear);
      setYearSummary(summary);
    } catch (e) {
      console.error('Year summary load error:', e);
    }
  };

  const handleCreateFarmHarvest = async () => {
    if (!farmHarvestForm.crop_name || !farmHarvestForm.quantity) {
      Alert.alert('Hata', 'Ürün adı ve miktar gereklidir');
      return;
    }
    try {
      const data = {
        ...farmHarvestForm,
        quantity: parseFloat(farmHarvestForm.quantity),
        harvest_date: parseToISO(farmHarvestForm.harvest_date),
      };
      
      if (editingFarmHarvestId) {
        // Güncelleme
        const updated = await api.updateFarmHarvest(editingFarmHarvestId, data);
        farmStore.updateHarvest(editingFarmHarvestId, updated);
        showSuccess('Hasat güncellendi');
      } else {
        // Yeni kayıt
        const harvest = await api.createFarmHarvest(data);
        farmStore.addHarvest(harvest);
        showSuccess('Hasat eklendi ve stoka kaydedildi');
      }
      setFarmHarvestModal(false);
      setFarmHarvestForm({ field_id: '', crop_name: '', quantity: '', unit: 'kg', harvest_date: getTodayFormatted(), notes: '' });
      setEditingFarmHarvestId(null);
      loadFarmData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateFarmSale = async () => {
    if (!farmSaleForm.crop_name || !farmSaleForm.quantity || !farmSaleForm.unit_price) {
      Alert.alert('Hata', 'Ürün, miktar ve birim fiyat gereklidir');
      return;
    }
    
    // Stok kontrolü (sadece yeni kayıt için)
    if (!editingFarmSaleId) {
      const selectedStock = farmStore.stocks.find(s => s.item_name === farmSaleForm.crop_name && s.unit === farmSaleForm.unit);
      const saleQty = parseFloat(farmSaleForm.quantity);
      
      if (!selectedStock || selectedStock.quantity < saleQty) {
        Alert.alert('Hata', 'Depoda yeterli ürün yok!');
        return;
      }
    }
    
    try {
      const data = {
        ...farmSaleForm,
        quantity: parseFloat(farmSaleForm.quantity),
        unit_price: parseFloat(farmSaleForm.unit_price),
        sale_date: parseToISO(farmSaleForm.sale_date),
      };
      
      if (editingFarmSaleId) {
        // Güncelleme
        const updated = await api.updateFarmSale(editingFarmSaleId, data);
        farmStore.updateSale(editingFarmSaleId, updated);
        showSuccess('Satış güncellendi');
      } else {
        // Yeni kayıt
        const sale = await api.createFarmSale(data);
        farmStore.addSale(sale);
        showSuccess('Satış kaydedildi ve stoktan düşüldü');
      }
      setFarmSaleModal(false);
      setFarmSaleForm({ field_id: '', crop_name: '', quantity: '', unit: 'kg', unit_price: '', buyer_name: '', sale_date: getTodayFormatted(), notes: '' });
      setEditingFarmSaleId(null);
      loadFarmData();
      loadYearSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateFarmStock = async () => {
    if (!farmStockForm.item_name || !farmStockForm.quantity) {
      Alert.alert('Hata', 'Ürün adı ve miktar gereklidir');
      return;
    }
    try {
      const data = {
        ...farmStockForm,
        quantity: parseFloat(farmStockForm.quantity),
      };
      
      if (editingFarmStockId) {
        // Güncelleme
        const updated = await api.updateFarmStock(editingFarmStockId, data);
        farmStore.updateStock(editingFarmStockId, updated);
        showSuccess('Stok güncellendi');
      } else {
        // Yeni kayıt
        const stock = await api.createFarmStock(data);
        farmStore.addStock(stock);
        showSuccess('Stok eklendi');
      }
      setFarmStockModal(false);
      setFarmStockForm({ item_name: '', quantity: '', unit: 'kg', category: '', notes: '' });
      setEditingFarmStockId(null);
      loadFarmData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  // ==================== YILLIK STOK HANDLERS ====================

  const handleCreateAnnualStock = async () => {
    if (!annualStockForm.stock_type || !annualStockForm.name || !annualStockForm.quantity || !annualStockForm.unit_price) {
      Alert.alert('Hata', 'Tip, ad, miktar ve birim fiyat gereklidir');
      return;
    }
    try {
      if (editingAnnualStock) {
        await api.updateAnnualStock(editingAnnualStock.id, {
          ...annualStockForm,
          quantity: parseFloat(annualStockForm.quantity),
          unit_price: parseFloat(annualStockForm.unit_price),
          purchase_date: parseToISO(annualStockForm.purchase_date),
        });
        showSuccess('Depo güncellendi');
      } else {
        await api.createAnnualStock({
          ...annualStockForm,
          quantity: parseFloat(annualStockForm.quantity),
          unit_price: parseFloat(annualStockForm.unit_price),
          purchase_date: parseToISO(annualStockForm.purchase_date),
        });
        showSuccess('Depo eklendi');
      }
      setShowAnnualStockModal(false);
      setAnnualStockForm({ stock_type: '', name: '', quantity: '', unit: 'kg', unit_price: '', purchase_date: getTodayFormatted(), notes: '' });
      setEditingAnnualStock(null);
      loadAnnualStockData();
      loadYearSummary();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeleteAnnualStock = (id: string) => {
    showConfirm('Sil', 'Bu stoğu ve tüm kullanım kayıtlarını silmek istediğinizden emin misiniz?', async () => {
      try {
        await api.deleteAnnualStock(id);
        loadAnnualStockData();
        showSuccess('Depo silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleAddStockUsageToExpense = async (usage: any) => {
    try {
      const result = await api.toggleStockUsageExpense(usage.id);
      loadAnnualStockData();
      loadFarmData();
      loadYearSummary();
      showSuccess(result.message);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleCreateFieldStockUsage = async () => {
    if (!fieldStockUsageForm.field_id || !fieldStockUsageForm.stock_id || !fieldStockUsageForm.used_quantity) {
      Alert.alert('Hata', 'Tarla, stok ve miktar gereklidir');
      return;
    }
    try {
      await api.createFieldStockUsage({
        ...fieldStockUsageForm,
        used_quantity: parseFloat(fieldStockUsageForm.used_quantity),
        usage_date: parseToISO(fieldStockUsageForm.usage_date),
        add_to_expense: fieldStockUsageForm.add_to_expense,
      });
      setShowFieldStockUsageModal(false);
      setFieldStockUsageForm({ field_id: '', stock_id: '', used_quantity: '', usage_date: getTodayFormatted(), notes: '', add_to_expense: false });
      loadAnnualStockData();
      loadFarmData();
      loadYearSummary();
      showSuccess(fieldStockUsageForm.add_to_expense ? 'Depo tarlaya atandı ve giderlere eklendi' : 'Depo tarlaya atandı');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeleteFieldStockUsage = (id: string) => {
    showConfirm('Sil', 'Bu kullanım kaydını silmek istediğinizden emin misiniz? Depo miktarı geri yüklenecek.', async () => {
      try {
        await api.deleteFieldStockUsage(id);
        loadAnnualStockData();
        showSuccess('Kullanım kaydı silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleUpdateFieldStockUsage = async () => {
    if (!editingFieldStockUsage) return;
    if (!fieldStockUsageForm.used_quantity) {
      Alert.alert('Hata', 'Miktar gereklidir');
      return;
    }
    try {
      await api.updateFieldStockUsage(editingFieldStockUsage.id, {
        ...fieldStockUsageForm,
        field_id: editingFieldStockUsage.field_id,
        stock_id: editingFieldStockUsage.stock_id,
        used_quantity: parseFloat(fieldStockUsageForm.used_quantity),
        usage_date: parseToISO(fieldStockUsageForm.usage_date),
      });
      setShowFieldStockUsageModal(false);
      setEditingFieldStockUsage(null);
      setFieldStockUsageForm({ field_id: '', stock_id: '', used_quantity: '', usage_date: getTodayFormatted(), notes: '' });
      loadAnnualStockData();
      showSuccess('Kullanım kaydı güncellendi');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDeleteFarmItem = (type: string, id: string) => {
    showConfirm('Sil', 'Bu kaydı silmek istediğinizden emin misiniz?', async () => {
      try {
        switch (type) {
          case 'farmField': await api.deleteFarmField(id); farmStore.removeField(id); break;
          case 'farmIncome': await api.deleteFarmIncome(id); farmStore.removeIncome(id); break;
          case 'farmExpense': await api.deleteFarmExpense(id); farmStore.removeExpense(id); break;
          case 'farmCredit': await api.deleteFarmCredit(id); farmStore.removeCredit(id); break;
          case 'farmHarvest': await api.deleteFarmHarvest(id); farmStore.removeHarvest(id); break;
          case 'farmSale': await api.deleteFarmSale(id); farmStore.removeSale(id); break;
          case 'farmStock': await api.deleteFarmStock(id); farmStore.removeStock(id); break;
        }
        setDetailModal(null);
        loadFarmData();
        showSuccess('Kayıt silindi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  const handleEditFarmItem = (type: string, data: any) => {
    switch (type) {
      case 'farmField':
        setEditingFarmFieldId(data.id);
        setFarmFieldForm({ name: data.name, size_decare: data.size_decare?.toString() || '', location: data.location || '', crop: data.crop || '', notes: data.notes || '' });
        setFarmFieldModal(true);
        break;
      case 'farmIncome':
        setEditingFarmIncomeId(data.id);
        setFarmIncomeForm({ field_id: data.field_id || '', income_type: data.income_type, amount: data.amount?.toString() || '', description: data.description || '', date: data.date ? data.date.split('T')[0] : '' });
        setFarmIncomeModal(true);
        break;
      case 'farmExpense':
        setEditingFarmExpenseId(data.id);
        setFarmExpenseForm({ field_id: data.field_id || '', expense_type: data.expense_type, amount: data.amount?.toString() || '', description: data.description || '', date: data.date ? data.date.split('T')[0] : '' });
        setFarmExpenseModal(true);
        break;
      case 'farmCredit':
        setEditingCreditId(data.id);
        setFarmCreditForm({ 
          bank_name: data.bank_name, 
          amount: data.amount?.toString() || '', 
          interest_rate: data.interest_rate?.toString() || '', 
          interest_type: data.interest_type || 'simple',
          start_date: data.start_date ? data.start_date.split('T')[0] : '',
          due_date: data.due_date ? data.due_date.split('T')[0] : '',
          term_months: data.term_months?.toString() || '', 
          notes: data.notes || '' 
        });
        setFarmCreditModal(true);
        break;
      case 'farmHarvest':
        setEditingFarmHarvestId(data.id);
        setFarmHarvestForm({ field_id: data.field_id || '', crop_name: data.crop_name, quantity: data.quantity?.toString() || '', unit: data.unit || 'kg', harvest_date: data.harvest_date ? data.harvest_date.split('T')[0] : '', notes: data.notes || '' });
        setFarmHarvestModal(true);
        break;
      case 'farmSale':
        setEditingFarmSaleId(data.id);
        setFarmSaleForm({ field_id: data.field_id || '', crop_name: data.crop_name, quantity: data.quantity?.toString() || '', unit: data.unit || 'kg', unit_price: data.unit_price?.toString() || '', buyer_name: data.buyer_name || '', sale_date: data.sale_date ? data.sale_date.split('T')[0] : '', notes: data.notes || '' });
        setFarmSaleModal(true);
        break;
      case 'farmStock':
        setEditingFarmStockId(data.id);
        setFarmStockForm({ item_name: data.item_name, quantity: data.quantity?.toString() || '', unit: data.unit || 'kg', category: data.category || '', notes: data.notes || '' });
        setFarmStockModal(true);
        break;
    }
  };

  // Makine alacağını tahsil et
  const handleCollectReceivable = async (id: string, amount: number) => {
    showConfirm('Tahsilat', `${formatCurrency(amount)} tutarını tahsil etmek istiyor musunuz?`, async () => {
      try {
        const updated = await api.addMachineReceivablePayment(id, { amount, description: 'Tam tahsilat' });
        // Store'u güncelle - tam obje ile değiştir
        machinePersonStore.updateMachineReceivable(id, updated);
        setDetailModal(null);
        // Verileri yeniden yükle
        loadMachinePersonsData();
        loadMachinesData();
        showSuccess('Tahsilat kaydedildi - Alacak ödendi olarak işaretlendi');
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    });
  };

  // ==================== RENDER ACCOUNTS MODULE ====================

  const renderAccountsModule = () => {
    const { accountsTab, transactionFilters, chartData } = uiStore;
    const { accounts, transactions, summary } = accountStore;

    if (accountsTab === 'summary') {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SummaryCard
            title="Cari Hesap Özeti"
            color={lightColors.primary}
            items={[
              { label: 'Toplam Hesap', value: String(summary?.total_accounts || 0) },
              { label: 'Toplam Alacak', value: formatCurrency(summary?.total_credit || 0), color: lightColors.credit },
              { label: 'Toplam Borç', value: formatCurrency(summary?.total_debt || 0), color: lightColors.debt },
              { label: 'Net Bakiye', value: formatCurrency(summary?.total_balance || 0), color: (summary?.total_balance || 0) >= 0 ? lightColors.credit : lightColors.debt },
            ]}
          />
          
          {/* Yıl Özeti Paneli */}
          {yearSummary && yearSummary.farm && yearSummary.machine && (
            <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
              {/* Başlık ve Yıl Seçici */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.summaryTitle, { color: '#10B981' }]}>📊 Yıl Özeti</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity 
                    onPress={() => { setSelectedYear(selectedYear - 1); loadYearSummary(selectedYear - 1); }}
                    style={{ padding: 6, backgroundColor: '#E5E7EB', borderRadius: 6 }}
                  >
                    <Ionicons name="chevron-back" size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShowYearPicker(true)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#10B981', borderRadius: 8 }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600' as const, fontSize: 14 }}>{selectedYear}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => { setSelectedYear(selectedYear + 1); loadYearSummary(selectedYear + 1); }}
                    style={{ padding: 6, backgroundColor: '#E5E7EB', borderRadius: 6 }}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* 3 Kart: Çiftlik, Makine, Toplam */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                {/* Çiftlik Net */}
                <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: borders.radius.md, padding: spacing.sm, alignItems: 'center' }}>
                  <Text style={{ fontSize: moderateScale(18) }}>🌾</Text>
                  <Text style={{ fontSize: moderateScale(10), color: lightColors.textSecondary, marginTop: 2 }}>Çiftlik Net</Text>
                  <Text style={{ fontSize: moderateScale(14), fontWeight: '700' as const, color: (yearSummary.farm?.net || 0) >= 0 ? '#10B981' : lightColors.error, marginTop: 2 }}>
                    {formatCurrency(yearSummary.farm?.net || 0)}
                  </Text>
                </View>
                
                {/* Makine Net */}
                <View style={{ flex: 1, backgroundColor: '#FEF3C7', borderRadius: borders.radius.md, padding: spacing.sm, alignItems: 'center' }}>
                  <Text style={{ fontSize: moderateScale(18) }}>🚜</Text>
                  <Text style={{ fontSize: moderateScale(10), color: lightColors.textSecondary, marginTop: 2 }}>Makine Net</Text>
                  <Text style={{ fontSize: moderateScale(14), fontWeight: '700' as const, color: (yearSummary.machine?.net || 0) >= 0 ? '#10B981' : lightColors.error, marginTop: 2 }}>
                    {formatCurrency(yearSummary.machine?.net || 0)}
                  </Text>
                </View>
                
                {/* Yıl Net */}
                <View style={{ flex: 1, backgroundColor: (yearSummary.year_net || 0) >= 0 ? '#D1FAE5' : '#FEE2E2', borderRadius: borders.radius.md, padding: spacing.sm, alignItems: 'center' }}>
                  <Text style={{ fontSize: moderateScale(18) }}>📈</Text>
                  <Text style={{ fontSize: moderateScale(10), color: lightColors.textSecondary, marginTop: 2 }}>Yıl Net</Text>
                  <Text style={{ fontSize: moderateScale(15), fontWeight: '700' as const, color: (yearSummary.year_net || 0) >= 0 ? '#10B981' : lightColors.error, marginTop: 2 }}>
                    {formatCurrency(yearSummary.year_net || 0)}
                  </Text>
                </View>
              </View>
              
              {/* Detay Dökümü */}
              <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: lightColors.border, paddingTop: spacing.md }}>
                <Text style={styles.fieldSectionTitle}>📋 Detay Dökümü</Text>
                
                {/* Çiftlik Detay */}
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 12, fontWeight: '600' as const, color: lightColors.text, marginBottom: 4 }}>🌾 Çiftlik</Text>
                  <View style={styles.fieldSummaryRow}>
                    <Text style={styles.fieldRowLabel}>Gelir + Satış</Text>
                    <Text style={[styles.fieldRowValue, { color: lightColors.income }]}>+{formatCurrency((yearSummary.farm?.total_income || 0) + (yearSummary.farm?.total_sales || 0))}</Text>
                  </View>
                  <View style={styles.fieldSummaryRow}>
                    <Text style={styles.fieldRowLabel}>Gider + Depo</Text>
                    <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>-{formatCurrency(yearSummary.farm?.all_expense || 0)}</Text>
                  </View>
                </View>
                
                {/* Makine Detay */}
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 12, fontWeight: '600' as const, color: lightColors.text, marginBottom: 4 }}>🚜 Makine</Text>
                  <View style={styles.fieldSummaryRow}>
                    <Text style={styles.fieldRowLabel}>Tahsil Edilen</Text>
                    <Text style={[styles.fieldRowValue, { color: lightColors.income }]}>+{formatCurrency(yearSummary.machine?.collected_income || 0)}</Text>
                  </View>
                  <View style={styles.fieldSummaryRow}>
                    <Text style={styles.fieldRowLabel}>Bekleyen Alacak</Text>
                    <Text style={[styles.fieldRowValue, { color: lightColors.warning }]}>{formatCurrency(yearSummary.machine?.pending_income || 0)}</Text>
                  </View>
                  <View style={styles.fieldSummaryRow}>
                    <Text style={styles.fieldRowLabel}>Gider</Text>
                    <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>-{formatCurrency(yearSummary.machine?.total_expense || 0)}</Text>
                  </View>
                </View>
                
                {/* Kredi Durumu */}
                {yearSummary.farm?.credit?.total_principal > 0 && (
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600' as const, color: lightColors.text, marginBottom: 4 }}>💳 Kredi Durumu</Text>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Toplam Kredi Borcu</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>{formatCurrency(yearSummary.farm?.credit?.total_payable || 0)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Yedekleme Paneli */}
          <View style={[styles.summaryCard, { borderLeftColor: '#6366F1' }]}>
            <Text style={[styles.summaryTitle, { color: '#6366F1' }]}>💾 Yedekleme</Text>
            <Text style={{ color: lightColors.textSecondary, marginBottom: spacing.md, fontSize: 13 }}>
              Tüm verilerinizi JSON dosyası olarak yedekleyin veya geri yükleyin.
            </Text>
            {lastBackupDate && (
              <Text style={{ color: lightColors.textSecondary, marginBottom: spacing.sm, fontSize: 12 }}>
                Son yedek: {lastBackupDate}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#6366F1', padding: spacing.md, borderRadius: borders.radius.md, alignItems: 'center', opacity: backupLoading ? 0.6 : 1 }}
                onPress={handleExportBackup}
                disabled={backupLoading}
              >
                <Ionicons name="download-outline" size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '600' as const, marginTop: 4 }}>Dışa Aktar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#059669', padding: spacing.md, borderRadius: borders.radius.md, alignItems: 'center', opacity: backupLoading ? 0.6 : 1 }}
                onPress={handleImportBackup}
                disabled={backupLoading}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '600' as const, marginTop: 4 }}>İçe Aktar</Text>
              </TouchableOpacity>
            </View>
            {backupLoading && (
              <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: lightColors.textSecondary }}>İşlem devam ediyor...</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.sectionTitle}>Son İşlemler</Text>
          {transactions.slice(0, 5).map((t) => (
            <TransactionCard key={t.id} item={t} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} onMarkPaid={handleMarkTransactionPaid} />
          ))}
          {transactions.length === 0 && (
            <EmptyState icon="document-text-outline" title="İşlem yok" message="Henüz işlem eklenmemiş" />
          )}
        </ScrollView>
      );
    }

    if (accountsTab === 'list') {
      return (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AccountCard item={item} onPress={(a) => setDetailModal({ type: 'account', data: a })} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Cari hesap yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (accountsTab === 'transactions') {
      // Filtrelenmiş işlemler
      const filteredTransactions = transactions.filter(t => {
        if (transactionFilters.account_id && t.account_id !== transactionFilters.account_id) return false;
        if (transactionFilters.transaction_type && t.transaction_type !== transactionFilters.transaction_type) return false;
        // is_paid filtresi: undefined=tümü, false=sadece ödenmemiş, true=sadece ödenmiş
        if (transactionFilters.is_paid === false && t.is_paid) return false;
        if (transactionFilters.is_paid === true && !t.is_paid) return false;
        return true;
      });

      return (
        <View style={{ flex: 1 }}>
          {/* Filtre Bar */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, transactionFilters.is_paid === undefined && styles.filterChipActive]}
                onPress={() => uiStore.setTransactionFilters({ ...transactionFilters, is_paid: undefined })}
              >
                <Text style={[styles.filterChipText, transactionFilters.is_paid === undefined && styles.filterChipTextActive]}>Tümü</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, transactionFilters.is_paid === false && styles.filterChipActive]}
                onPress={() => uiStore.setTransactionFilters({ ...transactionFilters, is_paid: false })}
              >
                <Text style={[styles.filterChipText, transactionFilters.is_paid === false && styles.filterChipTextActive]}>Ödenmemiş</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, transactionFilters.is_paid === true && styles.filterChipActive]}
                onPress={() => uiStore.setTransactionFilters({ ...transactionFilters, is_paid: true })}
              >
                <Text style={[styles.filterChipText, transactionFilters.is_paid === true && styles.filterChipTextActive]}>Ödenmiş</Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 8, height: 24, alignSelf: 'center' }} />
              <TouchableOpacity
                style={[styles.filterChip, !transactionFilters.transaction_type && styles.filterChipActive]}
                onPress={() => uiStore.setTransactionFilters({ ...transactionFilters, transaction_type: undefined })}
              >
                <Text style={[styles.filterChipText, !transactionFilters.transaction_type && styles.filterChipTextActive]}>Tüm Tipler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, transactionFilters.transaction_type === 'credit' && styles.filterChipActive]}
                onPress={() => uiStore.setTransactionFilters({ ...transactionFilters, transaction_type: 'credit' })}
              >
                <Text style={[styles.filterChipText, transactionFilters.transaction_type === 'credit' && styles.filterChipTextActive]}>Alacak</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, transactionFilters.transaction_type === 'debt' && styles.filterChipActive]}
                onPress={() => uiStore.setTransactionFilters({ ...transactionFilters, transaction_type: 'debt' })}
              >
                <Text style={[styles.filterChipText, transactionFilters.transaction_type === 'debt' && styles.filterChipTextActive]}>Borç</Text>
              </TouchableOpacity>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.filterChip, transactionFilters.account_id === acc.id && styles.filterChipActive]}
                  onPress={() => uiStore.setTransactionFilters({ 
                    ...transactionFilters, 
                    account_id: transactionFilters.account_id === acc.id ? undefined : acc.id 
                  })}
                >
                  <Text style={[styles.filterChipText, transactionFilters.account_id === acc.id && styles.filterChipTextActive]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionCard item={item} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} onMarkPaid={handleMarkTransactionPaid} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" title="İşlem yok" message="+ butonuna basarak ekleyin" />}
          />
        </View>
      );
    }

    if (accountsTab === 'reports') {
      const pieData = chartData?.pie || [
        { name: 'Alacak', population: summary?.total_credit || 0, color: '#10B981', legendFontColor: '#333' },
        { name: 'Borç', population: summary?.total_debt || 0, color: '#EF4444', legendFontColor: '#333' },
      ];

      // BarChart için basit veri yapısı
      const barLabels = chartData?.bar?.map((d: any) => d.label) || ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'];
      const barCredits = chartData?.bar?.map((d: any) => d.credit || 0) || [0, 0, 0, 0, 0, 0];

      const barData = {
        labels: barLabels,
        datasets: [{ data: barCredits.length > 0 ? barCredits : [0] }],
      };

      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Borç / Alacak Dağılımı</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData.map((item: any) => ({
                name: item.name,
                population: item.population || item.value || 0,
                color: item.color,
                legendFontColor: '#333',
                legendFontSize: 12,
              }))}
              width={screenWidth - 40}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>

          <Text style={styles.sectionTitle}>Aylık İşlem Grafiği</Text>
          <View style={styles.chartContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, paddingHorizontal: 10 }}>
              {barLabels.map((label: string, index: number) => {
                const value = barCredits[index] || 0;
                const maxValue = Math.max(...barCredits, 1);
                const height = Math.max((value / maxValue) * 120, 4);
                return (
                  <View key={label} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
                    <Text style={{ fontSize: 10, color: lightColors.textSecondary, marginBottom: 4 }}>
                      {value > 0 ? `₺${(value / 1000).toFixed(0)}k` : '0'}
                    </Text>
                    <View style={{ width: '80%', height, backgroundColor: '#10B981', borderRadius: 4 }} />
                    <Text style={{ fontSize: 10, color: lightColors.textSecondary, marginTop: 4 }}>{label}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, backgroundColor: '#10B981', borderRadius: 2, marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: lightColors.textSecondary }}>Alacak</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Kişi Bazlı Özet</Text>
          {accounts.map(acc => (
            <TouchableOpacity 
              key={acc.id} 
              style={styles.card}
              onPress={() => setDetailModal({ type: 'account', data: acc })}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: acc.balance >= 0 ? lightColors.credit : lightColors.debt }]}>
                  <Ionicons name="person" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{acc.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    Alacak: {formatCurrency(acc.total_credit || 0)} | Borç: {formatCurrency(acc.total_debt || 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.balanceText, { color: acc.balance >= 0 ? lightColors.credit : lightColors.debt }]}>
                  {formatCurrency(Math.abs(acc.balance))}
                </Text>
                <Text style={styles.balanceLabel}>{acc.balance >= 0 ? 'Alacak' : 'Borç'}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {accounts.length === 0 && (
            <EmptyState icon="bar-chart-outline" title="Veri yok" message="Rapor için işlem ekleyin" />
          )}
        </ScrollView>
      );
    }

    return null;
  };

  // ==================== RENDER MACHINES MODULE ====================

  const renderMachinesModule = () => {
    const { machinesTab } = uiStore;
    const { machines, expenses, summary } = machineStore;
    const { persons, machineFields, machineReceivables, summary: personsSummary } = machinePersonStore;

    if (machinesTab === 'summary') {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SummaryCard
            title="Makine Özeti"
            color={lightColors.secondary}
            items={[
              { label: 'Toplam Makine', value: String(summary?.total_machines || 0) },
              { label: 'Toplam Alacak', value: formatCurrency(summary?.total_receivables || 0), color: lightColors.warning },
              { label: 'Tahsil Edilen (Gelir)', value: formatCurrency(summary?.total_income || 0), color: lightColors.income },
              { label: 'Bekleyen Alacak', value: formatCurrency(summary?.total_remaining || 0), color: lightColors.debt },
            ]}
          />
          
          {/* Dekar Özeti - Alacak Kayıtlarından */}
          <View style={[styles.summaryCard, { borderLeftColor: '#14B8A6' }]}>
            <Text style={[styles.summaryCardTitle, { color: '#14B8A6' }]}>🌾 Hasat Dekar Özeti</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Toplam İş (Alacak)</Text>
              <Text style={[styles.summaryValue, { color: '#14B8A6' }]}>{machineReceivables.length} adet</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Toplam Hasat Dekarı</Text>
              <Text style={[styles.summaryValue, { color: '#14B8A6', fontWeight: 'bold' }]}>{decareSummary.totalDecare.toFixed(1)} da</Text>
            </View>
            {decareSummary.personDecares.length > 0 && (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: lightColors.border, paddingTop: 8 }}>
                <Text style={{ fontSize: 12, color: lightColors.textSecondary, marginBottom: 4 }}>Kişi Bazlı Hasat:</Text>
                {decareSummary.personDecares.slice(0, 5).map((p, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text style={{ fontSize: 12, color: lightColors.text }}>{p.name}</Text>
                    <Text style={{ fontSize: 12, color: '#14B8A6', fontWeight: '600' }}>{p.decare.toFixed(1)} da ({p.fieldCount} iş)</Text>
                  </View>
                ))}
                {decareSummary.personDecares.length > 5 && (
                  <Text style={{ fontSize: 11, color: lightColors.textSecondary, marginTop: 4 }}>
                    +{decareSummary.personDecares.length - 5} kişi daha...
                  </Text>
                )}
              </View>
            )}
          </View>
          
          <SummaryCard
            title="Kâr / Zarar"
            color={'#10B981'}
            items={[
              { label: 'Toplam Gelir', value: formatCurrency(summary?.total_income || 0), color: lightColors.income },
              { label: 'Toplam Gider', value: formatCurrency(summary?.total_expenses || 0), color: lightColors.expense },
              { label: 'Net Kâr', value: formatCurrency((summary?.total_income || 0) - (summary?.total_expenses || 0)), color: ((summary?.total_income || 0) - (summary?.total_expenses || 0)) >= 0 ? lightColors.credit : lightColors.debt },
            ]}
          />
          <SummaryCard
            title="Kişi Özeti"
            color={'#8B5CF6'}
            items={[
              { label: 'Toplam Kişi', value: String(personsSummary?.total_persons || 0) },
              { label: 'Toplam Alacak', value: formatCurrency(personsSummary?.total_receivables || 0), color: lightColors.warning },
              { label: 'Tahsil Edilen', value: formatCurrency(personsSummary?.total_paid || 0), color: lightColors.credit },
              { label: 'Kalan Alacak', value: formatCurrency(personsSummary?.total_remaining || 0), color: lightColors.debt },
            ]}
          />
          
          {/* Kişi Seçimi ve Detaylı Özet */}
          <View style={[styles.summaryCard, { borderLeftColor: '#EC4899' }]}>
            <Text style={[styles.summaryCardTitle, { color: '#EC4899' }]}>👤 Kişi Detay Özeti</Text>
            
            {/* Kişi Dropdown */}
            <Text style={{ fontSize: 12, color: lightColors.textSecondary, marginBottom: 6 }}>Kişi Seçin:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginBottom: 12 }}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              <TouchableOpacity
                style={[
                  styles.personDropdownItem,
                  !selectedPersonForSummary && styles.personDropdownItemActive
                ]}
                onPress={() => setSelectedPersonForSummary('')}
              >
                <Text style={[
                  styles.personDropdownText,
                  !selectedPersonForSummary && styles.personDropdownTextActive
                ]}>Tümü</Text>
              </TouchableOpacity>
              {persons.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={[
                    styles.personDropdownItem,
                    selectedPersonForSummary === person.id && styles.personDropdownItemActive
                  ]}
                  onPress={() => setSelectedPersonForSummary(person.id)}
                >
                  <Text style={[
                    styles.personDropdownText,
                    selectedPersonForSummary === person.id && styles.personDropdownTextActive
                  ]} numberOfLines={1}>{person.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Seçilen Kişi Özeti */}
            {selectedPersonSummary ? (
              <View style={{ backgroundColor: '#FDF2F8', borderRadius: 8, padding: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#EC4899', marginBottom: 8 }}>
                  {selectedPersonSummary.person.name}
                </Text>
                
                {/* Nakdi Durum */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: lightColors.textSecondary }}>💰 Toplam Alacak:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: lightColors.warning }}>{formatCurrency(selectedPersonSummary.totalReceivable)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: lightColors.textSecondary }}>✅ Ödenen:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: lightColors.credit }}>{formatCurrency(selectedPersonSummary.totalPaid)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F9A8D4' }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: lightColors.text }}>⏳ Kalan Borç:</Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: selectedPersonSummary.remaining > 0 ? lightColors.debt : lightColors.credit }}>
                    {formatCurrency(selectedPersonSummary.remaining)}
                  </Text>
                </View>
                
                {/* Hasat Dekar - Alacak kayıtlarından */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: lightColors.textSecondary }}>📝 Kayıtlı İş:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#8B5CF6' }}>{selectedPersonSummary.receivableCount} adet</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: lightColors.text }}>🌾 Hasat Dekarı:</Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#14B8A6' }}>{selectedPersonSummary.totalDecare.toFixed(1)} da</Text>
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, alignItems: 'center' }}>
                <Ionicons name="person-circle-outline" size={32} color={lightColors.textSecondary} />
                <Text style={{ fontSize: 13, color: lightColors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  Detaylı özet için yukarıdan bir kişi seçin
                </Text>
              </View>
            )}
          </View>
          
        </ScrollView>
      );
    }

    if (machinesTab === 'list') {
      return (
        <FlatList
          data={machines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MachineCard item={item} onPress={(m) => setDetailModal({ type: 'machine', data: m })} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="construct-outline" title="Makine yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (machinesTab === 'expenses') {
      return (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseCard item={item} onEdit={handleEditExpense} onDelete={handleDeleteExpense} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="Gider yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (machinesTab === 'persons') {
      return (
        <View style={{ flex: 1 }}>
          <FlatList
            data={persons}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MachinePersonCard item={item} onPress={(p) => setDetailModal({ type: 'machinePerson', data: p })} />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState icon="people-outline" title="Kişi yok" message="+ butonuna basarak ekleyin" />}
            ListFooterComponent={
              machineFields.length > 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.sectionTitle}>Tarlalar ({machineFields.length})</Text>
                  {machineFields.map((field) => (
                    <MachineFieldCard 
                      key={field.id} 
                      item={field} 
                      onPress={(f) => setDetailModal({ type: 'machineField', data: f })} 
                    />
                  ))}
                </View>
              ) : null
            }
          />
        </View>
      );
    }

    if (machinesTab === 'receivables') {
      return (
        <FlatList
          data={machineReceivables}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'machineReceivable', data: item })} activeOpacity={0.7}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: receivableStatusColors[item.status] || lightColors.warning }]}>
                  <Ionicons name="document-text" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.person_name || 'İsimsiz'}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.field_name ? `${item.field_name} - ` : ''}{receivableStatusLabels[item.status] || 'Bekliyor'}
                  </Text>
                  <Text style={[styles.cardSubtitle, { fontSize: 10, color: lightColors.textSecondary }]}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : (item.due_date ? new Date(item.due_date).toLocaleDateString('tr-TR') : '')}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.balanceText, { color: lightColors.income }]}>
                  {formatCurrency(item.remaining_amount || item.amount || 0)}
                </Text>
                <Text style={styles.smallText}>/ {formatCurrency(item.amount || 0)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="Alacak yok" message="Kişi ekleyip iş kaydedin" />}
        />
      );
    }

    return null;
  };

  // ==================== MODALS ====================

  const renderAccountModal = () => (
    <Modal visible={accountModal} animationType="slide" transparent onRequestClose={() => setAccountModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Cari Hesap</Text>
            <TouchableOpacity onPress={() => setAccountModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Ad *</Text>
            <TextInput
              style={styles.input}
              value={accountForm.name}
              onChangeText={(t) => setAccountForm({ ...accountForm, name: t })}
              placeholder="Cari hesap adı"
            />
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={accountForm.phone}
              onChangeText={(t) => setAccountForm({ ...accountForm, phone: t })}
              placeholder="Telefon"
              keyboardType="phone-pad"
            />
            <Text style={styles.inputLabel}>Hesap Tipi</Text>
            <View style={styles.typeSelector}>
              {(['customer', 'supplier', 'worker', 'other'] as AccountType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, accountForm.account_type === type && styles.typeBtnActive]}
                  onPress={() => setAccountForm({ ...accountForm, account_type: type })}
                >
                  <Text style={[styles.typeBtnText, accountForm.account_type === type && styles.typeBtnTextActive]}>
                    {accountTypeLabels[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAccount}>
              <Text style={styles.submitBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderTransactionModal = () => (
    <Modal visible={transactionModal} animationType="slide" transparent onRequestClose={() => setTransactionModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni İşlem</Text>
            <TouchableOpacity onPress={() => setTransactionModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Cari Hesap *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accountStore.accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.selectItem, transactionForm.account_id === a.id && styles.selectItemActive]}
                  onPress={() => setTransactionForm({ ...transactionForm, account_id: a.id })}
                >
                  <Text style={[styles.selectItemText, transactionForm.account_id === a.id && styles.selectItemTextActive]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>İşlem Tipi *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, transactionForm.transaction_type === 'credit' && { backgroundColor: lightColors.credit }]}
                onPress={() => setTransactionForm({ ...transactionForm, transaction_type: 'credit' })}
              >
                <Ionicons name="arrow-down" size={16} color={transactionForm.transaction_type === 'credit' ? '#FFF' : lightColors.credit} />
                <Text style={[styles.typeBtnText, transactionForm.transaction_type === 'credit' && { color: '#FFF' }]}>Alacak</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, transactionForm.transaction_type === 'debt' && { backgroundColor: lightColors.debt }]}
                onPress={() => setTransactionForm({ ...transactionForm, transaction_type: 'debt' })}
              >
                <Ionicons name="arrow-up" size={16} color={transactionForm.transaction_type === 'debt' ? '#FFF' : lightColors.debt} />
                <Text style={[styles.typeBtnText, transactionForm.transaction_type === 'debt' && { color: '#FFF' }]}>Borç</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Tutar (₺) *</Text>
            <TextInput
              style={styles.input}
              value={transactionForm.amount}
              onChangeText={(t) => setTransactionForm({ ...transactionForm, amount: t })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={transactionForm.description}
              onChangeText={(t) => setTransactionForm({ ...transactionForm, description: t })}
              placeholder="Açıklama"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTransaction}>
              <Text style={styles.submitBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderMachineModal = () => (
    <Modal visible={machineModal} animationType="slide" transparent onRequestClose={() => setMachineModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Makine</Text>
            <TouchableOpacity onPress={() => setMachineModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Makine Adı *</Text>
            <TextInput
              style={styles.input}
              value={machineForm.name}
              onChangeText={(t) => setMachineForm({ ...machineForm, name: t })}
              placeholder="Makine adı"
            />
            <Text style={styles.inputLabel}>Makine Tipi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {(['tractor', 'harvester', 'seeder', 'sprayer', 'trailer', 'other'] as MachineType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.selectItem, machineForm.type === type && { backgroundColor: lightColors.secondary }]}
                  onPress={() => setMachineForm({ ...machineForm, type })}
                >
                  <Text style={[styles.selectItemText, machineForm.type === type && { color: '#FFF' }]}>
                    {machineTypeLabels[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Plaka</Text>
            <TextInput
              style={styles.input}
              value={machineForm.plate_number}
              onChangeText={(t) => setMachineForm({ ...machineForm, plate_number: t })}
              placeholder="Plaka numarası"
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.secondary }]} onPress={handleCreateMachine}>
              <Text style={styles.submitBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderExpenseModal = () => (
    <Modal visible={expenseModal} animationType="slide" transparent onRequestClose={() => { setExpenseModal(false); setEditingMachineExpenseId(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingMachineExpenseId ? 'Gider Düzenle' : 'Yeni Gider'}</Text>
            <TouchableOpacity onPress={() => { setExpenseModal(false); setEditingMachineExpenseId(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Makine *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {machineStore.machines.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.selectItem, expenseForm.machine_id === m.id && { backgroundColor: lightColors.secondary }]}
                  onPress={() => setExpenseForm({ ...expenseForm, machine_id: m.id })}
                >
                  <Text style={[styles.selectItemText, expenseForm.machine_id === m.id && { color: '#FFF' }]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Gider Tipi *</Text>
            <TextInput
              style={styles.input}
              value={expenseForm.expense_type}
              onChangeText={(t) => setExpenseForm({ ...expenseForm, expense_type: t })}
              placeholder="Örn: Yakıt, Bakım, Tamir..."
            />
            <Text style={styles.inputLabel}>Tutar (₺) *</Text>
            <TextInput
              style={styles.input}
              value={expenseForm.amount}
              onChangeText={(t) => setExpenseForm({ ...expenseForm, amount: t })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={expenseForm.description}
              onChangeText={(t) => setExpenseForm({ ...expenseForm, description: t })}
              placeholder="Açıklama"
            />
            <Text style={styles.inputLabel}>Tarih</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={expenseForm.date}
                onChangeText={(t) => setExpenseForm({ ...expenseForm, date: t })}
                placeholder="GG/AA/YYYY"
              />
              <TouchableOpacity 
                style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' }}
                onPress={() => {
                  const today = new Date();
                  const day = String(today.getDate()).padStart(2, '0');
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const year = today.getFullYear();
                  setExpenseForm({ ...expenseForm, date: `${day}/${month}/${year}` });
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' as const, fontSize: 14 }}>Bugün</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.expense }]} onPress={handleCreateExpense}>
              <Text style={styles.submitBtnText}>{editingMachineExpenseId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderReceivableModal = () => (
    <Modal visible={receivableModal} animationType="slide" transparent onRequestClose={() => setReceivableModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Alacak</Text>
            <TouchableOpacity onPress={() => setReceivableModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Kişi (Cari Hesap) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accountStore.accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.selectItem, receivableForm.account_id === a.id && styles.selectItemActive]}
                  onPress={() => setReceivableForm({ ...receivableForm, account_id: a.id })}
                >
                  <Text style={[styles.selectItemText, receivableForm.account_id === a.id && styles.selectItemTextActive]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Tarla (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity
                style={[styles.selectItem, !receivableForm.field_id && { backgroundColor: lightColors.accent }]}
                onPress={() => setReceivableForm({ ...receivableForm, field_id: '' })}
              >
                <Text style={[styles.selectItemText, !receivableForm.field_id && { color: '#FFF' }]}>Seçilmedi</Text>
              </TouchableOpacity>
              {machineStore.fields.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.selectItem, receivableForm.field_id === f.id && { backgroundColor: lightColors.accent }]}
                  onPress={() => setReceivableForm({ ...receivableForm, field_id: f.id })}
                >
                  <Text style={[styles.selectItemText, receivableForm.field_id === f.id && { color: '#FFF' }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Makine (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity
                style={[styles.selectItem, !receivableForm.machine_id && { backgroundColor: lightColors.secondary }]}
                onPress={() => setReceivableForm({ ...receivableForm, machine_id: '' })}
              >
                <Text style={[styles.selectItemText, !receivableForm.machine_id && { color: '#FFF' }]}>Seçilmedi</Text>
              </TouchableOpacity>
              {machineStore.machines.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.selectItem, receivableForm.machine_id === m.id && { backgroundColor: lightColors.secondary }]}
                  onPress={() => setReceivableForm({ ...receivableForm, machine_id: m.id })}
                >
                  <Text style={[styles.selectItemText, receivableForm.machine_id === m.id && { color: '#FFF' }]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Dönüm</Text>
                <TextInput
                  style={styles.input}
                  value={receivableForm.decare_count}
                  onChangeText={(t) => {
                    setReceivableForm({ ...receivableForm, decare_count: t });
                    if (t && receivableForm.price_per_decare) {
                      setReceivableForm(prev => ({ ...prev, decare_count: t, amount: String(parseFloat(t) * parseFloat(prev.price_per_decare)) }));
                    }
                  }}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Dönüm Fiyatı</Text>
                <TextInput
                  style={styles.input}
                  value={receivableForm.price_per_decare}
                  onChangeText={(t) => {
                    setReceivableForm({ ...receivableForm, price_per_decare: t });
                    if (t && receivableForm.decare_count) {
                      setReceivableForm(prev => ({ ...prev, price_per_decare: t, amount: String(parseFloat(prev.decare_count) * parseFloat(t)) }));
                    }
                  }}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={styles.inputLabel}>Toplam Tutar (₺) *</Text>
            <TextInput
              style={styles.input}
              value={receivableForm.amount}
              onChangeText={(t) => setReceivableForm({ ...receivableForm, amount: t })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={receivableForm.description}
              onChangeText={(t) => setReceivableForm({ ...receivableForm, description: t })}
              placeholder="İş açıklaması"
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.warning }]} onPress={handleCreateReceivable}>
              <Text style={styles.submitBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFieldModal = () => (
    <Modal visible={fieldModal} animationType="slide" transparent onRequestClose={() => setFieldModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Tarla</Text>
            <TouchableOpacity onPress={() => setFieldModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Tarla Adı *</Text>
            <TextInput
              style={styles.input}
              value={fieldForm.name}
              onChangeText={(t) => setFieldForm({ ...fieldForm, name: t })}
              placeholder="Tarla adı"
            />
            <Text style={styles.inputLabel}>Büyüklük (Dönüm)</Text>
            <TextInput
              style={styles.input}
              value={fieldForm.size_decare}
              onChangeText={(t) => setFieldForm({ ...fieldForm, size_decare: t })}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Sahibi (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity
                style={[styles.selectItem, !fieldForm.account_id && { backgroundColor: lightColors.accent }]}
                onPress={() => setFieldForm({ ...fieldForm, account_id: '' })}
              >
                <Text style={[styles.selectItemText, !fieldForm.account_id && { color: '#FFF' }]}>Seçilmedi</Text>
              </TouchableOpacity>
              {accountStore.accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.selectItem, fieldForm.account_id === a.id && { backgroundColor: lightColors.accent }]}
                  onPress={() => setFieldForm({ ...fieldForm, account_id: a.id })}
                >
                  <Text style={[styles.selectItemText, fieldForm.account_id === a.id && { color: '#FFF' }]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.accent }]} onPress={handleCreateField}>
              <Text style={styles.submitBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderEditTransactionModal = () => (
    <Modal visible={editTransactionModal} animationType="slide" transparent onRequestClose={() => setEditTransactionModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>İşlem Düzenle</Text>
            <TouchableOpacity onPress={() => setEditTransactionModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          {editTransactionForm && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Cari Hesap</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {accountStore.accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.selectItem, editTransactionForm.account_id === acc.id && { backgroundColor: lightColors.primary }]}
                    onPress={() => setEditTransactionForm({ ...editTransactionForm, account_id: acc.id })}
                  >
                    <Text style={[styles.selectItemText, editTransactionForm.account_id === acc.id && { color: '#FFF' }]}>{acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.inputLabel}>İşlem Türü</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.typeBtn, editTransactionForm.transaction_type === 'credit' && { backgroundColor: lightColors.credit }]}
                  onPress={() => setEditTransactionForm({ ...editTransactionForm, transaction_type: 'credit' })}
                >
                  <Text style={[styles.typeBtnText, editTransactionForm.transaction_type === 'credit' && { color: '#FFF' }]}>Alacak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, editTransactionForm.transaction_type === 'debt' && { backgroundColor: lightColors.debt }]}
                  onPress={() => setEditTransactionForm({ ...editTransactionForm, transaction_type: 'debt' })}
                >
                  <Text style={[styles.typeBtnText, editTransactionForm.transaction_type === 'debt' && { color: '#FFF' }]}>Borç</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Tutar (₺) *</Text>
              <TextInput
                style={styles.input}
                value={editTransactionForm.amount}
                onChangeText={(t) => setEditTransactionForm({ ...editTransactionForm, amount: t })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputLabel}>Açıklama</Text>
              <TextInput
                style={styles.input}
                value={editTransactionForm.description}
                onChangeText={(t) => setEditTransactionForm({ ...editTransactionForm, description: t })}
                placeholder="Açıklama"
              />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.primary }]} onPress={handleUpdateTransaction}>
                <Text style={styles.submitBtnText}>Güncelle</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderMachinePersonModal = () => (
    <Modal visible={machinePersonModal} animationType="slide" transparent onRequestClose={() => { setMachinePersonModal(false); setEditingMachinePerson(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingMachinePerson ? 'Kişi Düzenle' : 'Yeni Kişi'}</Text>
            <TouchableOpacity onPress={() => { setMachinePersonModal(false); setEditingMachinePerson(null); setMachinePersonForm({ name: '', phone: '', address: '', notes: '' }); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Ad Soyad *</Text>
            <TextInput
              style={styles.input}
              value={machinePersonForm.name}
              onChangeText={(t) => setMachinePersonForm({ ...machinePersonForm, name: t })}
              placeholder="Kişi adı"
            />
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={machinePersonForm.phone}
              onChangeText={(t) => setMachinePersonForm({ ...machinePersonForm, phone: t })}
              placeholder="05XX XXX XXXX"
              keyboardType="phone-pad"
            />
            <Text style={styles.inputLabel}>Adres</Text>
            <TextInput
              style={styles.input}
              value={machinePersonForm.address}
              onChangeText={(t) => setMachinePersonForm({ ...machinePersonForm, address: t })}
              placeholder="Adres"
            />
            <Text style={styles.inputLabel}>Notlar</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={machinePersonForm.notes}
              onChangeText={(t) => setMachinePersonForm({ ...machinePersonForm, notes: t })}
              placeholder="Ek notlar..."
              multiline
            />
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: '#8B5CF6' }]} 
              onPress={editingMachinePerson ? handleUpdateMachinePerson : handleCreateMachinePerson}
            >
              <Text style={styles.submitBtnText}>{editingMachinePerson ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderMachineFieldModal = () => (
    <Modal visible={machineFieldModal} animationType="slide" transparent onRequestClose={() => { setMachineFieldModal(false); setEditingMachineField(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingMachineField ? 'Tarla Düzenle' : 'Yeni Tarla'}</Text>
            <TouchableOpacity onPress={() => { setMachineFieldModal(false); setEditingMachineField(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Kişi Seç *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {machinePersonStore.persons.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.selectItem, machineFieldForm.person_id === p.id && { backgroundColor: '#8B5CF6' }]}
                  onPress={() => setMachineFieldForm({ ...machineFieldForm, person_id: p.id })}
                >
                  <Text style={[styles.selectItemText, machineFieldForm.person_id === p.id && { color: '#FFF' }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Tarla Adı *</Text>
            <TextInput
              style={styles.input}
              value={machineFieldForm.name}
              onChangeText={(t) => setMachineFieldForm({ ...machineFieldForm, name: t })}
              placeholder="Tarla adı"
            />
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Dekar</Text>
                <TextInput
                  style={styles.input}
                  value={machineFieldForm.size_decare}
                  onChangeText={(t) => setMachineFieldForm({ ...machineFieldForm, size_decare: t })}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Ürün</Text>
                <TextInput
                  style={styles.input}
                  value={machineFieldForm.crop}
                  onChangeText={(t) => setMachineFieldForm({ ...machineFieldForm, crop: t })}
                  placeholder="Buğday, Arpa..."
                />
              </View>
            </View>
            <Text style={styles.inputLabel}>Hasat Tarihi</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={machineFieldForm.harvest_date}
                onChangeText={(t) => setMachineFieldForm({ ...machineFieldForm, harvest_date: t })}
                placeholder="GG/AA/YYYY"
              />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setMachineFieldForm({ ...machineFieldForm, harvest_date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Konum</Text>
            <TextInput
              style={styles.input}
              value={machineFieldForm.location}
              onChangeText={(t) => setMachineFieldForm({ ...machineFieldForm, location: t })}
              placeholder="Köy, mevki..."
            />
            <Text style={styles.inputLabel}>Notlar</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={machineFieldForm.notes}
              onChangeText={(t) => setMachineFieldForm({ ...machineFieldForm, notes: t })}
              placeholder="Ek notlar..."
              multiline
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleCreateMachineField}>
              <Text style={styles.submitBtnText}>{editingMachineField ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ==================== MAKİNE ALACAK MODALI ====================

  const renderMachineReceivableModal = () => {
    const selectedPersonFields = machinePersonStore.machineFields.filter(f => f.person_id === machineReceivableForm.person_id);
    const selectedField = selectedPersonFields.find(f => f.id === machineReceivableForm.field_id);
    
    // Otomatik tutar hesaplama
    const calculateAmount = (pricePerDecare: string) => {
      if (selectedField && pricePerDecare) {
        const price = parseFloat(pricePerDecare);
        const decare = parseFloat(selectedField.size_decare) || 0;
        if (!isNaN(price) && !isNaN(decare)) {
          return (price * decare).toFixed(2);
        }
      }
      return machineReceivableForm.amount;
    };
    
    return (
    <Modal visible={machineReceivableModal} animationType="slide" transparent onRequestClose={() => { setMachineReceivableModal(false); setEditingMachineReceivableId(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingMachineReceivableId ? 'Alacak Düzenle' : 'Yeni Alacak Kaydı'}</Text>
            <TouchableOpacity onPress={() => { setMachineReceivableModal(false); setEditingMachineReceivableId(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Kişi Seç *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {machinePersonStore.persons.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.selectItem, machineReceivableForm.person_id === p.id && { backgroundColor: '#8B5CF6' }]}
                  onPress={() => setMachineReceivableForm({ ...machineReceivableForm, person_id: p.id, field_id: '', price_per_decare: '', amount: '' })}
                >
                  <Text style={[styles.selectItemText, machineReceivableForm.person_id === p.id && { color: '#FFF' }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>Tarla Seç *</Text>
            {!machineReceivableForm.person_id ? (
              <Text style={styles.helperText}>Önce kişi seçiniz</Text>
            ) : selectedPersonFields.length === 0 ? (
              <Text style={styles.helperText}>Bu kişiye ait tarla yok. Önce tarla ekleyin.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {selectedPersonFields.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.selectItem, machineReceivableForm.field_id === f.id && { backgroundColor: '#10B981' }]}
                    onPress={() => {
                      const newAmount = machineReceivableForm.price_per_decare 
                        ? (parseFloat(machineReceivableForm.price_per_decare) * parseFloat(f.size_decare || '0')).toFixed(2)
                        : '';
                      setMachineReceivableForm({ ...machineReceivableForm, field_id: f.id, amount: newAmount });
                    }}
                  >
                    <Text style={[styles.selectItemText, machineReceivableForm.field_id === f.id && { color: '#FFF' }]}>{f.name} ({f.size_decare} dk)</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            <Text style={styles.inputLabel}>Makine (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity
                style={[styles.selectItem, !machineReceivableForm.machine_id && { backgroundColor: lightColors.secondary }]}
                onPress={() => setMachineReceivableForm({ ...machineReceivableForm, machine_id: '' })}
              >
                <Text style={[styles.selectItemText, !machineReceivableForm.machine_id && { color: '#FFF' }]}>Seçilmedi</Text>
              </TouchableOpacity>
              {machineStore.machines.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.selectItem, machineReceivableForm.machine_id === m.id && { backgroundColor: lightColors.secondary }]}
                  onPress={() => setMachineReceivableForm({ ...machineReceivableForm, machine_id: m.id })}
                >
                  <Text style={[styles.selectItemText, machineReceivableForm.machine_id === m.id && { color: '#FFF' }]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Dekar Ücreti */}
            <Text style={styles.inputLabel}>Dekar Ücreti (₺/dk)</Text>
            <TextInput
              style={styles.input}
              value={machineReceivableForm.price_per_decare}
              onChangeText={(t) => {
                const newAmount = selectedField && t 
                  ? (parseFloat(t) * parseFloat(selectedField.size_decare || '0')).toFixed(2)
                  : '';
                setMachineReceivableForm({ ...machineReceivableForm, price_per_decare: t, amount: newAmount || machineReceivableForm.amount });
              }}
              placeholder="Örn: 150"
              keyboardType="decimal-pad"
            />
            
            {/* Hesaplama Gösterimi */}
            {selectedField && machineReceivableForm.price_per_decare && (
              <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#065F46' }}>
                  📊 {selectedField.size_decare} dekar × ₺{machineReceivableForm.price_per_decare}/dk = ₺{machineReceivableForm.amount}
                </Text>
              </View>
            )}
            
            <Text style={styles.inputLabel}>Tutar (₺) *</Text>
            <TextInput
              style={styles.input}
              value={machineReceivableForm.amount}
              onChangeText={(t) => setMachineReceivableForm({ ...machineReceivableForm, amount: t })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            
            {/* İskonto Alanı */}
            <Text style={styles.inputLabel}>İskonto (Opsiyonel)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.selectItem, !machineReceivableForm.discount_type && { backgroundColor: lightColors.secondary }]}
                    onPress={() => setMachineReceivableForm({ ...machineReceivableForm, discount_type: '', discount_value: '' })}
                  >
                    <Text style={[styles.selectItemText, !machineReceivableForm.discount_type && { color: '#FFF' }]}>Yok</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectItem, machineReceivableForm.discount_type === 'percentage' && { backgroundColor: '#F59E0B' }]}
                    onPress={() => setMachineReceivableForm({ ...machineReceivableForm, discount_type: 'percentage' })}
                  >
                    <Text style={[styles.selectItemText, machineReceivableForm.discount_type === 'percentage' && { color: '#FFF' }]}>% Yüzde</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectItem, machineReceivableForm.discount_type === 'amount' && { backgroundColor: '#F59E0B' }]}
                    onPress={() => setMachineReceivableForm({ ...machineReceivableForm, discount_type: 'amount' })}
                  >
                    <Text style={[styles.selectItemText, machineReceivableForm.discount_type === 'amount' && { color: '#FFF' }]}>₺ Tutar</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
              {machineReceivableForm.discount_type && (
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={machineReceivableForm.discount_value}
                  onChangeText={(t) => setMachineReceivableForm({ ...machineReceivableForm, discount_value: t })}
                  placeholder={machineReceivableForm.discount_type === 'percentage' ? '10' : '500'}
                  keyboardType="decimal-pad"
                />
              )}
            </View>
            
            {/* İskonto Hesaplama Gösterimi */}
            {machineReceivableForm.amount && machineReceivableForm.discount_type && machineReceivableForm.discount_value && (
              <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#92400E' }}>
                  {(() => {
                    const gross = parseFloat(machineReceivableForm.amount) || 0;
                    const discountVal = parseFloat(machineReceivableForm.discount_value) || 0;
                    let net = gross;
                    let discountAmount = 0;
                    if (machineReceivableForm.discount_type === 'percentage') {
                      discountAmount = gross * (discountVal / 100);
                      net = gross - discountAmount;
                    } else {
                      discountAmount = discountVal;
                      net = gross - discountVal;
                    }
                    return `🏷️ Brüt: ₺${gross.toFixed(2)} - İskonto: ₺${discountAmount.toFixed(2)} = Net: ₺${Math.max(0, net).toFixed(2)}`;
                  })()}
                </Text>
              </View>
            )}
            
            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={machineReceivableForm.description}
              onChangeText={(t) => setMachineReceivableForm({ ...machineReceivableForm, description: t })}
              placeholder="İş açıklaması"
            />
            <Text style={styles.inputLabel}>Vade Tarihi</Text>
            <TextInput
              style={styles.input}
              value={machineReceivableForm.due_date}
              onChangeText={(t) => setMachineReceivableForm({ ...machineReceivableForm, due_date: t })}
              placeholder="GG/AA/YYYY"
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.warning }]} onPress={handleCreateMachineReceivable}>
              <Text style={styles.submitBtnText}>{editingMachineReceivableId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  };

  // ==================== ÇİFTLİK MODALLARI ====================

  const renderFarmFieldModal = () => (
    <Modal visible={farmFieldModal} animationType="slide" transparent onRequestClose={() => { setFarmFieldModal(false); setEditingFarmFieldId(null); setFarmFieldForm({ name: '', size_decare: '', location: '', crop: '', notes: '' }); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingFarmFieldId ? 'Tarla Düzenle' : 'Yeni Tarla'}</Text>
            <TouchableOpacity onPress={() => { setFarmFieldModal(false); setEditingFarmFieldId(null); setFarmFieldForm({ name: '', size_decare: '', location: '', crop: '', notes: '' }); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Tarla Adı *</Text>
            <TextInput style={styles.input} value={farmFieldForm.name} onChangeText={(t) => setFarmFieldForm({ ...farmFieldForm, name: t })} placeholder="Tarla adı" />
            <Text style={styles.inputLabel}>Dekar</Text>
            <TextInput style={styles.input} value={farmFieldForm.size_decare} onChangeText={(t) => setFarmFieldForm({ ...farmFieldForm, size_decare: t })} placeholder="0" keyboardType="decimal-pad" />
            <Text style={styles.inputLabel}>Ürün</Text>
            <TextInput style={styles.input} value={farmFieldForm.crop} onChangeText={(t) => setFarmFieldForm({ ...farmFieldForm, crop: t })} placeholder="Buğday, Arpa..." />
            <Text style={styles.inputLabel}>Konum</Text>
            <TextInput style={styles.input} value={farmFieldForm.location} onChangeText={(t) => setFarmFieldForm({ ...farmFieldForm, location: t })} placeholder="Köy, mevki..." />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#059669' }]} onPress={handleCreateFarmField}>
              <Text style={styles.submitBtnText}>{editingFarmFieldId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFarmIncomeModal = () => (
    <Modal visible={farmIncomeModal} animationType="slide" transparent onRequestClose={() => { setFarmIncomeModal(false); setEditingFarmIncomeId(null); setFarmIncomeForm({ field_id: '', income_type: '', amount: '', description: '', date: getTodayFormatted() }); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingFarmIncomeId ? 'Gelir Düzenle' : 'Yeni Gelir'}</Text>
            <TouchableOpacity onPress={() => { setFarmIncomeModal(false); setEditingFarmIncomeId(null); setFarmIncomeForm({ field_id: '', income_type: '', amount: '', description: '', date: getTodayFormatted() }); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Gelir Tipi *</Text>
            <TextInput style={styles.input} value={farmIncomeForm.income_type} onChangeText={(t) => setFarmIncomeForm({ ...farmIncomeForm, income_type: t })} placeholder="Örn: Satış, Destek, Kira..." />
            <Text style={styles.inputLabel}>Tutar *</Text>
            <TextInput style={styles.input} value={farmIncomeForm.amount} onChangeText={(t) => setFarmIncomeForm({ ...farmIncomeForm, amount: t })} placeholder="0.00" keyboardType="decimal-pad" />
            <Text style={styles.inputLabel}>Tarla (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity style={[styles.selectItem, !farmIncomeForm.field_id && { backgroundColor: '#059669' }]} onPress={() => setFarmIncomeForm({ ...farmIncomeForm, field_id: '' })}>
                <Text style={[styles.selectItemText, !farmIncomeForm.field_id && { color: '#FFF' }]}>Genel</Text>
              </TouchableOpacity>
              {farmStore.fields.map((f: any) => (
                <TouchableOpacity key={f.id} style={[styles.selectItem, farmIncomeForm.field_id === f.id && { backgroundColor: '#059669' }]} onPress={() => setFarmIncomeForm({ ...farmIncomeForm, field_id: f.id })}>
                  <Text style={[styles.selectItemText, farmIncomeForm.field_id === f.id && { color: '#FFF' }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput style={styles.input} value={farmIncomeForm.description} onChangeText={(t) => setFarmIncomeForm({ ...farmIncomeForm, description: t })} placeholder="Açıklama" />
            <Text style={styles.inputLabel}>Tarih</Text>
            <View style={styles.dateInputRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={farmIncomeForm.date} onChangeText={(t) => setFarmIncomeForm({ ...farmIncomeForm, date: t })} placeholder="GG/AA/YYYY" />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setFarmIncomeForm({ ...farmIncomeForm, date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.income }]} onPress={handleCreateFarmIncome}>
              <Text style={styles.submitBtnText}>{editingFarmIncomeId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFarmExpenseModal = () => (
    <Modal visible={farmExpenseModal} animationType="slide" transparent onRequestClose={() => { setFarmExpenseModal(false); setEditingFarmExpenseId(null); setFarmExpenseForm({ field_id: '', expense_type: '', amount: '', description: '', date: getTodayFormatted() }); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingFarmExpenseId ? 'Gider Düzenle' : 'Yeni Gider'}</Text>
            <TouchableOpacity onPress={() => { setFarmExpenseModal(false); setEditingFarmExpenseId(null); setFarmExpenseForm({ field_id: '', expense_type: '', amount: '', description: '', date: getTodayFormatted() }); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Gider Tipi *</Text>
            <TextInput style={styles.input} value={farmExpenseForm.expense_type} onChangeText={(t) => setFarmExpenseForm({ ...farmExpenseForm, expense_type: t })} placeholder="Örn: Tohum, Gübre, İlaç..." />
            <Text style={styles.inputLabel}>Tutar *</Text>
            <TextInput style={styles.input} value={farmExpenseForm.amount} onChangeText={(t) => setFarmExpenseForm({ ...farmExpenseForm, amount: t })} placeholder="0.00" keyboardType="decimal-pad" />
            <Text style={styles.inputLabel}>Tarla (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity style={[styles.selectItem, !farmExpenseForm.field_id && { backgroundColor: '#059669' }]} onPress={() => setFarmExpenseForm({ ...farmExpenseForm, field_id: '' })}>
                <Text style={[styles.selectItemText, !farmExpenseForm.field_id && { color: '#FFF' }]}>Genel</Text>
              </TouchableOpacity>
              {farmStore.fields.map((f: any) => (
                <TouchableOpacity key={f.id} style={[styles.selectItem, farmExpenseForm.field_id === f.id && { backgroundColor: '#059669' }]} onPress={() => setFarmExpenseForm({ ...farmExpenseForm, field_id: f.id })}>
                  <Text style={[styles.selectItemText, farmExpenseForm.field_id === f.id && { color: '#FFF' }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Açıklama</Text>
            <TextInput style={styles.input} value={farmExpenseForm.description} onChangeText={(t) => setFarmExpenseForm({ ...farmExpenseForm, description: t })} placeholder="Açıklama" />
            <Text style={styles.inputLabel}>Tarih</Text>
            <View style={styles.dateInputRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={farmExpenseForm.date} onChangeText={(t) => setFarmExpenseForm({ ...farmExpenseForm, date: t })} placeholder="GG/AA/YYYY" />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setFarmExpenseForm({ ...farmExpenseForm, date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.expense }]} onPress={handleCreateFarmExpense}>
              <Text style={styles.submitBtnText}>{editingFarmExpenseId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFarmCreditModal = () => (
    <Modal visible={farmCreditModal} animationType="slide" transparent onRequestClose={() => { setFarmCreditModal(false); setEditingCreditId(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingCreditId ? 'Kredi Düzenle' : 'Yeni Kredi'}</Text>
            <TouchableOpacity onPress={() => { setFarmCreditModal(false); setEditingCreditId(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Banka/Kurum Adı *</Text>
            <TextInput style={styles.input} value={farmCreditForm.bank_name} onChangeText={(t) => setFarmCreditForm({ ...farmCreditForm, bank_name: t })} placeholder="Banka adı" />
            
            <Text style={styles.inputLabel}>Ana Para (₺) *</Text>
            <TextInput style={styles.input} value={farmCreditForm.amount} onChangeText={(t) => setFarmCreditForm({ ...farmCreditForm, amount: t })} placeholder="0.00" keyboardType="decimal-pad" />
            
            <Text style={styles.inputLabel}>Yıllık Faiz Oranı (%)</Text>
            <TextInput style={styles.input} value={farmCreditForm.interest_rate} onChangeText={(t) => setFarmCreditForm({ ...farmCreditForm, interest_rate: t })} placeholder="0" keyboardType="decimal-pad" />
            
            <Text style={styles.inputLabel}>Faiz Tipi</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              <TouchableOpacity
                style={[styles.filterChip, { flex: 1 }, farmCreditForm.interest_type === 'simple' && styles.filterChipActive]}
                onPress={() => setFarmCreditForm({ ...farmCreditForm, interest_type: 'simple' })}
              >
                <Text style={[styles.filterChipText, farmCreditForm.interest_type === 'simple' && styles.filterChipTextActive]}>
                  Basit Faiz
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, { flex: 1 }, farmCreditForm.interest_type === 'compound' && styles.filterChipActive]}
                onPress={() => setFarmCreditForm({ ...farmCreditForm, interest_type: 'compound' })}
              >
                <Text style={[styles.filterChipText, farmCreditForm.interest_type === 'compound' && styles.filterChipTextActive]}>
                  Bileşik Faiz
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Kredi Başlangıç Tarihi</Text>
            <View style={styles.dateInputRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={farmCreditForm.start_date} onChangeText={(t) => setFarmCreditForm({ ...farmCreditForm, start_date: t })} placeholder="GG/AA/YYYY" />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setFarmCreditForm({ ...farmCreditForm, start_date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Vade Tarihi</Text>
            <View style={styles.dateInputRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={farmCreditForm.due_date} onChangeText={(t) => setFarmCreditForm({ ...farmCreditForm, due_date: t })} placeholder="GG/AA/YYYY" />
              <TouchableOpacity style={styles.todayBtn} onPress={() => {
                // 12 ay sonrası - dd/mm/yyyy formatında
                const d = new Date();
                d.setMonth(d.getMonth() + 12);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                setFarmCreditForm({ ...farmCreditForm, due_date: `${day}/${month}/${year}` });
              }}>
                <Text style={styles.todayBtnText}>+12 Ay</Text>
              </TouchableOpacity>
            </View>
            
            {/* Tahmini Faiz Hesaplama */}
            {farmCreditForm.amount && farmCreditForm.interest_rate && (
              <View style={[styles.totalBox, { backgroundColor: '#DBEAFE' }]}>
                <View>
                  <Text style={[styles.totalLabel, { color: '#1E40AF' }]}>Tahmini Yıllık Faiz ({farmCreditForm.interest_type === 'compound' ? 'Bileşik' : 'Basit'}):</Text>
                  <Text style={{ fontSize: 10, color: '#6B7280' }}>
                    {farmCreditForm.interest_type === 'compound' 
                      ? 'Formül: Anapara × (1 + Oran)^Yıl - Anapara' 
                      : 'Formül: Anapara × Oran × Yıl'}
                  </Text>
                </View>
                <Text style={[styles.totalValue, { color: '#1E40AF' }]}>
                  {formatCurrency(
                    farmCreditForm.interest_type === 'compound'
                      ? parseFloat(farmCreditForm.amount || '0') * Math.pow(1 + parseFloat(farmCreditForm.interest_rate || '0') / 100, 1) - parseFloat(farmCreditForm.amount || '0')
                      : parseFloat(farmCreditForm.amount || '0') * (parseFloat(farmCreditForm.interest_rate || '0') / 100)
                  )}
                </Text>
              </View>
            )}
            
            <Text style={styles.inputLabel}>Notlar</Text>
            <TextInput style={[styles.input, { height: 60 }]} value={farmCreditForm.notes} onChangeText={(t) => setFarmCreditForm({ ...farmCreditForm, notes: t })} placeholder="Ek notlar..." multiline />
            
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#3B82F6' }]} onPress={handleCreateFarmCredit}>
              <Text style={styles.submitBtnText}>{editingCreditId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFarmHarvestModal = () => (
    <Modal visible={farmHarvestModal} animationType="slide" transparent onRequestClose={() => { setFarmHarvestModal(false); setEditingFarmHarvestId(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingFarmHarvestId ? 'Hasat Düzenle' : 'Yeni Hasat'}</Text>
            <TouchableOpacity onPress={() => { setFarmHarvestModal(false); setEditingFarmHarvestId(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Ürün Adı *</Text>
            <TextInput style={styles.input} value={farmHarvestForm.crop_name} onChangeText={(t) => setFarmHarvestForm({ ...farmHarvestForm, crop_name: t })} placeholder="Buğday, Arpa..." />
            <Text style={styles.inputLabel}>Miktar *</Text>
            <TextInput style={styles.input} value={farmHarvestForm.quantity} onChangeText={(t) => setFarmHarvestForm({ ...farmHarvestForm, quantity: t })} placeholder="0" keyboardType="decimal-pad" />
            <Text style={styles.inputLabel}>Birim</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {Object.entries(stockUnitLabels).map(([key, label]) => (
                <TouchableOpacity key={key} style={[styles.selectItem, farmHarvestForm.unit === key && { backgroundColor: '#F59E0B' }]} onPress={() => setFarmHarvestForm({ ...farmHarvestForm, unit: key })}>
                  <Text style={[styles.selectItemText, farmHarvestForm.unit === key && { color: '#FFF' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Tarla</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity style={[styles.selectItem, !farmHarvestForm.field_id && { backgroundColor: '#059669' }]} onPress={() => setFarmHarvestForm({ ...farmHarvestForm, field_id: '' })}>
                <Text style={[styles.selectItemText, !farmHarvestForm.field_id && { color: '#FFF' }]}>Genel</Text>
              </TouchableOpacity>
              {farmStore.fields.map((f: any) => (
                <TouchableOpacity key={f.id} style={[styles.selectItem, farmHarvestForm.field_id === f.id && { backgroundColor: '#059669' }]} onPress={() => setFarmHarvestForm({ ...farmHarvestForm, field_id: f.id })}>
                  <Text style={[styles.selectItemText, farmHarvestForm.field_id === f.id && { color: '#FFF' }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Hasat Tarihi</Text>
            <View style={styles.dateInputRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={farmHarvestForm.harvest_date} onChangeText={(t) => setFarmHarvestForm({ ...farmHarvestForm, harvest_date: t })} placeholder="GG/AA/YYYY" />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setFarmHarvestForm({ ...farmHarvestForm, harvest_date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#F59E0B' }]} onPress={handleCreateFarmHarvest}>
              <Text style={styles.submitBtnText}>{editingFarmHarvestId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderFarmSaleModal = () => {
    // Seçilen ürünün stok miktarını bul
    const selectedStock = farmStore.stocks.find(s => s.item_name === farmSaleForm.crop_name && s.unit === farmSaleForm.unit);
    const availableQty = selectedStock?.quantity || 0;
    const saleQty = parseFloat(farmSaleForm.quantity) || 0;
    const isOverStock = saleQty > availableQty;
    
    return (
    <Modal visible={farmSaleModal} animationType="slide" transparent onRequestClose={() => { setFarmSaleModal(false); setEditingFarmSaleId(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingFarmSaleId ? 'Satış Düzenle' : 'Yeni Satış'}</Text>
            <TouchableOpacity onPress={() => { setFarmSaleModal(false); setEditingFarmSaleId(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Depodan Ürün Seç *</Text>
            {farmStore.stocks.length === 0 ? (
              <Text style={styles.helperText}>Depoda ürün yok. Önce hasat yapın.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {farmStore.stocks.filter(s => s.quantity > 0).map((stock) => (
                  <TouchableOpacity
                    key={stock.id}
                    style={[styles.stockSelectItem, farmSaleForm.crop_name === stock.item_name && farmSaleForm.unit === stock.unit && { backgroundColor: '#10B981' }]}
                    onPress={() => setFarmSaleForm({ ...farmSaleForm, crop_name: stock.item_name, unit: stock.unit, field_id: stock.field_id || '' })}
                  >
                    <Text style={[styles.stockSelectName, farmSaleForm.crop_name === stock.item_name && farmSaleForm.unit === stock.unit && { color: '#FFF' }]}>{stock.item_name}</Text>
                    <Text style={[styles.stockSelectQty, farmSaleForm.crop_name === stock.item_name && farmSaleForm.unit === stock.unit && { color: '#FFF' }]}>{stock.quantity} {stockUnitLabels[stock.unit]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {selectedStock && (
              <View style={styles.stockInfoBox}>
                <Ionicons name="cube-outline" size={18} color={lightColors.primary} />
                <Text style={styles.stockInfoText}>Mevcut Depo: {availableQty} {stockUnitLabels[farmSaleForm.unit]}</Text>
              </View>
            )}
            
            <Text style={styles.inputLabel}>Satış Miktarı *</Text>
            <TextInput 
              style={[styles.input, isOverStock && { borderColor: lightColors.error, borderWidth: 2 }]} 
              value={farmSaleForm.quantity} 
              onChangeText={(t) => setFarmSaleForm({ ...farmSaleForm, quantity: t })} 
              placeholder="0" 
              keyboardType="decimal-pad" 
            />
            {isOverStock && (
              <Text style={styles.errorText}>⚠️ Depoda yeterli ürün yok! (Mevcut: {availableQty})</Text>
            )}
            
            <Text style={styles.inputLabel}>Birim Fiyat (₺) *</Text>
            <TextInput style={styles.input} value={farmSaleForm.unit_price} onChangeText={(t) => setFarmSaleForm({ ...farmSaleForm, unit_price: t })} placeholder="0.00" keyboardType="decimal-pad" />
            
            {saleQty > 0 && parseFloat(farmSaleForm.unit_price) > 0 && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Toplam Tutar:</Text>
                <Text style={styles.totalValue}>{formatCurrency(saleQty * parseFloat(farmSaleForm.unit_price))}</Text>
              </View>
            )}
            
            <Text style={styles.inputLabel}>Alıcı</Text>
            <TextInput style={styles.input} value={farmSaleForm.buyer_name} onChangeText={(t) => setFarmSaleForm({ ...farmSaleForm, buyer_name: t })} placeholder="Alıcı adı" />
            <Text style={styles.inputLabel}>Satış Tarihi</Text>
            <View style={styles.dateInputRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={farmSaleForm.sale_date} onChangeText={(t) => setFarmSaleForm({ ...farmSaleForm, sale_date: t })} placeholder="GG/AA/YYYY" />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setFarmSaleForm({ ...farmSaleForm, sale_date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: isOverStock ? lightColors.textSecondary : '#10B981' }]} 
              onPress={handleCreateFarmSale}
              disabled={isOverStock}
            >
              <Text style={styles.submitBtnText}>{editingFarmSaleId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  };

  const renderFarmStockModal = () => (
    <Modal visible={farmStockModal} animationType="slide" transparent onRequestClose={() => { setFarmStockModal(false); setEditingFarmStockId(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingFarmStockId ? 'Depo Düzenle' : 'Yeni Depo'}</Text>
            <TouchableOpacity onPress={() => { setFarmStockModal(false); setEditingFarmStockId(null); }}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Ürün Adı *</Text>
            <TextInput style={styles.input} value={farmStockForm.item_name} onChangeText={(t) => setFarmStockForm({ ...farmStockForm, item_name: t })} placeholder="Ürün adı" />
            <Text style={styles.inputLabel}>Miktar *</Text>
            <TextInput style={styles.input} value={farmStockForm.quantity} onChangeText={(t) => setFarmStockForm({ ...farmStockForm, quantity: t })} placeholder="0" keyboardType="decimal-pad" />
            <Text style={styles.inputLabel}>Birim</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {Object.entries(stockUnitLabels).map(([key, label]) => (
                <TouchableOpacity key={key} style={[styles.selectItem, farmStockForm.unit === key && { backgroundColor: '#6366F1' }]} onPress={() => setFarmStockForm({ ...farmStockForm, unit: key })}>
                  <Text style={[styles.selectItemText, farmStockForm.unit === key && { color: '#FFF' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Kategori</Text>
            <TextInput style={styles.input} value={farmStockForm.category} onChangeText={(t) => setFarmStockForm({ ...farmStockForm, category: t })} placeholder="Tohum, Gübre..." />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#6366F1' }]} onPress={handleCreateFarmStock}>
              <Text style={styles.submitBtnText}>{editingFarmStockId ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Yıllık Stok Modal
  const renderAnnualStockModal = () => (
    <Modal visible={showAnnualStockModal} animationType="slide" transparent onRequestClose={() => setShowAnnualStockModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingAnnualStock ? 'Depo Düzenle' : 'Yıllık Depo Ekle'}</Text>
            <TouchableOpacity onPress={() => setShowAnnualStockModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Depo Tipi *</Text>
            <TextInput
              style={styles.input}
              value={annualStockForm.stock_type}
              onChangeText={(t) => setAnnualStockForm({ ...annualStockForm, stock_type: t })}
              placeholder="Örn: Gübre, İlaç, Tohum..."
            />
            
            <Text style={styles.inputLabel}>Ürün Adı *</Text>
            <TextInput
              style={styles.input}
              value={annualStockForm.name}
              onChangeText={(t) => setAnnualStockForm({ ...annualStockForm, name: t })}
              placeholder="Örn: 20-20-0 Gübre"
            />
            
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Miktar *</Text>
                <TextInput
                  style={styles.input}
                  value={annualStockForm.quantity}
                  onChangeText={(t) => setAnnualStockForm({ ...annualStockForm, quantity: t })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Birim *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['kg', 'litre', 'paket', 'torba', 'cuval', 'ton', 'adet'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.selectItem, annualStockForm.unit === unit && { backgroundColor: '#7C3AED' }]}
                      onPress={() => setAnnualStockForm({ ...annualStockForm, unit })}
                    >
                      <Text style={[styles.selectItemText, annualStockForm.unit === unit && { color: '#FFF' }]}>
                        {stockUnitLabels[unit] || unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Birim Fiyat (₺) *</Text>
            <TextInput
              style={styles.input}
              value={annualStockForm.unit_price}
              onChangeText={(t) => setAnnualStockForm({ ...annualStockForm, unit_price: t })}
              placeholder="0.00"
              keyboardType="numeric"
            />
            
            {annualStockForm.quantity && annualStockForm.unit_price && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Toplam Maliyet:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(parseFloat(annualStockForm.quantity || '0') * parseFloat(annualStockForm.unit_price || '0'))}
                </Text>
              </View>
            )}
            
            <Text style={styles.inputLabel}>Alım Tarihi</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={annualStockForm.purchase_date}
                onChangeText={(t) => setAnnualStockForm({ ...annualStockForm, purchase_date: t })}
                placeholder="YYYY-MM-DD"
              />
              <TouchableOpacity style={styles.todayBtn} onPress={() => setAnnualStockForm({ ...annualStockForm, purchase_date: getTodayDate() })}>
                <Text style={styles.todayBtnText}>Bugün</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Notlar</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={annualStockForm.notes}
              onChangeText={(t) => setAnnualStockForm({ ...annualStockForm, notes: t })}
              placeholder="Opsiyonel notlar..."
              multiline
            />
            
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#7C3AED' }]} onPress={handleCreateAnnualStock}>
              <Text style={styles.submitBtnText}>{editingAnnualStock ? 'Güncelle' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Tarla Stok Kullanım Modal
  const renderFieldStockUsageModal = () => {
    const selectedStock = editingFieldStockUsage 
      ? annualStocks.find(s => s.id === editingFieldStockUsage.stock_id)
      : annualStocks.find(s => s.id === fieldStockUsageForm.stock_id);
    const isEditing = !!editingFieldStockUsage;
    
    return (
      <Modal visible={showFieldStockUsageModal} animationType="slide" transparent onRequestClose={() => { setShowFieldStockUsageModal(false); setEditingFieldStockUsage(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Kullanım Düzenle' : 'Depo Tarlaya Ata'}</Text>
              <TouchableOpacity onPress={() => { setShowFieldStockUsageModal(false); setEditingFieldStockUsage(null); }}>
                <Ionicons name="close" size={24} color={lightColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {!isEditing && (
                <View>
                  <Text style={styles.inputLabel}>Tarla *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {farmStore.fields.map((field: any) => (
                      <TouchableOpacity
                        key={field.id}
                        style={[styles.selectItem, fieldStockUsageForm.field_id === field.id && { backgroundColor: '#059669' }]}
                        onPress={() => setFieldStockUsageForm({ ...fieldStockUsageForm, field_id: field.id })}
                      >
                        <Text style={[styles.selectItemText, fieldStockUsageForm.field_id === field.id && { color: '#FFF' }]}>
                          {field.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  <Text style={styles.inputLabel}>Depo *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {annualStocks.filter(s => s.remaining_quantity > 0).map((stock) => (
                      <TouchableOpacity
                        key={stock.id}
                        style={[styles.selectItem, fieldStockUsageForm.stock_id === stock.id && { backgroundColor: '#7C3AED' }]}
                        onPress={() => setFieldStockUsageForm({ ...fieldStockUsageForm, stock_id: stock.id })}
                      >
                        <Text style={[styles.selectItemText, fieldStockUsageForm.stock_id === stock.id && { color: '#FFF' }]}>
                          {stock.name} ({stock.remaining_quantity} {stock.unit})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {isEditing && (
                <View style={{ backgroundColor: '#F3E8FF', padding: spacing.md, borderRadius: borders.radius.md, marginBottom: spacing.md }}>
                  <Text style={{ color: '#7C3AED', fontWeight: '600' as const }}>
                    📦 {editingFieldStockUsage.stock_name} → 🌾 {editingFieldStockUsage.field_name}
                  </Text>
                  <Text style={{ color: lightColors.textSecondary, marginTop: 4 }}>
                    Mevcut kullanım: {editingFieldStockUsage.used_quantity} {selectedStock?.unit || ''}
                  </Text>
                </View>
              )}
              
              {selectedStock && !isEditing && (
                <View style={{ backgroundColor: '#F3E8FF', padding: spacing.md, borderRadius: borders.radius.md, marginBottom: spacing.md }}>
                  <Text style={{ color: '#7C3AED', fontWeight: '600' as const }}>
                    Seçilen: {selectedStock.name}
                  </Text>
                  <Text style={{ color: lightColors.textSecondary, marginTop: 4 }}>
                    Kalan: {selectedStock.remaining_quantity} {selectedStock.unit} • Birim Fiyat: {formatCurrency(selectedStock.unit_price)}
                  </Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Kullanılacak Miktar *</Text>
              <TextInput
                style={styles.input}
                value={fieldStockUsageForm.used_quantity}
                onChangeText={(t) => setFieldStockUsageForm({ ...fieldStockUsageForm, used_quantity: t })}
                placeholder={selectedStock ? `Max: ${isEditing ? (selectedStock.remaining_quantity + editingFieldStockUsage?.used_quantity) : selectedStock.remaining_quantity}` : '0'}
                keyboardType="numeric"
              />
              
              {selectedStock && fieldStockUsageForm.used_quantity && (
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Toplam Maliyet:</Text>
                  <Text style={[styles.totalValue, { color: lightColors.expense }]}>
                    {formatCurrency(parseFloat(fieldStockUsageForm.used_quantity || '0') * selectedStock.unit_price)}
                  </Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Kullanım Tarihi</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={fieldStockUsageForm.usage_date}
                  onChangeText={(t) => setFieldStockUsageForm({ ...fieldStockUsageForm, usage_date: t })}
                  placeholder="GG/AA/YYYY"
                />
                <TouchableOpacity style={styles.todayBtn} onPress={() => setFieldStockUsageForm({ ...fieldStockUsageForm, usage_date: getTodayFormatted() })}>
                  <Text style={styles.todayBtnText}>Bugün</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Notlar</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={fieldStockUsageForm.notes}
                onChangeText={(t) => setFieldStockUsageForm({ ...fieldStockUsageForm, notes: t })}
                placeholder="Opsiyonel notlar..."
                multiline
              />
              
              {/* Gidere Ekle Checkbox - Sadece yeni kayıt için */}
              {!isEditing && (
                <TouchableOpacity 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: spacing.md, 
                    backgroundColor: fieldStockUsageForm.add_to_expense ? '#FEF3C7' : '#F3F4F6',
                    borderRadius: borders.radius.md,
                    marginBottom: spacing.md,
                    borderWidth: 1,
                    borderColor: fieldStockUsageForm.add_to_expense ? '#F59E0B' : '#E5E7EB'
                  }}
                  onPress={() => setFieldStockUsageForm({ ...fieldStockUsageForm, add_to_expense: !fieldStockUsageForm.add_to_expense })}
                >
                  <View style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 6, 
                    borderWidth: 2, 
                    borderColor: fieldStockUsageForm.add_to_expense ? '#F59E0B' : '#9CA3AF',
                    backgroundColor: fieldStockUsageForm.add_to_expense ? '#F59E0B' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.sm
                  }}>
                    {fieldStockUsageForm.add_to_expense && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600' as const, color: lightColors.text }}>Gidere Ekle</Text>
                    <Text style={{ fontSize: 12, color: lightColors.textSecondary }}>
                      Bu kullanımı otomatik olarak çiftlik giderlerine ekle
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: '#059669' }]} 
                onPress={isEditing ? handleUpdateFieldStockUsage : handleCreateFieldStockUsage}
              >
                <Text style={styles.submitBtnText}>{isEditing ? 'Güncelle' : 'Tarlaya Ata'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderEditAccountModal = () => (
    <Modal visible={editAccountModal} animationType="slide" transparent onRequestClose={() => setEditAccountModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hesap Düzenle</Text>
            <TouchableOpacity onPress={() => setEditAccountModal(false)}>
              <Ionicons name="close" size={24} color={lightColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Ad Soyad *</Text>
            <TextInput
              style={styles.input}
              value={editAccountForm?.name || ''}
              onChangeText={(t) => setEditAccountForm(prev => prev ? { ...prev, name: t } : null)}
              placeholder="Ad Soyad"
            />
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={editAccountForm?.phone || ''}
              onChangeText={(t) => setEditAccountForm(prev => prev ? { ...prev, phone: t } : null)}
              placeholder="05XX XXX XXXX"
              keyboardType="phone-pad"
            />
            <Text style={styles.inputLabel}>Hesap Tipi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {Object.entries(accountTypeLabels).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.selectItem, editAccountForm?.account_type === key && { backgroundColor: lightColors.primary }]}
                  onPress={() => setEditAccountForm(prev => prev ? { ...prev, account_type: key as AccountType } : null)}
                >
                  <Text style={[styles.selectItemText, editAccountForm?.account_type === key && { color: '#FFF' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateAccount}>
              <Text style={styles.submitBtnText}>Güncelle</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!detailModal) return null;
    const { type, data } = detailModal;

    return (
      <Modal visible={true} animationType="slide" transparent onRequestClose={() => setDetailModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {type === 'account' ? 'Cari Hesap Detayı' : type === 'machine' ? 'Makine Detayı' : type === 'machinePerson' ? 'Kişi Detayı' : type === 'machineField' ? 'Tarla Detayı' : type === 'plan' ? 'Plan Detayı' : 'Detay'}
              </Text>
              <TouchableOpacity onPress={() => setDetailModal(null)}>
                <Ionicons name="close" size={24} color={lightColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {type === 'machinePerson' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: '#8B5CF6' }]}>
                      <Ionicons name="person-circle" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.name}</Text>
                    <Text style={[styles.detailBalance, { color: data.balance > 0 ? lightColors.warning : lightColors.credit }]}>
                      {formatCurrency(data.balance)}
                    </Text>
                    <Text style={styles.detailSubtext}>{data.balance > 0 ? 'Bekleyen Alacak' : 'Tümü Ödendi'}</Text>
                  </View>
                  {data.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.phone}</Text>
                    </View>
                  )}
                  {data.address && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.address}</Text>
                    </View>
                  )}
                  
                  {/* Kişiye Ait Tarlalar */}
                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Tarlalar ({machinePersonStore.machineFields.filter(f => f.person_id === data.id).length})</Text>
                  {machinePersonStore.machineFields
                    .filter(f => f.person_id === data.id)
                    .map((field) => (
                      <TouchableOpacity
                        key={field.id}
                        style={styles.personFieldCard}
                        onPress={() => setDetailModal({ type: 'machineField', data: field })}
                      >
                        <View style={styles.personFieldIcon}>
                          <Ionicons name="map" size={20} color="#10B981" />
                        </View>
                        <View style={styles.personFieldInfo}>
                          <Text style={styles.personFieldName}>{field.name}</Text>
                          <Text style={styles.personFieldDetail}>{field.size_decare} Dekar • {field.crop || 'Ürün belirtilmedi'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={lightColors.textSecondary} />
                      </TouchableOpacity>
                    ))
                  }
                  {machinePersonStore.machineFields.filter(f => f.person_id === data.id).length === 0 && (
                    <Text style={styles.emptyFieldText}>Henüz tarla eklenmedi</Text>
                  )}
                  
                  {/* Kişiye Ait Alacaklar */}
                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Alacaklar ({machinePersonStore.machineReceivables.filter(r => r.person_id === data.id).length})</Text>
                  {machinePersonStore.machineReceivables
                    .filter(r => r.person_id === data.id)
                    .map((receivable) => (
                      <TouchableOpacity
                        key={receivable.id}
                        style={styles.personFieldCard}
                        onPress={() => setDetailModal({ type: 'machineReceivable', data: receivable })}
                      >
                        <View style={[styles.personFieldIcon, { backgroundColor: receivableStatusColors[receivable.status] + '20' }]}>
                          <Ionicons name="cash" size={20} color={receivableStatusColors[receivable.status]} />
                        </View>
                        <View style={styles.personFieldInfo}>
                          <Text style={styles.personFieldName}>{receivable.field_name || 'Genel Alacak'}</Text>
                          <Text style={styles.personFieldDetail}>{formatCurrency(receivable.remaining_amount)} / {formatCurrency(receivable.amount)} • {receivableStatusLabels[receivable.status]}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={lightColors.textSecondary} />
                      </TouchableOpacity>
                    ))
                  }
                  {machinePersonStore.machineReceivables.filter(r => r.person_id === data.id).length === 0 && (
                    <Text style={styles.emptyFieldText}>Henüz alacak kaydı yok</Text>
                  )}
                  
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                      onPress={() => openEditPersonModal(data)}
                    >
                      <Ionicons name="pencil" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => openBulkPaymentModal(data)}
                    >
                      <Ionicons name="wallet" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Toplu Ödeme</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.detailActions, { marginTop: spacing.sm }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.warning }]}
                      onPress={() => {
                        setDetailModal(null);
                        setMachineReceivableForm({ ...machineReceivableForm, person_id: data.id, field_id: '' });
                        setMachineReceivableModal(true);
                      }}
                    >
                      <Ionicons name="cash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Alacak Ekle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                      onPress={() => {
                        setDetailModal(null);
                        setSelectedPersonForBulkReceivable(data.id);
                        setBulkReceivableItems([{ field_id: '', machine_id: '', amount: '', description: '', work_date: getTodayFormatted(), decare_count: '', price_per_decare: '' }]);
                        setBulkReceivableModal(true);
                      }}
                    >
                      <Ionicons name="list" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Toplu Alacak</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.detailActions, { marginTop: spacing.sm }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#14B8A6' }]}
                      onPress={() => {
                        setDetailModal(null);
                        setMachineFieldForm({ ...machineFieldForm, person_id: data.id });
                        setMachineFieldModal(true);
                      }}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Tarla Ekle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteMachinePerson(data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {type === 'machineField' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="map" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.name}</Text>
                    <Text style={styles.detailSubtext}>{data.person_name}</Text>
                  </View>
                  {data.size_decare && (
                    <View style={styles.detailRow}>
                      <Ionicons name="resize-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.size_decare} Dekar</Text>
                    </View>
                  )}
                  {data.crop && (
                    <View style={styles.detailRow}>
                      <Ionicons name="leaf-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.crop}</Text>
                    </View>
                  )}
                  {data.harvest_date && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>Hasat: {formatDate(data.harvest_date)}</Text>
                    </View>
                  )}
                  {data.location && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.location}</Text>
                    </View>
                  )}
                  {data.notes && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.notes}</Text>
                    </View>
                  )}
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.primary }]}
                      onPress={() => {
                        setDetailModal(null);
                        setEditingMachineField(data);
                        setMachineFieldForm({
                          person_id: data.person_id,
                          name: data.name,
                          size_decare: data.size_decare?.toString() || '',
                          crop: data.crop || '',
                          harvest_date: data.harvest_date ? data.harvest_date.split('T')[0] : '',
                          location: data.location || '',
                          notes: data.notes || '',
                        });
                        setMachineFieldModal(true);
                      }}
                    >
                      <Ionicons name="create" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteMachineField(data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {type === 'machineReceivable' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: receivableStatusColors[data.status] || lightColors.warning }]}>
                      <Ionicons name="cash" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.person_name}</Text>
                    <Text style={[styles.detailBalance, { color: data.remaining_amount > 0 ? lightColors.warning : lightColors.credit }]}>
                      {formatCurrency(data.remaining_amount)}
                    </Text>
                    <Text style={styles.detailSubtext}>
                      {data.remaining_amount > 0 ? `Kalan / ${formatCurrency(data.net_amount || data.amount)}` : 'Tamamı Ödendi'}
                    </Text>
                  </View>
                  
                  {/* Alacak Bilgileri */}
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>📋 Alacak Bilgileri</Text>
                    {data.field_name && (
                      <View style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>Tarla</Text>
                        <Text style={styles.fieldRowValue}>{data.field_name}</Text>
                      </View>
                    )}
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Toplam Tutar</Text>
                      <Text style={styles.fieldRowValue}>{formatCurrency(data.amount)}</Text>
                    </View>
                    {data.discount_value > 0 && (
                      <View style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>İskonto</Text>
                        <Text style={[styles.fieldRowValue, { color: lightColors.credit }]}>
                          -{data.discount_type === 'percentage' ? `%${data.discount_value}` : formatCurrency(data.discount_value)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Net Tutar</Text>
                      <Text style={[styles.fieldRowValue, { fontWeight: '700' }]}>{formatCurrency(data.net_amount || data.amount)}</Text>
                    </View>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Ödenen</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.credit }]}>{formatCurrency(data.paid_amount || 0)}</Text>
                    </View>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Kalan</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.warning, fontWeight: '700' }]}>{formatCurrency(data.remaining_amount)}</Text>
                    </View>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Durum</Text>
                      <Text style={[styles.fieldRowValue, { color: receivableStatusColors[data.status] }]}>{receivableStatusLabels[data.status]}</Text>
                    </View>
                    {data.due_date && (
                      <View style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>Vade Tarihi</Text>
                        <Text style={styles.fieldRowValue}>{formatDate(data.due_date)}</Text>
                      </View>
                    )}
                    {data.description && (
                      <View style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>Açıklama</Text>
                        <Text style={styles.fieldRowValue}>{data.description}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.detailActions}>
                    {data.remaining_amount > 0 && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: lightColors.credit }]}
                        onPress={() => {
                          setDetailModal(null);
                          openPaymentModal(data);
                        }}
                      >
                        <Ionicons name="wallet" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>Ödeme Al</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteMachineReceivable(data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {type === 'account' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: lightColors.primary }]}>
                      <Ionicons name="person" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.name}</Text>
                    <Text style={[styles.detailBalance, { color: data.balance >= 0 ? lightColors.credit : lightColors.debt }]}>
                      {formatCurrency(Math.abs(data.balance))}
                    </Text>
                    <Text style={styles.detailSubtext}>{data.balance >= 0 ? 'Alacak' : 'Borç'}</Text>
                  </View>
                  {data.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.phone}</Text>
                    </View>
                  )}
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.primary }]}
                      onPress={() => {
                        setDetailModal(null);
                        setTransactionForm({ ...transactionForm, account_id: data.id });
                        setTransactionModal(true);
                      }}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>İşlem Ekle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.warning }]}
                      onPress={() => openEditAccount(data)}
                    >
                      <Ionicons name="pencil" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteAccount(data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {(type === 'farmField' || type === 'farmIncome' || type === 'farmExpense' || type === 'farmCredit' || type === 'farmHarvest' || type === 'farmSale' || type === 'farmStock') && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: '#059669' }]}>
                      <Ionicons name={type === 'farmField' ? 'leaf' : type === 'farmIncome' ? 'trending-up' : type === 'farmExpense' ? 'trending-down' : type === 'farmCredit' ? 'card' : type === 'farmHarvest' ? 'basket' : type === 'farmSale' ? 'cart' : 'cube'} size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>
                      {type === 'farmField' ? data.name : type === 'farmIncome' ? farmIncomeTypeLabels[data.income_type] : type === 'farmExpense' ? farmExpenseTypeLabels[data.expense_type] : type === 'farmCredit' ? data.bank_name : type === 'farmHarvest' ? data.crop_name : type === 'farmSale' ? data.crop_name : data.item_name}
                    </Text>
                    {type === 'farmCredit' && (
                      <Text style={[styles.detailSubtext, { color: creditStatusColors[data.status] }]}>{creditStatusLabels[data.status]}</Text>
                    )}
                  </View>
                  {(type === 'farmIncome' || type === 'farmExpense') && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={[styles.detailText, { color: type === 'farmIncome' ? lightColors.income : lightColors.expense }]}>{formatCurrency(data.amount)}</Text>
                    </View>
                  )}
                  {type === 'farmCredit' && (
                    <View>
                      <View style={styles.detailRow}>
                        <Ionicons name="cash-outline" size={20} color={lightColors.textSecondary} />
                        <Text style={styles.detailText}>Toplam: {formatCurrency(data.amount)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={lightColors.income} />
                        <Text style={styles.detailText}>Ödenen: {formatCurrency(data.paid_amount)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="alert-circle-outline" size={20} color={lightColors.debt} />
                        <Text style={styles.detailText}>Kalan: {formatCurrency(data.remaining_amount)}</Text>
                      </View>
                    </View>
                  )}
                  {(type === 'farmHarvest' || type === 'farmSale' || type === 'farmStock') && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cube-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.quantity} {stockUnitLabels[data.unit] || data.unit}</Text>
                    </View>
                  )}
                  {type === 'farmSale' && (
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={[styles.detailText, { color: lightColors.income }]}>{formatCurrency(data.total_price || 0)}</Text>
                    </View>
                  )}
                  {data.field_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="leaf-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.field_name}</Text>
                    </View>
                  )}
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.secondary }]}
                      onPress={() => {
                        setDetailModal(null);
                        handleEditFarmItem(type, data);
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteFarmItem(type, data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {type === 'machine' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: lightColors.secondary }]}>
                      <Ionicons name="construct" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.name}</Text>
                    <Text style={styles.detailSubtext}>{machineTypeLabels[data.type]}</Text>
                  </View>
                  <View style={styles.detailStats}>
                    <View style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, { color: lightColors.income }]}>{formatCurrency(data.total_income)}</Text>
                      <Text style={styles.detailStatLabel}>Gelir</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, { color: lightColors.expense }]}>{formatCurrency(data.total_expenses)}</Text>
                      <Text style={styles.detailStatLabel}>Gider</Text>
                    </View>
                  </View>
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.expense }]}
                      onPress={() => {
                        setDetailModal(null);
                        setExpenseForm({ ...expenseForm, machine_id: data.id });
                        setExpenseModal(true);
                      }}
                    >
                      <Ionicons name="receipt" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Gider Ekle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteMachine(data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {type === 'receivable' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: receivableStatusColors[data.status] }]}>
                      <Ionicons name="document-text" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.account_name}</Text>
                    <Text style={[styles.detailBalance, { color: lightColors.income }]}>{formatCurrency(data.remaining_amount)}</Text>
                    <Text style={styles.detailSubtext}>/ {formatCurrency(data.amount)} - {receivableStatusLabels[data.status]}</Text>
                  </View>
                  {data.field_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="leaf-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.field_name}</Text>
                    </View>
                  )}
                  {data.machine_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="construct-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.machine_name}</Text>
                    </View>
                  )}
                  {data.decare_count && (
                    <View style={styles.detailRow}>
                      <Ionicons name="resize-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.decare_count} dönüm x {formatCurrency(data.price_per_decare || 0)}</Text>
                    </View>
                  )}
                </View>
              )}
              {type === 'machineReceivable' && (
                <View>
                  <View style={styles.detailHeader}>
                    <View style={[styles.avatarLarge, { backgroundColor: receivableStatusColors[data.status] || lightColors.warning }]}>
                      <Ionicons name="cash" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.detailName}>{data.person_name}</Text>
                    <Text style={[styles.detailBalance, { color: lightColors.income }]}>{formatCurrency(data.remaining_amount)}</Text>
                    <Text style={styles.detailSubtext}>/ {formatCurrency(data.amount)} - {receivableStatusLabels[data.status]}</Text>
                  </View>
                  {data.field_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="leaf-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.field_name}</Text>
                    </View>
                  )}
                  {data.machine_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="construct-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.machine_name}</Text>
                    </View>
                  )}
                  {data.description && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={20} color={lightColors.textSecondary} />
                      <Text style={styles.detailText}>{data.description}</Text>
                    </View>
                  )}
                  <View style={styles.detailActions}>
                    {data.remaining_amount > 0 && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: lightColors.income }]}
                        onPress={() => handleCollectReceivable(data.id, data.remaining_amount)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>Tahsil Et</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.secondary }]}
                      onPress={() => {
                        setDetailModal(null);
                        setEditingMachineReceivableId(data.id);
                        setMachineReceivableForm({
                          person_id: data.person_id,
                          field_id: data.field_id || '',
                          machine_id: data.machine_id || '',
                          amount: data.amount?.toString() || '',
                          description: data.description || '',
                          due_date: data.due_date ? data.due_date.split('T')[0] : '',
                          price_per_decare: data.price_per_decare?.toString() || '',
                          discount_type: data.discount_type || '',
                          discount_value: data.discount_value?.toString() || '',
                        });
                        setMachineReceivableModal(true);
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: lightColors.error }]}
                      onPress={() => handleDeleteMachineReceivable(data.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={lightColors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // ==================== RENDER FARM MODULE ====================

  const renderFarmModule = () => {
    const { farmTab } = uiStore;
    const { fields, incomes, expenses, credits, harvests, sales, stocks, summary } = farmStore;

    if (farmTab === 'summary') {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SummaryCard
            title="Çiftlik Özeti"
            color="#059669"
            items={[
              { label: 'Toplam Tarla', value: `${summary?.total_fields || 0} (${summary?.total_decare || 0} dönüm)` },
              { label: 'Toplam Gelir', value: formatCurrency(summary?.total_income || 0), color: lightColors.income },
              { label: 'Toplam Gider', value: formatCurrency(summary?.total_expense || 0), color: lightColors.expense },
              { label: 'Net Nakit', value: formatCurrency(summary?.net_cash || 0), color: (summary?.net_cash || 0) >= 0 ? lightColors.credit : lightColors.debt },
            ]}
          />
          <SummaryCard
            title="Üretim & Satış"
            color="#8B5CF6"
            items={[
              { label: 'Toplam Hasat', value: `${summary?.total_harvest || 0} kg` },
              { label: 'Toplam Satış', value: formatCurrency(summary?.total_sales || 0), color: lightColors.income },
              { label: 'Kredi Borcu', value: formatCurrency(summary?.credit_remaining || 0), color: lightColors.debt },
              { label: 'Depo Kalem', value: String(summary?.stock_count || 0) },
            ]}
          />
          
          {/* Ürün Bazlı Hasat Özeti */}
          {summary?.harvest_by_crop && Object.keys(summary.harvest_by_crop).length > 0 && (
            <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
              <Text style={[styles.summaryTitle, { color: '#F59E0B' }]}>🌾 Ürün Bazlı Hasat</Text>
              {Object.entries(summary.harvest_by_crop).map(([crop, data]: [string, any]) => (
                <View key={crop} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 14, color: lightColors.text }}>{crop}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#F59E0B' }}>{data.quantity} {data.unit}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Ürün Bazlı Satış Özeti */}
          {summary?.sales_by_crop && Object.keys(summary.sales_by_crop).length > 0 && (
            <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
              <Text style={[styles.summaryTitle, { color: '#10B981' }]}>💵 Ürün Bazlı Satış</Text>
              {Object.entries(summary.sales_by_crop).map(([crop, data]: [string, any]) => (
                <View key={crop} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 14, color: lightColors.text }}>{crop} ({data.quantity} {data.unit})</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: lightColors.income }}>{formatCurrency(data.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tarla Bazlı Özet Paneli */}
          <View style={[styles.summaryCard, { borderLeftColor: '#0EA5E9' }]}>
            <Text style={[styles.summaryTitle, { color: '#0EA5E9' }]}>🌾 Tarla Bazlı Özet</Text>
            
            {/* Tarla Seçici */}
            <View style={styles.fieldSelectorContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.fieldSelectorChip, !selectedFieldId && styles.fieldSelectorChipActive]}
                  onPress={() => { setSelectedFieldId(''); setFieldSummary(null); }}
                >
                  <Text style={[styles.fieldSelectorText, !selectedFieldId && styles.fieldSelectorTextActive]}>Tarla Seçin</Text>
                </TouchableOpacity>
                {fields.map((field: any) => (
                  <TouchableOpacity
                    key={field.id}
                    style={[styles.fieldSelectorChip, selectedFieldId === field.id && styles.fieldSelectorChipActive]}
                    onPress={() => setSelectedFieldId(field.id)}
                  >
                    <Text style={[styles.fieldSelectorText, selectedFieldId === field.id && styles.fieldSelectorTextActive]} numberOfLines={1}>
                      {field.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Özet Detayları */}
            {fieldSummaryLoading && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0EA5E9" />
                <Text style={{ marginTop: 8, color: lightColors.textSecondary }}>Yükleniyor...</Text>
              </View>
            )}

            {fieldSummary && !fieldSummaryLoading && (
              <View style={{ marginTop: 12 }}>
                {/* Ana Metrikler */}
                <View style={styles.fieldSummaryMetrics}>
                  <View style={styles.fieldSummaryMetricItem}>
                    <Text style={styles.fieldMetricLabel}>Toplam Gelir</Text>
                    <Text style={[styles.fieldMetricValue, { color: lightColors.income }]}>{formatCurrency((fieldSummary.total_income || 0) + (fieldSummary.total_sales || 0))}</Text>
                  </View>
                  <View style={styles.fieldSummaryMetricItem}>
                    <Text style={styles.fieldMetricLabel}>Toplam Gider</Text>
                    <Text style={[styles.fieldMetricValue, { color: lightColors.expense }]}>{formatCurrency(fieldSummary.total_expense || 0)}</Text>
                  </View>
                  <View style={styles.fieldSummaryMetricItem}>
                    <Text style={styles.fieldMetricLabel}>Kâr/Zarar</Text>
                    <Text style={[styles.fieldMetricValue, { color: (fieldSummary.profit_loss || 0) >= 0 ? lightColors.credit : lightColors.debt }]}>
                      {formatCurrency(fieldSummary.profit_loss || 0)}
                    </Text>
                  </View>
                </View>

                {/* Dekar Bazlı Metrikler */}
                {(fieldSummary.size_decare || 0) > 0 && (
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>📊 Dekar Bazlı Analiz ({fieldSummary.size_decare} Dekar)</Text>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Dekara Verim</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.primary }]}>
                        {fieldSummary.yield_per_decare || 0} kg/dekar
                      </Text>
                    </View>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Dekar Maliyeti</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>
                        {formatCurrency(fieldSummary.cost_per_decare || 0)}/dekar
                      </Text>
                    </View>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Dekara Gelir</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.income }]}>
                        {formatCurrency(fieldSummary.income_per_decare || 0)}/dekar
                      </Text>
                    </View>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Dekara Kâr</Text>
                      <Text style={[styles.fieldRowValue, { color: (fieldSummary.profit_per_decare || 0) >= 0 ? lightColors.credit : lightColors.debt }]}>
                        {formatCurrency(fieldSummary.profit_per_decare || 0)}/dekar
                      </Text>
                    </View>
                  </View>
                )}

                {/* Kg Bazlı Metrikler */}
                <View style={styles.fieldSummarySection}>
                  <Text style={styles.fieldSectionTitle}>⚖️ Kg Bazlı Analiz {fieldSummary.total_harvest > 0 ? `(${fieldSummary.total_harvest} kg hasat)` : ''}</Text>
                  {fieldSummary.total_harvest > 0 ? (
                    <>
                      <View style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>Kg Maliyeti</Text>
                        <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>
                          {formatCurrency(fieldSummary.cost_per_kg || 0)}/kg
                        </Text>
                      </View>
                      {fieldSummary.avg_sale_price_per_kg > 0 && (
                        <View style={styles.fieldSummaryRow}>
                          <Text style={styles.fieldRowLabel}>Ortalama Satış Fiyatı</Text>
                          <Text style={[styles.fieldRowValue, { color: lightColors.income }]}>
                            {formatCurrency(fieldSummary.avg_sale_price_per_kg || 0)}/kg
                          </Text>
                        </View>
                      )}
                      {fieldSummary.avg_sale_price_per_kg > 0 && fieldSummary.cost_per_kg > 0 && (
                        <View style={styles.fieldSummaryRow}>
                          <Text style={styles.fieldRowLabel}>Kg Başına Kâr</Text>
                          <Text style={[styles.fieldRowValue, { color: (fieldSummary.avg_sale_price_per_kg - fieldSummary.cost_per_kg) >= 0 ? lightColors.credit : lightColors.debt }]}>
                            {formatCurrency((fieldSummary.avg_sale_price_per_kg || 0) - (fieldSummary.cost_per_kg || 0))}/kg
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 }}>
                      Bu tarlada henüz hasat kaydı yok. Hasat ekleyince kg bazlı analiz görünecek.
                    </Text>
                  )}
                </View>

                {/* Gelir Dökümü */}
                {Object.keys(fieldSummary.income_by_type || {}).length > 0 && (
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>💰 Gelir Dökümü</Text>
                    {Object.entries(fieldSummary.income_by_type).map(([type, amount]: [string, any]) => (
                      <View key={type} style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>{farmIncomeTypeLabels[type] || type}</Text>
                        <Text style={[styles.fieldRowValue, { color: lightColors.income }]}>{formatCurrency(amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Gider Dökümü */}
                {Object.keys(fieldSummary.expense_by_type || {}).length > 0 && (
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>📉 Gider Dökümü</Text>
                    {Object.entries(fieldSummary.expense_by_type).map(([type, amount]: [string, any]) => (
                      <View key={type} style={styles.fieldSummaryRow}>
                        <Text style={styles.fieldRowLabel}>{farmExpenseTypeLabels[type] || type}</Text>
                        <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>{formatCurrency(amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Stok Giderleri */}
                {fieldSummary.total_stock_expense > 0 && (
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>📦 Depo Giderleri</Text>
                    <View style={styles.fieldSummaryRow}>
                      <Text style={styles.fieldRowLabel}>Toplam Depo Maliyeti</Text>
                      <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>{formatCurrency(fieldSummary.total_stock_expense)}</Text>
                    </View>
                    {Object.entries(fieldSummary.stock_expense_by_type || {}).map(([type, data]: [string, any]) => (
                      <View key={type} style={styles.fieldSummaryRow}>
                        <Text style={[styles.fieldRowLabel, { marginLeft: 12 }]}>• {type} ({data.count} kullanım)</Text>
                        <Text style={[styles.fieldRowValue, { color: lightColors.expense }]}>{formatCurrency(data.cost)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Ürün Bazlı Hasat Detayları */}
                {Object.keys(fieldSummary.harvest_by_crop || {}).length > 0 && (
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>🌾 Ürün Bazlı Hasat</Text>
                    {Object.entries(fieldSummary.harvest_by_crop).map(([key, data]: [string, any]) => {
                      const cropName = key.split('_')[0];
                      return (
                        <View key={key} style={styles.fieldSummaryRow}>
                          <Text style={styles.fieldRowLabel}>{cropName}</Text>
                          <Text style={[styles.fieldRowValue, { color: lightColors.primary }]}>{data.quantity} {data.unit}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Ürün Bazlı Satış Detayları */}
                {Object.keys(fieldSummary.sales_by_crop || {}).length > 0 && (
                  <View style={styles.fieldSummarySection}>
                    <Text style={styles.fieldSectionTitle}>💵 Ürün Bazlı Satış</Text>
                    {Object.entries(fieldSummary.sales_by_crop).map(([key, data]: [string, any]) => {
                      const cropName = key.split('_')[0];
                      return (
                        <View key={key} style={styles.fieldSummaryRow}>
                          <Text style={styles.fieldRowLabel}>{cropName} ({data.quantity} {data.unit})</Text>
                          <Text style={[styles.fieldRowValue, { color: lightColors.income }]}>{formatCurrency(data.amount)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {!selectedFieldId && !fieldSummaryLoading && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Ionicons name="analytics-outline" size={32} color={lightColors.textSecondary} />
                <Text style={{ marginTop: 8, color: lightColors.textSecondary, textAlign: 'center' }}>
                  Detaylı analiz için yukarıdan bir tarla seçin
                </Text>
              </View>
            )}
          </View>

          {summary?.stock_details && summary.stock_details.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { color: '#6366F1' }]}>📦 Depo Detayları</Text>
              {summary.stock_details.map((stock: any, index: number) => (
                <View key={index} style={styles.stockDetailRow}>
                  <Text style={styles.stockDetailName}>{stock.item_name}</Text>
                  <Text style={styles.stockDetailQty}>{stock.quantity} {stockUnitLabels[stock.unit] || stock.unit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Kredi Takibi Paneli */}
          {creditSummary && creditSummary.active_credits > 0 && (
            <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
              <Text style={[styles.summaryTitle, { color: '#3B82F6' }]}>💳 Kredi Takibi</Text>
              
              {/* Kredi Özet Bilgileri */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.smallText}>Aktif Kredi</Text>
                  <Text style={[styles.fieldMetricValue, { fontSize: 18 }]}>{creditSummary.active_credits}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.smallText}>Ana Para</Text>
                  <Text style={[styles.fieldMetricValue, { fontSize: 14, color: lightColors.text }]}>{formatCurrency(creditSummary.total_principal)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.smallText}>Toplam Faiz</Text>
                  <Text style={[styles.fieldMetricValue, { fontSize: 14, color: lightColors.warning }]}>{formatCurrency(creditSummary.total_interest)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.smallText}>Toplam Borç</Text>
                  <Text style={[styles.fieldMetricValue, { fontSize: 14, color: lightColors.expense }]}>{formatCurrency(creditSummary.total_payable)}</Text>
                </View>
              </View>
              
              {/* Yaklaşan Ödemeler */}
              {creditSummary.upcoming_payments && creditSummary.upcoming_payments.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: lightColors.border, paddingTop: spacing.md }}>
                  <Text style={styles.fieldSectionTitle}>⏰ Yaklaşan Vadeler</Text>
                  {creditSummary.upcoming_payments.map((payment: any) => (
                    <View key={payment.id} style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      backgroundColor: payment.days_remaining <= 7 ? '#FEE2E2' : payment.days_remaining <= 30 ? '#FEF3C7' : '#F0FDF4',
                      borderRadius: borders.radius.sm,
                      paddingHorizontal: spacing.sm,
                      marginBottom: spacing.xs
                    }}>
                      <View>
                        <Text style={{ fontWeight: '600' as any, color: lightColors.text }}>{payment.bank_name}</Text>
                        <Text style={styles.smallText}>Kapatma: {formatCurrency(payment.total_payable)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ 
                          fontWeight: '700' as any, 
                          fontSize: 16,
                          color: payment.days_remaining <= 7 ? lightColors.error : payment.days_remaining <= 30 ? lightColors.warning : lightColors.credit 
                        }}>
                          {payment.days_remaining} gün
                        </Text>
                        <Text style={styles.smallText}>kaldı</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      );
    }

    if (farmTab === 'fields') {
      return (
        <FlatList
          data={fields}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'farmField', data: item })}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: '#059669' }]}>
                  <Ionicons name="leaf" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.size_decare ? `${item.size_decare} dönüm` : ''} {item.crop ? `• ${item.crop}` : ''}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="leaf-outline" title="Tarla yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'incomes') {
      return (
        <FlatList
          data={incomes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'farmIncome', data: item })}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: lightColors.income }]}>
                  <Ionicons name="trending-up" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{farmIncomeTypeLabels[item.income_type] || item.income_type}</Text>
                  {item.description ? <Text style={[styles.cardSubtitle, { color: lightColors.text }]}>{item.description}</Text> : null}
                  <Text style={styles.cardSubtitle}>{item.field_name || 'Genel'} • {formatDate(item.date)}</Text>
                </View>
              </View>
              <Text style={[styles.balanceText, { color: lightColors.income }]}>+{formatCurrency(item.amount)}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="trending-up-outline" title="Gelir yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'expenses') {
      return (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'farmExpense', data: item })}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: lightColors.expense }]}>
                  <Ionicons name="trending-down" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{farmExpenseTypeLabels[item.expense_type] || item.expense_type}</Text>
                  {item.description ? <Text style={[styles.cardSubtitle, { color: lightColors.text }]}>{item.description}</Text> : null}
                  <Text style={styles.cardSubtitle}>{item.field_name || 'Genel'} • {formatDate(item.date)}</Text>
                </View>
              </View>
              <Text style={[styles.balanceText, { color: lightColors.expense }]}>-{formatCurrency(item.amount)}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="trending-down-outline" title="Gider yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'credits') {
      return (
        <FlatList
          data={credits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <TouchableOpacity onPress={() => setDetailModal({ type: 'farmCredit', data: item })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.avatar, { backgroundColor: item.is_paid ? '#10B981' : creditStatusColors[item.status] || '#3B82F6' }]}>
                      <Ionicons name={item.is_paid ? 'checkmark-circle' : 'card'} size={20} color="#FFF" />
                    </View>
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cardTitle}>{item.bank_name}</Text>
                        {item.is_paid && (
                          <View style={styles.paidBadge}>
                            <Text style={styles.paidBadgeText}>ÖDENDİ</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardSubtitle}>
                        Ana Para: {formatCurrency(item.amount)} • Faiz: %{item.interest_rate || 0} ({item.interest_type === 'compound' ? 'Bileşik' : 'Basit'})
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.balanceText, { color: item.is_paid ? '#10B981' : lightColors.expense }]}>
                      {formatCurrency(item.total_payable || item.amount)}
                    </Text>
                    <Text style={styles.smallText}>Toplam Ödenecek</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* Detay Bilgileri */}
              {!item.is_paid && (
                <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: lightColors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.smallText}>Birikmiş Faiz</Text>
                      <Text style={[styles.fieldMetricValue, { color: lightColors.warning, fontSize: 14 }]}>
                        {formatCurrency(item.accrued_interest || 0)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.smallText}>Geçen Gün</Text>
                      <Text style={[styles.fieldMetricValue, { fontSize: 14 }]}>{item.days_elapsed || 0} gün</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.smallText}>Kalan Gün</Text>
                      <Text style={[styles.fieldMetricValue, { 
                        fontSize: 14, 
                        color: (item.days_remaining || 0) <= 0 ? lightColors.error : (item.days_remaining || 0) <= 30 ? lightColors.warning : lightColors.credit 
                      }]}>
                        {(item.days_remaining || 0) > 0 ? `${item.days_remaining} gün` : (item.days_remaining || 0) === 0 ? 'Bugün!' : `${Math.abs(item.days_remaining || 0)} gün geçti`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Butonlar */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm, gap: 4 }}>
                <TouchableOpacity 
                  style={[styles.smallActionBtn, { backgroundColor: item.is_paid ? lightColors.textSecondary : '#10B981' }]} 
                  onPress={() => handleMarkCreditPaid(item.id)}
                >
                  <Ionicons name={item.is_paid ? 'close' : 'checkmark'} size={14} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.smallActionBtn, { backgroundColor: lightColors.error }]} 
                  onPress={() => handleDeleteFarmItem('farmCredit', item.id)}
                >
                  <Ionicons name="trash" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="card-outline" title="Kredi yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'harvests') {
      return (
        <FlatList
          data={harvests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'farmHarvest', data: item })}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="basket" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.crop_name}</Text>
                  <Text style={styles.cardSubtitle}>{item.field_name || 'Genel'} • {formatDate(item.harvest_date)}</Text>
                </View>
              </View>
              <Text style={styles.balanceText}>{item.quantity} {stockUnitLabels[item.unit] || item.unit}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="basket-outline" title="Hasat yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'sales') {
      return (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'farmSale', data: item })}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="cart" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.crop_name}</Text>
                  <Text style={styles.cardSubtitle}>{item.buyer_name || 'Alıcı belirtilmedi'} • {formatDate(item.sale_date)}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.balanceText, { color: lightColors.income }]}>{formatCurrency(item.total_price || 0)}</Text>
                <Text style={styles.smallText}>{item.quantity || 0} {stockUnitLabels[item.unit] || item.unit}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="cart-outline" title="Satış yok" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'stocks') {
      return (
        <FlatList
          data={stocks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetailModal({ type: 'farmStock', data: item })}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="cube" size={20} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.item_name}</Text>
                  <Text style={styles.cardSubtitle}>{item.category || 'Genel'}</Text>
                </View>
              </View>
              <Text style={styles.balanceText}>{item.quantity} {stockUnitLabels[item.unit] || item.unit}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="cube-outline" title="Depo boş" message="+ butonuna basarak ekleyin" />}
        />
      );
    }

    if (farmTab === 'annualStock') {
      const selectedStock = annualStocks.find(s => s.id === fieldStockUsageForm.stock_id);
      
      // Tip bazlı özet için veri hazırla
      const typeSummary = annualStockSummary?.type_summary || {};
      const typeColors: Record<string, string> = {
        'Gübre': '#10B981',
        'İlaç': '#EF4444',
        'Tohum': '#F59E0B',
        'Mazot': '#6366F1',
        'default': '#7C3AED'
      };
      
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Özet Kartı */}
          <SummaryCard
            title="Yıllık Depo Özeti"
            color="#7C3AED"
            items={[
              { label: 'Toplam Depo', value: String(annualStockSummary?.total_items || 0) },
              { label: 'Toplam Maliyet', value: formatCurrency(annualStockSummary?.total_cost || 0) },
              { label: 'Kullanılan', value: formatCurrency(annualStockSummary?.used_cost || 0), color: lightColors.expense },
              { label: 'Kalan Değer', value: formatCurrency(annualStockSummary?.remaining_cost || 0), color: lightColors.credit },
            ]}
          />

          {/* Tip Bazlı Özet Tablosu */}
          {Object.keys(typeSummary).length > 0 && (
            <View style={[styles.summaryCard, { borderLeftColor: '#7C3AED' }]}>
              <Text style={[styles.summaryTitle, { color: '#7C3AED' }]}>📊 Tip Bazlı Dağılım</Text>
              <View style={{ marginTop: spacing.sm }}>
                {/* Başlık Satırı */}
                <View style={{ flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: lightColors.border }}>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600' as any, color: lightColors.textSecondary }}>Tip</Text>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '600' as any, color: lightColors.textSecondary, textAlign: 'right' }}>Adet</Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600' as any, color: lightColors.textSecondary, textAlign: 'right' }}>Toplam</Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600' as any, color: lightColors.textSecondary, textAlign: 'right' }}>Kullanılan</Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600' as any, color: lightColors.textSecondary, textAlign: 'right' }}>Kalan</Text>
                </View>
                {/* Veri Satırları */}
                {Object.entries(typeSummary).map(([type, data]: [string, any]) => (
                  <View key={type} style={{ flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: lightColors.border + '40' }}>
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: typeColors[type] || typeColors.default, marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: lightColors.text }} numberOfLines={1}>{type}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: lightColors.text, textAlign: 'right' }}>{data.count}</Text>
                    <Text style={{ flex: 2, fontSize: 13, color: lightColors.text, textAlign: 'right' }}>{formatCurrency(data.total_cost)}</Text>
                    <Text style={{ flex: 2, fontSize: 13, color: lightColors.expense, textAlign: 'right' }}>{formatCurrency(data.used_cost)}</Text>
                    <Text style={{ flex: 2, fontSize: 13, color: lightColors.credit, textAlign: 'right' }}>{formatCurrency(data.remaining_cost)}</Text>
                  </View>
                ))}
              </View>
              
              {/* Görsel Progress Barlar */}
              <View style={{ marginTop: spacing.md }}>
                {Object.entries(typeSummary).map(([type, data]: [string, any]) => {
                  const usagePercent = data.total_cost > 0 ? (data.used_cost / data.total_cost) * 100 : 0;
                  return (
                    <View key={type + '_bar'} style={{ marginBottom: spacing.sm }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: lightColors.textSecondary }}>{type}</Text>
                        <Text style={{ fontSize: 12, color: lightColors.textSecondary }}>{usagePercent.toFixed(0)}% kullanıldı</Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: lightColors.border, borderRadius: 4 }}>
                        <View style={{ 
                          width: `${Math.min(100, usagePercent)}%`, 
                          height: 8, 
                          backgroundColor: typeColors[type] || typeColors.default, 
                          borderRadius: 4 
                        }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Stok Ekleme Butonu */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TouchableOpacity 
              style={[styles.submitBtn, { flex: 1, backgroundColor: '#7C3AED' }]} 
              onPress={() => {
                setEditingAnnualStock(null);
                setAnnualStockForm({ stock_type: '', name: '', quantity: '', unit: 'kg', unit_price: '', purchase_date: getTodayFormatted(), notes: '' });
                setShowAnnualStockModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>Depo Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitBtn, { flex: 1, backgroundColor: '#059669' }]} 
              onPress={() => {
                setFieldStockUsageForm({ field_id: '', stock_id: '', used_quantity: '', usage_date: '', notes: '' });
                setShowFieldStockUsageModal(true);
              }}
            >
              <Ionicons name="leaf" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>Tarlaya Ata</Text>
            </TouchableOpacity>
          </View>

          {/* Stok Listesi */}
          <Text style={styles.sectionTitle}>📦 Depo Kalemleri</Text>
          {annualStocks.length === 0 ? (
            <EmptyState icon="cube-outline" title="Yıllık depo boş" message="Depo ekleyerek başlayın" />
          ) : (
            annualStocks.map((stock) => (
              <View key={stock.id} style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.avatar, { backgroundColor: '#7C3AED' }]}>
                      <Ionicons name="cube" size={20} color="#FFF" />
                    </View>
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <Text style={styles.cardTitle}>{stock.name}</Text>
                      <Text style={styles.cardSubtitle}>{stock.stock_type} • {stock.unit_price} ₺/{stock.unit}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.balanceText, { color: lightColors.income }]}>{stock.remaining_quantity} {stock.unit}</Text>
                    <Text style={styles.smallText}>/ {stock.quantity} {stock.unit}</Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={{ marginTop: spacing.sm, backgroundColor: lightColors.border, borderRadius: 4, height: 6 }}>
                  <View style={{ 
                    width: `${Math.min(100, (stock.used_quantity / stock.quantity) * 100)}%`, 
                    backgroundColor: lightColors.warning, 
                    borderRadius: 4, 
                    height: 6 
                  }} />
                </View>
                
                {/* Fiyat Bilgisi */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                  <Text style={styles.smallText}>Toplam: {formatCurrency(stock.total_cost)}</Text>
                  <Text style={[styles.smallText, { color: lightColors.expense }]}>Kullanılan: {formatCurrency(stock.used_cost)}</Text>
                  <Text style={[styles.smallText, { color: lightColors.credit }]}>Kalan: {formatCurrency(stock.remaining_cost)}</Text>
                </View>
                
                {/* Butonlar */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm, gap: 4 }}>
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: lightColors.secondary }]} 
                    onPress={() => {
                      setEditingAnnualStock(stock);
                      setAnnualStockForm({
                        stock_type: stock.stock_type,
                        name: stock.name,
                        quantity: String(stock.quantity),
                        unit: stock.unit,
                        unit_price: String(stock.unit_price),
                        purchase_date: stock.purchase_date?.split('T')[0] || '',
                        notes: stock.notes || ''
                      });
                      setShowAnnualStockModal(true);
                    }}
                  >
                    <Ionicons name="pencil" size={14} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: lightColors.error }]} 
                    onPress={() => handleDeleteAnnualStock(stock.id)}
                  >
                    <Ionicons name="trash" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Kullanım Kayıtları */}
          {fieldStockUsages.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>🌾 Tarla Kullanımları</Text>
              {fieldStockUsages.map((usage) => (
                <View key={usage.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.avatar, { backgroundColor: usage.added_to_expense ? '#059669' : '#7C3AED' }]}>
                      <Ionicons name={usage.added_to_expense ? "checkmark-circle" : "leaf"} size={20} color="#FFF" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{usage.field_name}</Text>
                      <Text style={styles.cardSubtitle}>{usage.stock_name} ({usage.stock_type})</Text>
                      <Text style={styles.smallText}>
                        {usage.used_quantity} {usage.unit} • {formatCurrency(usage.total_cost)}
                        {usage.added_to_expense && <Text style={{ color: '#059669' }}> ✓ Gidere eklendi</Text>}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {/* Düzenle Butonu */}
                      <TouchableOpacity 
                        style={[styles.smallActionBtn, { backgroundColor: lightColors.primary }]} 
                        onPress={() => {
                          setEditingFieldStockUsage(usage);
                          setFieldStockUsageForm({
                            field_id: usage.field_id,
                            stock_id: usage.stock_id,
                            used_quantity: String(usage.used_quantity),
                            usage_date: usage.usage_date ? new Date(usage.usage_date).toLocaleDateString('tr-TR').split('.').join('/') : getTodayFormatted(),
                            notes: usage.notes || '',
                          });
                          setShowFieldStockUsageModal(true);
                        }}
                      >
                        <Ionicons name="create" size={14} color="#FFF" />
                      </TouchableOpacity>
                      {/* Gidere Ekle/Çıkar Toggle Butonu */}
                      <TouchableOpacity 
                        style={[styles.smallActionBtn, { backgroundColor: usage.added_to_expense ? '#DC2626' : '#F59E0B' }]} 
                        onPress={() => handleAddStockUsageToExpense(usage)}
                      >
                        <Ionicons name={usage.added_to_expense ? "remove-circle" : "add-circle"} size={14} color="#FFF" />
                      </TouchableOpacity>
                      {/* Sil Butonu */}
                      <TouchableOpacity 
                        style={[styles.smallActionBtn, { backgroundColor: lightColors.error }]} 
                        onPress={() => handleDeleteFieldStockUsage(usage.id)}
                      >
                        <Ionicons name="trash" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      );
    }

    return null;
  };

  const isAccountsModule = uiStore.activeModule === 'accounts';
  const isMachinesModule = uiStore.activeModule === 'machines';
  const isFarmModule = uiStore.activeModule === 'farm';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={isAccountsModule ? lightColors.primary : isMachinesModule ? lightColors.secondary : '#059669'}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isWebPlatform ? lightColors.secondary : (isAccountsModule ? lightColors.primary : isMachinesModule ? lightColors.secondary : '#059669') }]}>
        <View>
          <Text style={styles.headerTitle}>
            {isWebPlatform ? 'Makine Yönetimi' : (isAccountsModule ? 'Cari Hesap' : isMachinesModule ? 'Makine Yönetimi' : 'Çiftlik Yönetimi')}
          </Text>
          <Text style={styles.headerSubtitle}>{isWebPlatform ? 'Web Arayüzü' : 'Çiftlik Takip Sistemi'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Module Tabs - Web'de sadece Makine görünsün */}
      {!isWebPlatform ? (
        <View style={[styles.moduleTabs, { backgroundColor: lightColors.surface, borderBottomColor: lightColors.border }]}>
          <TouchableOpacity
            style={[styles.moduleTab, isAccountsModule && styles.moduleTabActive]}
            onPress={() => uiStore.setActiveModule('accounts')}
          >
            <Ionicons name="wallet" size={18} color={isAccountsModule ? lightColors.primary : lightColors.textSecondary} />
            <Text style={[styles.moduleTabText, { color: isAccountsModule ? lightColors.primary : lightColors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>Cari</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.moduleTab, isMachinesModule && styles.machineModuleTabActive]}
            onPress={() => uiStore.setActiveModule('machines')}
          >
            <Ionicons name="construct" size={18} color={isMachinesModule ? lightColors.secondary : lightColors.textSecondary} />
            <Text style={[styles.moduleTabText, { color: isMachinesModule ? lightColors.secondary : lightColors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>Makine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.moduleTab, isFarmModule && { borderBottomWidth: 2, borderBottomColor: '#059669' }]}
            onPress={() => uiStore.setActiveModule('farm')}
          >
            <Ionicons name="leaf" size={18} color={isFarmModule ? '#059669' : lightColors.textSecondary} />
            <Text style={[styles.moduleTabText, { color: isFarmModule ? '#059669' : lightColors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>Çiftlik</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Web'de sadece Makine sekmesi */
        <View style={[styles.moduleTabs, { backgroundColor: lightColors.surface, borderBottomColor: lightColors.border, justifyContent: 'center' }]}>
          <View style={[styles.moduleTab, styles.machineModuleTabActive, { flex: 0, paddingHorizontal: 24 }]}>
            <Ionicons name="construct" size={20} color={lightColors.secondary} />
            <Text style={[styles.moduleTabText, { color: lightColors.secondary, marginLeft: 6, fontWeight: '600' }]}>Makine Modülü</Text>
          </View>
        </View>
      )}

      {/* Sub Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={[styles.subTabsContainer, { backgroundColor: lightColors.surface, borderBottomColor: lightColors.border }]}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {/* Web'de sadece makine sub-tabs görünsün */}
        {isWebPlatform ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(['summary', 'list', 'persons', 'expenses', 'receivables'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.subTab, uiStore.machinesTab === tab && styles.machineSubTabActive]}
                onPress={() => uiStore.setMachinesTab(tab)}
              >
                <Text style={[styles.subTabText, uiStore.machinesTab === tab && { color: lightColors.secondary }]}>
                  {tab === 'summary' ? 'Özet' : tab === 'list' ? 'Makineler' : tab === 'persons' ? 'Kişiler' : tab === 'expenses' ? 'Giderler' : 'Alacaklar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : isAccountsModule ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(['summary', 'list', 'transactions', 'reports'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.subTab, uiStore.accountsTab === tab && styles.subTabActive]}
                onPress={() => uiStore.setAccountsTab(tab)}
              >
                <Text style={[styles.subTabText, { color: uiStore.accountsTab === tab ? lightColors.primary : lightColors.textSecondary }]}>
                  {tab === 'summary' ? 'Özet' : tab === 'list' ? 'Hesaplar' : tab === 'transactions' ? 'İşlemler' : 'Raporlar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : isMachinesModule ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(['summary', 'list', 'persons', 'expenses', 'receivables'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.subTab, uiStore.machinesTab === tab && styles.machineSubTabActive]}
                onPress={() => uiStore.setMachinesTab(tab)}
              >
                <Text style={[styles.subTabText, uiStore.machinesTab === tab && { color: lightColors.secondary }]}>
                  {tab === 'summary' ? 'Özet' : tab === 'list' ? 'Makineler' : tab === 'persons' ? 'Kişiler' : tab === 'expenses' ? 'Giderler' : 'Alacaklar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(['summary', 'fields', 'incomes', 'expenses', 'credits', 'harvests', 'sales', 'stocks', 'annualStock'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.subTab, uiStore.farmTab === tab && { borderBottomWidth: 2, borderBottomColor: '#059669' }]}
                onPress={() => uiStore.setFarmTab(tab)}
              >
                <Text style={[styles.subTabText, uiStore.farmTab === tab && { color: '#059669' }]}>
                  {tab === 'summary' ? 'Özet' : tab === 'fields' ? 'Tarlalar' : tab === 'incomes' ? 'Gelirler' : tab === 'expenses' ? 'Giderler' : tab === 'credits' ? 'Krediler' : tab === 'harvests' ? 'Hasat' : tab === 'sales' ? 'Satış' : tab === 'stocks' ? 'Depo' : 'Yıllık'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Content - Web'de sadece makine modülü render edilsin */}
      <View style={styles.contentContainer}>
        {isWebPlatform ? renderMachinesModule() : (isAccountsModule ? renderAccountsModule() : isMachinesModule ? renderMachinesModule() : renderFarmModule())}
      </View>

      {/* FAB - Tüm sekmelerde görünür (özet hariç) */}
      {(isWebPlatform ? (uiStore.machinesTab !== 'summary') : 
        ((isAccountsModule && uiStore.accountsTab !== 'summary' && uiStore.accountsTab !== 'reports') || 
        (isMachinesModule && uiStore.machinesTab !== 'summary') || 
        (isFarmModule && uiStore.farmTab !== 'summary'))) && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: isWebPlatform ? lightColors.secondary : (isAccountsModule ? lightColors.primary : isMachinesModule ? lightColors.secondary : '#059669') }]}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      {renderAccountModal()}
      {renderTransactionModal()}
      {renderMachineModal()}
      {renderExpenseModal()}
      {renderReceivableModal()}
      {renderFieldModal()}
      {renderEditTransactionModal()}
      {renderMachinePersonModal()}
      {renderMachineFieldModal()}
      {renderMachineReceivableModal()}
      {renderEditAccountModal()}
      {renderFarmFieldModal()}
      {renderFarmIncomeModal()}
      {renderFarmExpenseModal()}
      {renderFarmCreditModal()}
      {renderFarmHarvestModal()}
      {renderFarmSaleModal()}
      {renderFarmStockModal()}
      {renderAnnualStockModal()}
      {renderFieldStockUsageModal()}
      {renderDetailModal()}
      
      {/* Kişi Bazlı Toplu Ödeme Modalı */}
      <Modal visible={bulkPaymentModal} animationType="slide" transparent onRequestClose={closeBulkPaymentModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Toplu Ödeme</Text>
              <TouchableOpacity onPress={closeBulkPaymentModal}>
                <Ionicons name="close" size={24} color={lightColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPersonForBulkPayment && (
                <View>
                  {/* Kişi Özeti */}
                  <View style={[styles.summaryCard, { backgroundColor: '#8B5CF620', marginBottom: spacing.md }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                      <View style={[styles.avatar, { backgroundColor: '#8B5CF6', marginRight: spacing.sm, width: 36, height: 36, borderRadius: 18 }]}>
                        <Ionicons name="person" size={20} color="#FFF" />
                      </View>
                      <Text style={[styles.summaryCardTitle, { color: '#8B5CF6' }]}>{selectedPersonForBulkPayment.name}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Toplam Alacak:</Text>
                      <Text style={[styles.summaryValue, { color: lightColors.warning }]}>{formatCurrency(selectedPersonForBulkPayment.total_receivables || 0)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Ödenen:</Text>
                      <Text style={[styles.summaryValue, { color: lightColors.credit }]}>{formatCurrency(selectedPersonForBulkPayment.total_paid || 0)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Kalan Borç:</Text>
                      <Text style={[styles.summaryValue, { color: lightColors.error, fontWeight: 'bold' }]}>{formatCurrency(selectedPersonForBulkPayment.balance || 0)}</Text>
                    </View>
                  </View>
                  
                  {!bulkPaymentResult ? (
                    <View>
                      <Text style={styles.inputLabel}>Ödeme Tutarı *</Text>
                      <TextInput
                        style={styles.input}
                        value={bulkPaymentForm.amount}
                        onChangeText={(t) => setBulkPaymentForm({ ...bulkPaymentForm, amount: t })}
                        placeholder="0.00"
                        keyboardType="numeric"
                      />
                      
                      <Text style={styles.inputLabel}>Ödeme Tarihi</Text>
                      <TextInput
                        style={styles.input}
                        value={bulkPaymentForm.payment_date}
                        onChangeText={(t) => setBulkPaymentForm({ ...bulkPaymentForm, payment_date: t })}
                        placeholder="GG/AA/YYYY"
                      />
                      
                      <Text style={styles.inputLabel}>Açıklama</Text>
                      <TextInput
                        style={styles.input}
                        value={bulkPaymentForm.description}
                        onChangeText={(t) => setBulkPaymentForm({ ...bulkPaymentForm, description: t })}
                        placeholder="Ödeme notu..."
                      />
                      
                      <View style={{ backgroundColor: '#FEF3C7', padding: spacing.sm, borderRadius: borders.radius.md, marginBottom: spacing.md }}>
                        <Text style={{ color: '#92400E', fontSize: 12 }}>
                          ℹ️ Girilen tutar, en eski alacaklardan başlayarak otomatik olarak düşürülecektir.
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: '#10B981' }]} 
                        onPress={handleBulkPayment}
                      >
                        <Text style={styles.submitBtnText}>Ödemeyi Uygula</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      {/* Ödeme Sonucu */}
                      <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5', marginBottom: spacing.md }]}>
                        <Text style={[styles.summaryCardTitle, { color: '#059669' }]}>✅ Ödeme Başarılı</Text>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Uygulanan Tutar:</Text>
                          <Text style={[styles.summaryValue, { color: '#059669' }]}>{formatCurrency(bulkPaymentResult.total_paid)}</Text>
                        </View>
                        {bulkPaymentResult.unused_amount > 0 && (
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Kullanılmayan:</Text>
                            <Text style={[styles.summaryValue, { color: lightColors.warning }]}>{formatCurrency(bulkPaymentResult.unused_amount)}</Text>
                          </View>
                        )}
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Kalan Borç:</Text>
                          <Text style={[styles.summaryValue, { color: lightColors.error }]}>{formatCurrency(bulkPaymentResult.remaining_debt)}</Text>
                        </View>
                      </View>
                      
                      {/* Uygulanan Ödemeler */}
                      <Text style={styles.inputLabel}>Uygulanan Ödemeler:</Text>
                      {bulkPaymentResult.payments_applied.map((payment: any, index: number) => (
                        <View key={index} style={[styles.personFieldCard, { marginBottom: spacing.xs }]}>
                          <View style={[styles.personFieldIcon, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="checkmark" size={16} color="#059669" />
                          </View>
                          <View style={styles.personFieldInfo}>
                            <Text style={styles.personFieldName}>{payment.field_name || 'Alacak'}</Text>
                            <Text style={styles.personFieldDetail}>
                              {formatCurrency(payment.amount_applied)} ödendi • Kalan: {formatCurrency(payment.new_remaining)}
                            </Text>
                          </View>
                        </View>
                      ))}
                      
                      <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: '#6B7280', marginTop: spacing.md }]} 
                        onPress={closeBulkPaymentModal}
                      >
                        <Text style={styles.submitBtnText}>Kapat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Toplu Alacak Girişi Modalı */}
      <Modal visible={bulkReceivableModal} animationType="slide" transparent onRequestClose={() => setBulkReceivableModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Toplu Alacak Girişi</Text>
              <TouchableOpacity onPress={() => setBulkReceivableModal(false)}>
                <Ionicons name="close" size={24} color={lightColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Kişi Seçimi */}
              <Text style={styles.inputLabel}>Kişi Seç *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {machinePersonStore.persons.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.selectItem, selectedPersonForBulkReceivable === p.id && { backgroundColor: '#8B5CF6' }]}
                    onPress={() => setSelectedPersonForBulkReceivable(p.id)}
                  >
                    <Text style={[styles.selectItemText, selectedPersonForBulkReceivable === p.id && { color: '#FFF' }]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Alacak Satırları */}
              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Alacak Kayıtları</Text>
              
              {bulkReceivableItems.map((item, index) => {
                const personFields = machinePersonStore.machineFields.filter(f => f.person_id === selectedPersonForBulkReceivable);
                return (
                  <View key={index} style={{ backgroundColor: lightColors.surface, padding: spacing.sm, borderRadius: borders.radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: lightColors.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                      <Text style={{ fontWeight: '600', color: lightColors.text }}>Kayıt #{index + 1}</Text>
                      {bulkReceivableItems.length > 1 && (
                        <TouchableOpacity onPress={() => removeBulkReceivableItem(index)}>
                          <Ionicons name="trash-outline" size={20} color={lightColors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Tarla Seçimi */}
                    <Text style={[styles.inputLabel, { fontSize: 12 }]}>Tarla</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.horizontalScroll, { marginBottom: spacing.xs }]}>
                      {personFields.map((f) => (
                        <TouchableOpacity
                          key={f.id}
                          style={[styles.selectItem, { paddingVertical: 6 }, item.field_id === f.id && { backgroundColor: '#10B981' }]}
                          onPress={() => updateBulkReceivableItem(index, 'field_id', f.id)}
                        >
                          <Text style={[styles.selectItemText, { fontSize: 12 }, item.field_id === f.id && { color: '#FFF' }]}>{f.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    {/* Makine Seçimi */}
                    <Text style={[styles.inputLabel, { fontSize: 12 }]}>Makine</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.horizontalScroll, { marginBottom: spacing.xs }]}>
                      {machineStore.machines.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.selectItem, { paddingVertical: 6 }, item.machine_id === m.id && { backgroundColor: lightColors.primary }]}
                          onPress={() => updateBulkReceivableItem(index, 'machine_id', m.id)}
                        >
                          <Text style={[styles.selectItemText, { fontSize: 12 }, item.machine_id === m.id && { color: '#FFF' }]}>{m.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    {/* Dekar ve Birim Fiyat */}
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { fontSize: 12 }]}>Dekar</Text>
                        <TextInput
                          style={[styles.input, { paddingVertical: 8 }]}
                          value={item.decare_count}
                          onChangeText={(t) => updateBulkReceivableItem(index, 'decare_count', t)}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { fontSize: 12 }]}>Dekar Fiyatı</Text>
                        <TextInput
                          style={[styles.input, { paddingVertical: 8 }]}
                          value={item.price_per_decare}
                          onChangeText={(t) => updateBulkReceivableItem(index, 'price_per_decare', t)}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { fontSize: 12 }]}>Tutar *</Text>
                        <TextInput
                          style={[styles.input, { paddingVertical: 8, backgroundColor: item.amount ? '#D1FAE5' : lightColors.background }]}
                          value={item.amount}
                          onChangeText={(t) => updateBulkReceivableItem(index, 'amount', t)}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    
                    {/* Açıklama */}
                    <TextInput
                      style={[styles.input, { paddingVertical: 8, marginTop: spacing.xs }]}
                      value={item.description}
                      onChangeText={(t) => updateBulkReceivableItem(index, 'description', t)}
                      placeholder="Açıklama (opsiyonel)"
                    />
                  </View>
                );
              })}
              
              {/* Satır Ekle Butonu */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.sm, backgroundColor: lightColors.surface, borderRadius: borders.radius.md, borderWidth: 1, borderColor: lightColors.border, borderStyle: 'dashed', marginBottom: spacing.md }}
                onPress={addBulkReceivableItem}
              >
                <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
                <Text style={{ color: '#8B5CF6', marginLeft: spacing.xs, fontWeight: '500' }}>Yeni Satır Ekle</Text>
              </TouchableOpacity>
              
              {/* Toplam */}
              <View style={{ backgroundColor: '#8B5CF620', padding: spacing.sm, borderRadius: borders.radius.md, marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '600', color: '#8B5CF6' }}>Toplam ({bulkReceivableItems.filter(i => i.amount && parseFloat(i.amount) > 0).length} kayıt):</Text>
                  <Text style={{ fontWeight: 'bold', color: '#8B5CF6', fontSize: 16 }}>
                    {formatCurrency(bulkReceivableItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0))}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: '#8B5CF6' }]} 
                onPress={handleCreateBulkReceivables}
              >
                <Text style={styles.submitBtnText}>Tümünü Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Ödeme Modalı */}
      <Modal visible={paymentModal} animationType="slide" transparent onRequestClose={() => setPaymentModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Ödeme Al</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)}>
                <Ionicons name="close" size={24} color={lightColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedReceivableForPayment && (
                <View>
                  {/* Alacak Özeti */}
                  <View style={[styles.summaryCard, { backgroundColor: lightColors.warningLight, marginBottom: spacing.md }]}>
                    <Text style={[styles.summaryCardTitle, { color: lightColors.warning }]}>{selectedReceivableForPayment.person_name}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <View>
                        <Text style={styles.summaryLabel}>Kalan Tutar</Text>
                        <Text style={[styles.summaryValue, { color: lightColors.warning }]}>{formatCurrency(selectedReceivableForPayment.remaining_amount)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.summaryLabel}>Toplam</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(selectedReceivableForPayment.net_amount || selectedReceivableForPayment.amount)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Ödeme Formu */}
                  <Text style={styles.inputLabel}>Ödeme Tutarı *</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentForm.amount}
                    onChangeText={(t) => setPaymentForm({ ...paymentForm, amount: t })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  
                  <Text style={styles.inputLabel}>Ödeme Tarihi</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={paymentForm.payment_date}
                      onChangeText={(t) => setPaymentForm({ ...paymentForm, payment_date: t })}
                      placeholder="GG/AA/YYYY"
                    />
                    <TouchableOpacity style={styles.todayBtn} onPress={() => setPaymentForm({ ...paymentForm, payment_date: getTodayFormatted() })}>
                      <Text style={styles.todayBtnText}>Bugün</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.inputLabel}>Açıklama</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentForm.description}
                    onChangeText={(t) => setPaymentForm({ ...paymentForm, description: t })}
                    placeholder="Ödeme notu..."
                  />
                  
                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lightColors.credit }]} onPress={handleAddPayment}>
                    <Text style={styles.submitBtnText}>Ödeme Kaydet</Text>
                  </TouchableOpacity>
                  
                  {/* Ödeme Geçmişi */}
                  {receivablePayments.length > 0 && (
                    <View>
                      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>📜 Ödeme Geçmişi</Text>
                      {receivablePayments.map((payment) => (
                        <View key={payment.id} style={[styles.card, { marginBottom: 8 }]}>
                          <View style={styles.cardLeft}>
                            <View style={[styles.avatar, { backgroundColor: lightColors.credit }]}>
                              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                            </View>
                            <View style={styles.cardInfo}>
                              <Text style={styles.cardTitle}>{formatCurrency(payment.amount)}</Text>
                              <Text style={styles.cardSubtitle}>{formatDate(payment.payment_date)}</Text>
                              {payment.description && <Text style={styles.smallText}>{payment.description}</Text>}
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => handleDeletePayment(payment.id)}>
                            <Ionicons name="trash-outline" size={20} color={lightColors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Yıl Seçici Modal */}
      <Modal visible={showYearPicker} animationType="slide" transparent onRequestClose={() => setShowYearPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yıl Seçin</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={24} color={lightColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearPickerItem,
                      selectedYear === year && { backgroundColor: '#10B981' }
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                      loadYearSummary(year);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.yearPickerText,
                      selectedYear === year && { color: '#FFF', fontWeight: '600' as const }
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: lightColors.background },
  loadingText: { marginTop: spacing.md, fontSize: typography.fontSizes.md, color: lightColors.textSecondary },

  // Header
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: '#FFF' },
  headerSubtitle: { fontSize: typography.fontSizes.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  refreshBtn: { padding: spacing.sm },

  // Module Tabs
  moduleTabs: { flexDirection: 'row', backgroundColor: lightColors.surface, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: lightColors.border },
  moduleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  moduleTabActive: { borderBottomWidth: 2, borderBottomColor: lightColors.primary },
  machineModuleTabActive: { borderBottomWidth: 2, borderBottomColor: lightColors.secondary },
  moduleTabText: { fontSize: 13, fontWeight: '600', color: lightColors.textSecondary },

  // Sub Tabs
  subTabsContainer: { backgroundColor: lightColors.surface, borderBottomWidth: 1, borderBottomColor: lightColors.border, maxHeight: 36 },
  subTab: { paddingHorizontal: spacing.md, paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  subTabActive: { borderBottomColor: lightColors.primary },
  machineSubTabActive: { borderBottomColor: lightColors.secondary },
  subTabText: { fontSize: 12, fontWeight: '500', color: lightColors.textSecondary },

  // Content
  contentContainer: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.md },
  listContent: { paddingVertical: spacing.md, paddingBottom: 100 },
  sectionTitle: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.semibold, color: lightColors.text, marginTop: spacing.lg, marginBottom: spacing.sm },

  // Cards
  card: { backgroundColor: lightColors.surface, borderRadius: borders.radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardInfo: { marginLeft: spacing.md, flex: 1 },
  cardTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold, color: lightColors.text },
  cardSubtitle: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary, marginTop: 2 },
  balanceText: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold },
  balanceLabel: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginTop: 2 },
  smallText: { fontSize: typography.fontSizes.xs, marginTop: 2 },

  // Avatar
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },

  // Transaction Card
  transactionCard: { backgroundColor: lightColors.surface, borderRadius: borders.radius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  transactionMainArea: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { marginLeft: spacing.md, flex: 1 },
  transactionName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: lightColors.text },
  transactionDesc: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginTop: 2 },
  transactionDate: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginTop: 2 },
  transactionAmount: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, marginRight: spacing.sm },
  cardActionButtons: { flexDirection: 'row', gap: 4 },
  smallActionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  paidBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  paidBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' as const },

  // Summary Card
  summaryCard: { backgroundColor: lightColors.surface, borderRadius: borders.radius.lg, padding: spacing.md, marginTop: spacing.sm, borderLeftWidth: 4 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: lightColors.text, marginBottom: spacing.sm },
  summaryCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: lightColors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  
  // Person Dropdown
  personDropdownItem: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    marginRight: 8, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center'
  },
  personDropdownItemActive: { 
    backgroundColor: '#EC4899', 
    borderColor: '#EC4899' 
  },
  personDropdownText: { 
    fontSize: 13, 
    color: '#6B7280',
    fontWeight: '500'
  },
  personDropdownTextActive: { 
    color: '#FFF',
    fontWeight: '600'
  },

  // Empty State
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.semibold, color: lightColors.text, marginTop: spacing.md },
  emptyMessage: { fontSize: typography.fontSizes.md, color: lightColors.textSecondary, marginTop: spacing.xs },

  // FAB
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: lightColors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: lightColors.surface, borderTopLeftRadius: borders.radius.xl, borderTopRightRadius: borders.radius.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: lightColors.border },
  modalTitle: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.semibold, color: lightColors.text },

  // Form
  inputLabel: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, color: lightColors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { backgroundColor: lightColors.background, borderRadius: borders.radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.fontSizes.md, color: lightColors.text, borderWidth: 1, borderColor: lightColors.border },
  horizontalScroll: { marginBottom: spacing.sm },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borders.radius.md, borderWidth: 1, borderColor: lightColors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeBtnActive: { backgroundColor: lightColors.primary, borderColor: lightColors.primary },
  typeBtnText: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary },
  typeBtnTextActive: { color: '#FFF' },
  selectItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borders.radius.round, backgroundColor: lightColors.background, marginRight: spacing.sm, borderWidth: 1, borderColor: lightColors.border },
  selectItemActive: { backgroundColor: lightColors.primary, borderColor: lightColors.primary },
  selectItemText: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary },
  selectItemTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: lightColors.primary, borderRadius: borders.radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
  submitBtnText: { color: '#FFF', fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold },
  row: { flexDirection: 'row', gap: spacing.md },
  halfInput: { flex: 1 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center' },
  todayBtn: { backgroundColor: lightColors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: borders.radius.md },
  todayBtnText: { color: '#FFF', fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold },
  stockDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: lightColors.border },
  stockDetailName: { fontSize: typography.fontSizes.md, color: lightColors.text, fontWeight: typography.fontWeights.medium },
  stockDetailQty: { fontSize: typography.fontSizes.md, color: lightColors.primary, fontWeight: typography.fontWeights.bold },
  personFieldCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: lightColors.surface, borderRadius: borders.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  personFieldIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' },
  personFieldInfo: { flex: 1, marginLeft: spacing.md },
  personFieldName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: lightColors.text },
  personFieldDetail: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginTop: 2 },
  emptyFieldText: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary, textAlign: 'center', paddingVertical: spacing.md, fontStyle: 'italic' },
  helperText: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary, paddingVertical: spacing.sm, fontStyle: 'italic' },
  stockSelectItem: { backgroundColor: lightColors.surface, borderRadius: borders.radius.md, padding: spacing.md, marginRight: spacing.sm, alignItems: 'center', minWidth: 100 },
  stockSelectName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: lightColors.text },
  stockSelectQty: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginTop: 4 },
  stockInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: lightColors.primary + '15', borderRadius: borders.radius.md, padding: spacing.sm, marginVertical: spacing.sm, gap: spacing.sm },
  stockInfoText: { fontSize: typography.fontSizes.sm, color: lightColors.primary, fontWeight: typography.fontWeights.medium },
  errorText: { fontSize: typography.fontSizes.sm, color: lightColors.error, marginTop: 4 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#10B98115', borderRadius: borders.radius.md, padding: spacing.md, marginVertical: spacing.sm },
  totalLabel: { fontSize: typography.fontSizes.md, color: lightColors.text },
  totalValue: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: '#10B981' },

  // Tarla Bazlı Özet Stilleri
  fieldSelectorContainer: { marginBottom: spacing.md },
  fieldSelectorChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: lightColors.background, borderRadius: borders.radius.md, marginRight: spacing.sm, borderWidth: 1, borderColor: lightColors.border },
  fieldSelectorChipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  fieldSelectorText: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary },
  fieldSelectorTextActive: { color: '#FFF', fontWeight: typography.fontWeights.semibold as any },
  fieldSummaryMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.sm },
  fieldSummaryMetricItem: { flex: 1, backgroundColor: lightColors.background, borderRadius: borders.radius.md, padding: spacing.md, alignItems: 'center' },
  fieldMetricLabel: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginBottom: 4 },
  fieldMetricValue: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold as any },
  fieldSummarySection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: lightColors.border },
  fieldSectionTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold as any, color: lightColors.text, marginBottom: spacing.sm },
  fieldSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  fieldRowLabel: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary },
  fieldRowValue: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold as any, color: lightColors.text },

  // Detail Modal
  detailHeader: { alignItems: 'center', paddingVertical: spacing.lg },
  detailName: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: lightColors.text, marginTop: spacing.md },
  detailBalance: { fontSize: typography.fontSizes.xxl, fontWeight: typography.fontWeights.bold, marginTop: spacing.sm },
  detailSubtext: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary, marginTop: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: lightColors.border, gap: spacing.md },
  detailText: { fontSize: typography.fontSizes.md, color: lightColors.text, flex: 1 },
  detailStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.lg },
  detailStat: { alignItems: 'center' },
  detailStatValue: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold },
  detailStatLabel: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary, marginTop: spacing.xs },
  detailActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borders.radius.md, gap: spacing.xs },
  actionBtnText: { color: '#FFF', fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold },

  // Filter Bar
  filterBar: { backgroundColor: lightColors.surface, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: lightColors.border },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: lightColors.background, marginRight: spacing.sm, borderWidth: 1, borderColor: lightColors.border },
  filterChipActive: { backgroundColor: lightColors.primary, borderColor: lightColors.primary },
  filterChipText: { fontSize: typography.fontSizes.sm, color: lightColors.textSecondary },
  filterChipTextActive: { color: '#FFF' },

  // Charts
  chartContainer: { backgroundColor: lightColors.surface, borderRadius: borders.radius.lg, padding: spacing.md, marginTop: spacing.sm, alignItems: 'center' },

  // Status Badge
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borders.radius.sm },
  statusBadgeText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.medium },
  dateText: { fontSize: typography.fontSizes.xs, color: lightColors.textSecondary },

  // Year Picker
  yearPickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  yearPickerText: {
    fontSize: 16,
    color: lightColors.text,
  },
});
