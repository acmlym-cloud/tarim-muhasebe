// Offline-First API Service
// Tüm veriler telefonun hafızasında saklanır - İnternet gerekmez!

import storage from './offlineStorage';

// ==================== ACCOUNTS ====================

export const getAccounts = async () => {
  const accounts = await storage.accounts.getAll();
  const transactions = await storage.transactions.getAll();
  
  // Her hesap için balance hesapla
  return accounts.map((account: any) => {
    const accountTransactions = transactions.filter((t: any) => t.account_id === account.id);
    
    let totalDebt = 0;
    let totalCredit = 0;
    
    accountTransactions.forEach((t: any) => {
      if (t.type === 'debt') {
        totalDebt += (t.amount || 0);
      } else {
        totalCredit += (t.amount || 0);
      }
    });
    
    const balance = totalCredit - totalDebt;
    
    return {
      ...account,
      balance: balance || 0,
      total_debt: totalDebt || 0,
      total_credit: totalCredit || 0,
    };
  });
};

export const createAccount = async (data: any) => {
  return storage.accounts.add(data);
};

export const updateAccount = async (id: string, data: any) => {
  return storage.accounts.update(id, data);
};

export const deleteAccount = async (id: string) => {
  return storage.accounts.delete(id);
};

export const getAccountsSummary = async () => {
  const accounts = await getAccounts();
  
  const totalDebt = accounts.reduce((sum: number, a: any) => sum + (a.total_debt || 0), 0);
  const totalCredit = accounts.reduce((sum: number, a: any) => sum + (a.total_credit || 0), 0);
  const totalBalance = totalCredit - totalDebt;
  
  return {
    total_accounts: accounts.length,
    total_debt: totalDebt,
    total_credit: totalCredit,
    total_balance: totalBalance,
    net_balance: totalBalance,
  };
};

// ==================== TRANSACTIONS ====================

export const getTransactions = async () => {
  const transactions = await storage.transactions.getAll();
  const accounts = await storage.accounts.getAll();
  
  // Her işleme hesap adını ekle
  return transactions.map((t: any) => {
    const account = accounts.find((a: any) => a.id === t.account_id);
    return {
      ...t,
      account_name: account?.name || 'Bilinmeyen',
    };
  });
};

export const createTransaction = async (data: any) => {
  // transaction_type'ı type'a dönüştür (form uyumluluğu için)
  const transactionData = {
    ...data,
    type: data.transaction_type || data.type || 'credit',
  };
  return storage.transactions.add(transactionData);
};

export const deleteTransaction = async (id: string) => {
  return storage.transactions.delete(id);
};

// ==================== MACHINES ====================

export const getMachines = async () => {
  const machines = await storage.machines.getAll();
  const expenses = await storage.machineExpenses.getAll();
  const receivables = await storage.machineReceivables.getAll();
  
  // Her makine için gelir ve gider hesapla
  return machines.map((machine: any) => {
    const machineExpenses = expenses.filter((e: any) => e.machine_id === machine.id);
    const machineReceivables = receivables.filter((r: any) => r.machine_id === machine.id);
    
    const totalExpenses = machineExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalIncome = machineReceivables.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0);
    
    return {
      ...machine,
      total_income: totalIncome || 0,
      total_expenses: totalExpenses || 0,
    };
  });
};

export const createMachine = async (data: any) => {
  return storage.machines.add(data);
};

export const updateMachine = async (id: string, data: any) => {
  return storage.machines.update(id, data);
};

export const deleteMachine = async (id: string) => {
  return storage.machines.delete(id);
};

export const getMachinesSummary = async () => {
  const machines = await getMachines();
  const receivables = await storage.machineReceivables.getAll();
  
  const totalValue = machines.reduce((sum: number, m: any) => sum + (m.purchase_price || 0), 0);
  const totalExpenses = machines.reduce((sum: number, m: any) => sum + (m.total_expenses || 0), 0);
  const totalIncome = machines.reduce((sum: number, m: any) => sum + (m.total_income || 0), 0);
  
  const totalReceivables = receivables.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const totalPaid = receivables.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0);
  const totalRemaining = totalReceivables - totalPaid;
  
  // Toplam dekar hesabı (alacak kayıtlarından)
  const totalDecare = receivables.reduce((sum: number, r: any) => sum + (r.decare_count || 0), 0);
  
  return {
    total_machines: machines.length,
    total_value: totalValue || 0,
    total_expenses: totalExpenses || 0,
    total_income: totalIncome || 0,
    total_receivables: totalReceivables || 0,
    total_paid: totalPaid || 0,
    total_remaining: totalRemaining || 0,
    total_decare: totalDecare || 0,
  };
};

// ==================== MACHINE PERSONS ====================

export const getMachinePersons = async () => {
  const persons = await storage.machinePersons.getAll();
  const receivables = await storage.machineReceivables.getAll();
  const fields = await storage.machineFields.getAll();
  
  // Her kişi için balance ve field_count hesapla
  return persons.map((person: any) => {
    const personReceivables = receivables.filter((r: any) => r.person_id === person.id);
    const personFields = fields.filter((f: any) => f.person_id === person.id);
    
    const totalReceivable = personReceivables.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const totalPaid = personReceivables.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0);
    const balance = totalReceivable - totalPaid;
    
    return {
      ...person,
      balance: balance || 0,
      total_debt: totalReceivable || 0,
      total_paid: totalPaid || 0,
      field_count: personFields.length || 0,
    };
  });
};

export const createMachinePerson = async (data: any) => {
  return storage.machinePersons.add(data);
};

export const updateMachinePerson = async (id: string, data: any) => {
  return storage.machinePersons.update(id, data);
};

export const deleteMachinePerson = async (id: string) => {
  return storage.machinePersons.delete(id);
};

export const getMachinePersonsSummary = async () => {
  const persons = await getMachinePersons();
  const totalReceivables = persons.reduce((sum: number, p: any) => sum + (p.total_debt || 0), 0);
  const totalPaid = persons.reduce((sum: number, p: any) => sum + (p.total_paid || 0), 0);
  
  return {
    total_persons: persons.length,
    total_receivables: totalReceivables,
    total_paid: totalPaid,
    total_remaining: totalReceivables - totalPaid,
  };
};

// ==================== MACHINE FIELDS ====================

export const getMachineFields = async () => {
  return storage.machineFields.getAll();
};

export const createMachineField = async (data: any) => {
  return storage.machineFields.add(data);
};

export const deleteMachineField = async (id: string) => {
  return storage.machineFields.delete(id);
};

// ==================== MACHINE EXPENSES ====================

export const getMachineExpenses = async () => {
  const expenses = await storage.machineExpenses.getAll();
  const machines = await storage.machines.getAll();
  
  // Her gidere makine adını ekle
  return expenses.map((e: any) => {
    const machine = machines.find((m: any) => m.id === e.machine_id);
    return {
      ...e,
      machine_name: machine?.name || 'Bilinmeyen',
    };
  });
};

export const createMachineExpense = async (data: any) => {
  return storage.machineExpenses.add(data);
};

export const updateMachineExpense = async (id: string, data: any) => {
  return storage.machineExpenses.update(id, data);
};

export const deleteMachineExpense = async (id: string) => {
  return storage.machineExpenses.delete(id);
};

// ==================== MACHINE RECEIVABLES ====================

export const getMachineReceivables = async () => {
  const receivables = await storage.machineReceivables.getAll();
  const persons = await storage.machinePersons.getAll();
  const fields = await storage.machineFields.getAll();
  const machines = await storage.machines.getAll();
  
  // Her alacağa kişi, tarla ve makine adını ekle
  return receivables.map((r: any) => {
    const person = persons.find((p: any) => p.id === r.person_id);
    const field = fields.find((f: any) => f.id === r.field_id);
    const machine = machines.find((m: any) => m.id === r.machine_id);
    
    // decare_count yoksa tarla bilgisinden al
    const decareCount = r.decare_count || (field ? parseFloat(field.size_decare) || 0 : 0);
    
    return {
      ...r,
      person_name: person?.name || 'Bilinmeyen',
      field_name: field?.name || '',
      machine_name: machine?.name || '',
      decare_count: decareCount,
      remaining_amount: (r.amount || 0) - (r.paid_amount || 0),
      status: ((r.amount || 0) - (r.paid_amount || 0)) <= 0 ? 'paid' : 'pending',
    };
  });
};

export const createMachineReceivable = async (data: any) => {
  return storage.machineReceivables.add(data);
};

export const updateMachineReceivable = async (id: string, data: any) => {
  return storage.machineReceivables.update(id, data);
};

export const deleteMachineReceivable = async (id: string) => {
  return storage.machineReceivables.delete(id);
};

export const addPaymentToReceivable = async (receivableId: string, payment: { amount: number; description?: string }) => {
  return storage.machineReceivables.addPayment(receivableId, payment);
};

// ==================== FARM FIELDS ====================

export const getFarmFields = async () => {
  return storage.farmFields.getAll();
};

export const createFarmField = async (data: any) => {
  return storage.farmFields.add(data);
};

export const updateFarmField = async (id: string, data: any) => {
  return storage.farmFields.update(id, data);
};

export const deleteFarmField = async (id: string) => {
  return storage.farmFields.delete(id);
};

// ==================== FARM INCOMES ====================

export const getFarmIncomes = async () => {
  const incomes = await storage.farmIncomes.getAll();
  const fields = await storage.farmFields.getAll();
  
  return incomes.map((i: any) => {
    const field = fields.find((f: any) => f.id === i.field_id);
    return {
      ...i,
      field_name: field?.name || '',
    };
  });
};

export const createFarmIncome = async (data: any) => {
  return storage.farmIncomes.add(data);
};

export const updateFarmIncome = async (id: string, data: any) => {
  return storage.farmIncomes.update(id, data);
};

export const deleteFarmIncome = async (id: string) => {
  return storage.farmIncomes.delete(id);
};

// ==================== FARM EXPENSES ====================

export const getFarmExpenses = async () => {
  const expenses = await storage.farmExpenses.getAll();
  const fields = await storage.farmFields.getAll();
  
  return expenses.map((e: any) => {
    const field = fields.find((f: any) => f.id === e.field_id);
    return {
      ...e,
      field_name: field?.name || '',
    };
  });
};

export const createFarmExpense = async (data: any) => {
  return storage.farmExpenses.add(data);
};

export const updateFarmExpense = async (id: string, data: any) => {
  return storage.farmExpenses.update(id, data);
};

export const deleteFarmExpense = async (id: string) => {
  return storage.farmExpenses.delete(id);
};

// ==================== FARM CREDITS ====================

export const getFarmCredits = async () => {
  const credits = await storage.farmCredits.getAll();
  const today = new Date();
  
  return credits.map((credit: any) => {
    // Gün hesaplamaları
    let daysElapsed = 0;
    let daysRemaining = 0;
    
    if (credit.start_date) {
      const startDate = new Date(credit.start_date);
      daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    if (credit.due_date) {
      const dueDate = new Date(credit.due_date);
      daysRemaining = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Faiz hesaplaması
    const amount = parseFloat(credit.amount) || 0;
    const interestRate = parseFloat(credit.interest_rate) || 0;
    const termMonths = parseFloat(credit.term_months) || 12;
    
    // Toplam faiz (vade sonunda)
    let totalInterest = 0;
    if (credit.interest_type === 'compound') {
      totalInterest = amount * Math.pow(1 + interestRate / 100, termMonths / 12) - amount;
    } else {
      totalInterest = amount * (interestRate / 100) * (termMonths / 12);
    }
    
    // Bugüne kadar birikmiş faiz (geçen güne göre)
    const yearsElapsed = daysElapsed / 365;
    let accruedInterest = 0;
    if (credit.interest_type === 'compound') {
      // Bileşik faiz: A = P(1 + r)^t - P
      accruedInterest = amount * Math.pow(1 + interestRate / 100, yearsElapsed) - amount;
    } else {
      // Basit faiz: A = P * r * t
      accruedInterest = amount * (interestRate / 100) * yearsElapsed;
    }
    
    const totalPayable = amount + totalInterest;
    const paidAmount = parseFloat(credit.paid_amount) || 0;
    const remainingAmount = totalPayable - paidAmount;
    
    return {
      ...credit,
      days_elapsed: daysElapsed || 0,
      days_remaining: daysRemaining || 0,
      interest_amount: totalInterest || 0,        // Toplam faiz (vade sonunda)
      accrued_interest: accruedInterest || 0,     // Bugüne kadar birikmiş faiz
      total_payable: totalPayable || 0,
      remaining_amount: remainingAmount || 0,
      status: remainingAmount <= 0 ? 'odendi' : (daysRemaining < 0 ? 'gecikti' : 'devam'),
    };
  });
};

export const createFarmCredit = async (data: any) => {
  return storage.farmCredits.add(data);
};

export const updateFarmCredit = async (id: string, data: any) => {
  return storage.farmCredits.update(id, data);
};

export const deleteFarmCredit = async (id: string) => {
  return storage.farmCredits.delete(id);
};

export const getFarmCreditSummary = async () => {
  return storage.summaries.credits();
};

// ==================== FARM HARVESTS ====================

export const getFarmHarvests = async () => {
  const harvests = await storage.farmHarvests.getAll();
  const fields = await storage.farmFields.getAll();
  
  return harvests.map((h: any) => {
    const field = fields.find((f: any) => f.id === h.field_id);
    return {
      ...h,
      field_name: field?.name || '',
      quantity: h.quantity || 0,
    };
  });
};

export const createFarmHarvest = async (data: any) => {
  const harvest = await storage.farmHarvests.add(data);
  
  // Hasadı otomatik olarak stoka ekle
  const existingStocks = await storage.farmStocks.getAll();
  const existingStock = existingStocks.find((s: any) => 
    s.item_name === data.crop_name && s.unit === data.unit && s.field_id === data.field_id
  );
  
  if (existingStock) {
    // Mevcut stoka ekle
    await storage.farmStocks.update(existingStock.id, {
      quantity: (existingStock.quantity || 0) + (data.quantity || 0)
    });
  } else {
    // Yeni stok oluştur
    await storage.farmStocks.add({
      item_name: data.crop_name,
      quantity: data.quantity || 0,
      unit: data.unit || 'kg',
      category: 'hasat',
      field_id: data.field_id || '',
      notes: `${data.crop_name} hasadından`
    });
  }
  
  return harvest;
};

export const updateFarmHarvest = async (id: string, data: any) => {
  return storage.farmHarvests.update(id, data);
};

export const deleteFarmHarvest = async (id: string) => {
  return storage.farmHarvests.delete(id);
};

// ==================== FARM SALES ====================

export const getFarmSales = async () => {
  const sales = await storage.farmSales.getAll();
  
  return sales.map((s: any) => ({
    ...s,
    quantity: s.quantity || 0,
    unit_price: s.unit_price || 0,
    total_price: s.total_price || ((s.quantity || 0) * (s.unit_price || 0)),
  }));
};

export const createFarmSale = async (data: any) => {
  const sale = await storage.farmSales.add({
    ...data,
    total_price: (data.quantity || 0) * (data.unit_price || 0),
  });
  
  // Satışı stoktan düş
  const stocks = await storage.farmStocks.getAll();
  const stock = stocks.find((s: any) => 
    s.item_name === data.crop_name && s.unit === data.unit
  );
  
  if (stock) {
    const newQuantity = Math.max(0, (stock.quantity || 0) - (data.quantity || 0));
    await storage.farmStocks.update(stock.id, { quantity: newQuantity });
  }
  
  return sale;
};

export const updateFarmSale = async (id: string, data: any) => {
  return storage.farmSales.update(id, {
    ...data,
    total_price: (data.quantity || 0) * (data.unit_price || 0),
  });
};

export const deleteFarmSale = async (id: string) => {
  // Önce satışı bul
  const sales = await storage.farmSales.getAll();
  const sale = sales.find((s: any) => s.id === id);
  
  if (sale) {
    // Satışı stoka geri ekle
    const stocks = await storage.farmStocks.getAll();
    const stock = stocks.find((s: any) => 
      s.item_name === sale.crop_name && s.unit === sale.unit
    );
    
    if (stock) {
      await storage.farmStocks.update(stock.id, {
        quantity: (stock.quantity || 0) + (sale.quantity || 0)
      });
    } else {
      // Stok yoksa yeni oluştur
      await storage.farmStocks.add({
        item_name: sale.crop_name,
        quantity: sale.quantity || 0,
        unit: sale.unit || 'kg',
        category: 'iade',
        notes: `Satış iadesi`
      });
    }
  }
  
  return storage.farmSales.delete(id);
};

// ==================== FARM STOCKS ====================

export const getFarmStocks = async () => {
  const stocks = await storage.farmStocks.getAll();
  
  return stocks.map((s: any) => ({
    ...s,
    quantity: s.quantity || 0,
  }));
};

export const createFarmStock = async (data: any) => {
  return storage.farmStocks.add(data);
};

export const updateFarmStock = async (id: string, data: any) => {
  return storage.farmStocks.update(id, data);
};

export const deleteFarmStock = async (id: string) => {
  return storage.farmStocks.delete(id);
};

// ==================== ANNUAL STOCKS ====================

export const getAnnualStocks = async () => {
  const stocks = await storage.annualStocks.getAll();
  
  return stocks.map((s: any) => {
    const quantity = parseFloat(s.quantity) || 0;
    const usedQuantity = parseFloat(s.used_quantity) || 0;
    const unitPrice = parseFloat(s.unit_price) || 0;
    const remainingQuantity = quantity - usedQuantity;
    
    return {
      ...s,
      quantity: quantity,
      used_quantity: usedQuantity,
      remaining_quantity: remainingQuantity,
      unit_price: unitPrice,
      total_value: quantity * unitPrice,
      total_cost: quantity * unitPrice,
      used_cost: usedQuantity * unitPrice,
      remaining_cost: remainingQuantity * unitPrice,
    };
  });
};

export const createAnnualStock = async (data: any) => {
  return storage.annualStocks.add({
    ...data,
    used_quantity: 0,
    remaining_quantity: data.quantity || 0,
  });
};

export const updateAnnualStock = async (id: string, data: any) => {
  return storage.annualStocks.update(id, data);
};

export const deleteAnnualStock = async (id: string) => {
  return storage.annualStocks.delete(id);
};

export const getAnnualStockSummary = async () => {
  const stocks = await getAnnualStocks();
  
  const totalCost = stocks.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0);
  const usedCost = stocks.reduce((sum: number, s: any) => sum + (s.used_cost || 0), 0);
  const remainingCost = stocks.reduce((sum: number, s: any) => sum + (s.remaining_cost || 0), 0);
  
  return {
    total_stocks: stocks.length,
    total_items: stocks.length,
    total_value: totalCost,
    total_cost: totalCost,
    used_value: usedCost,
    used_cost: usedCost,
    remaining_value: remainingCost,
    remaining_cost: remainingCost,
  };
};

// ==================== FIELD STOCK USAGE ====================

export const getFieldStockUsage = async (fieldId?: string) => {
  // Yıllık stoklardan tarlalara yapılan atamaları getir
  const stocks = await getAnnualStocks();
  return stocks.filter((s: any) => s.field_id === fieldId || !fieldId);
};

export const createFieldStockUsage = async (data: any) => {
  // Yıllık stoktan tarlaya atama yap
  const stocks = await storage.annualStocks.getAll();
  const stock = stocks.find((s: any) => s.id === data.stock_id);
  
  if (!stock) {
    throw new Error('Stok bulunamadı');
  }
  
  const usedQty = data.used_quantity || 0;
  const currentUsed = stock.used_quantity || 0;
  const totalQty = stock.quantity || 0;
  
  if (currentUsed + usedQty > totalQty) {
    throw new Error('Yeterli stok yok');
  }
  
  // Stoku güncelle
  await storage.annualStocks.update(stock.id, {
    used_quantity: currentUsed + usedQty,
    remaining_quantity: totalQty - (currentUsed + usedQty),
  });
  
  // Gider olarak ekle (eğer isteniyorsa)
  if (data.add_to_expense) {
    await storage.farmExpenses.add({
      field_id: data.field_id,
      expense_type: stock.stock_type || 'diger',
      amount: usedQty * (stock.unit_price || 0),
      description: `${stock.name} kullanımı (${usedQty} ${stock.unit})`,
      date: data.usage_date || new Date().toISOString(),
    });
  }
  
  return { success: true, used_quantity: usedQty };
};

export const updateFieldStockUsage = async (id: string, data: any) => {
  // Stock kullanımı güncelleme
  return { success: true, ...data, id };
};

// ==================== FARM SUMMARY ====================

export const getFarmSummary = async () => {
  const fields = await storage.farmFields.getAll();
  const incomes = await storage.farmIncomes.getAll();
  const expenses = await storage.farmExpenses.getAll();
  const harvests = await storage.farmHarvests.getAll();
  const sales = await storage.farmSales.getAll();
  const stocks = await storage.farmStocks.getAll();
  const credits = await storage.farmCredits.getAll();
  
  const totalIncome = incomes.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalSales = sales.reduce((sum: number, s: any) => sum + (parseFloat(s.total_price) || 0), 0);
  const totalHarvest = harvests.reduce((sum: number, h: any) => sum + (parseFloat(h.quantity) || 0), 0);
  const totalDecare = fields.reduce((sum: number, f: any) => sum + (parseFloat(f.size_decare) || 0), 0);
  
  // Ürün bazlı hasat özeti
  const harvestByCrop: Record<string, { quantity: number; unit: string }> = {};
  harvests.forEach((h: any) => {
    const cropName = h.crop_name || 'Diğer';
    const unit = h.unit || 'kg';
    if (!harvestByCrop[cropName]) {
      harvestByCrop[cropName] = { quantity: 0, unit };
    }
    harvestByCrop[cropName].quantity += (parseFloat(h.quantity) || 0);
  });
  
  // Ürün bazlı satış özeti
  const salesByCrop: Record<string, { quantity: number; amount: number; unit: string }> = {};
  sales.forEach((s: any) => {
    const cropName = s.crop_name || 'Diğer';
    const unit = s.unit || 'kg';
    if (!salesByCrop[cropName]) {
      salesByCrop[cropName] = { quantity: 0, amount: 0, unit };
    }
    salesByCrop[cropName].quantity += (parseFloat(s.quantity) || 0);
    salesByCrop[cropName].amount += (parseFloat(s.total_price) || 0);
  });
  
  // Kredi hesaplamaları
  const totalCreditAmount = credits.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalCreditPaid = credits.reduce((sum: number, c: any) => sum + (c.paid_amount || 0), 0);
  const creditRemaining = totalCreditAmount - totalCreditPaid;
  
  const netCash = (totalIncome + totalSales) - totalExpense;
  
  return {
    total_fields: fields.length,
    total_decare: totalDecare || 0,
    total_income: totalIncome || 0,
    total_expense: totalExpense || 0,
    total_expenses: totalExpense || 0,
    total_sales: totalSales || 0,
    total_harvest: totalHarvest || 0,
    net_profit: netCash,
    net_cash: netCash,
    stock_count: stocks.length,
    credit_remaining: creditRemaining || 0,
    total_credit: totalCreditAmount || 0,
    total_credit_paid: totalCreditPaid || 0,
    harvest_by_crop: harvestByCrop,
    sales_by_crop: salesByCrop,
  };
};

// ==================== YEAR SUMMARY ====================

export const getYearSummary = async (year: number = 2025) => {
  // Tüm verileri çek
  const incomes = await storage.farmIncomes.getAll();
  const expenses = await storage.farmExpenses.getAll();
  const sales = await storage.farmSales.getAll();
  const credits = await storage.farmCredits.getAll();
  const machineReceivables = await storage.machineReceivables.getAll();
  const machineExpenses = await storage.machineExpenses.getAll();
  
  // Yıla göre filtrele
  const yearIncomes = incomes.filter((i: any) => {
    const itemYear = i.date ? new Date(i.date).getFullYear() : year;
    return itemYear === year;
  });
  const yearExpenses = expenses.filter((e: any) => {
    const itemYear = e.date ? new Date(e.date).getFullYear() : year;
    return itemYear === year;
  });
  const yearSales = sales.filter((s: any) => {
    const itemYear = s.date ? new Date(s.date).getFullYear() : year;
    return itemYear === year;
  });
  const yearMachineReceivables = machineReceivables.filter((r: any) => {
    const itemYear = r.created_at ? new Date(r.created_at).getFullYear() : year;
    return itemYear === year;
  });
  const yearMachineExpenses = machineExpenses.filter((e: any) => {
    const itemYear = e.date ? new Date(e.date).getFullYear() : year;
    return itemYear === year;
  });
  
  // Çiftlik hesaplamaları
  const farmTotalIncome = yearIncomes.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const farmTotalExpense = yearExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const farmTotalSales = yearSales.reduce((sum: number, s: any) => sum + (s.total_price || 0), 0);
  
  // Kredi hesaplamaları
  const totalPrincipal = credits.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalInterest = credits.reduce((sum: number, c: any) => sum + ((c.interest_amount || 0)), 0);
  const totalPaid = credits.reduce((sum: number, c: any) => sum + (c.paid_amount || 0), 0);
  const totalPayable = totalPrincipal + totalInterest;
  
  // Makine hesaplamaları
  const machineCollectedIncome = yearMachineReceivables
    .filter((r: any) => r.status === 'paid')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const machinePendingIncome = yearMachineReceivables
    .filter((r: any) => r.status !== 'paid')
    .reduce((sum: number, r: any) => sum + ((r.remaining_amount || r.amount) || 0), 0);
  const machineTotalExpense = yearMachineExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  
  const farmNet = farmTotalIncome + farmTotalSales - farmTotalExpense;
  const machineNet = machineCollectedIncome - machineTotalExpense;
  const yearNet = farmNet + machineNet;
  
  return {
    year,
    farm: {
      total_income: farmTotalIncome,
      total_sales: farmTotalSales,
      total_expense: farmTotalExpense,
      all_expense: farmTotalExpense,
      net: farmNet,
      credit: {
        total_principal: totalPrincipal,
        total_interest: totalInterest,
        total_paid: totalPaid,
        total_payable: totalPayable,
        remaining: totalPayable - totalPaid,
      }
    },
    machine: {
      collected_income: machineCollectedIncome,
      pending_income: machinePendingIncome,
      total_expense: machineTotalExpense,
      net: machineNet,
    },
    year_net: yearNet,
  };
};

// ==================== CHART DATA ====================

export const getChartData = async () => {
  return {
    monthly: [],
    categories: [],
  };
};

// ==================== BACKUP & RESTORE ====================

export const backupAllData = async () => {
  return storage.backup();
};

export const restoreAllData = async (jsonData: string) => {
  return storage.restore(jsonData);
};

export const clearAllData = async () => {
  return storage.clear();
};

// ==================== ALIAS FUNCTIONS ====================
// (index.tsx'in beklediği isimlerle uyumluluk için)

export const getExpenses = getMachineExpenses;
export const createExpense = createMachineExpense;
export const updateExpense = updateMachineExpense;
export const deleteExpense = deleteMachineExpense;

export const createReceivable = createMachineReceivable;
export const createField = createMachineField;
export const updateMachineField = async (id: string, data: any) => {
  return storage.machineFields.update(id, data);
};

// ==================== TRANSACTION HELPERS ====================

export const markTransactionPaid = async (id: string) => {
  const transactions = await storage.transactions.getAll();
  const txn = transactions.find((t: any) => t.id === id);
  if (!txn) return null;
  const isPaid = txn.is_paid;
  const updated = await storage.transactions.update(id, { is_paid: !isPaid });
  return updated;
};

export const updateTransaction = async (id: string, data: any) => {
  return storage.transactions.update(id, data);
};

// ==================== RECEIVABLE PAYMENTS ====================

export const getReceivablePayments = async (receivableId: string) => {
  const receivables = await storage.machineReceivables.getAll();
  const receivable = receivables.find((r: any) => r.id === receivableId);
  return receivable?.payments || [];
};

export const addMachineReceivablePayment = addPaymentToReceivable;

export const deletePayment = async (paymentId: string) => {
  const receivables = await storage.machineReceivables.getAll();
  for (const receivable of receivables) {
    if (receivable.payments && receivable.payments.some((p: any) => p.id === paymentId)) {
      const payment = receivable.payments.find((p: any) => p.id === paymentId);
      receivable.payments = receivable.payments.filter((p: any) => p.id !== paymentId);
      receivable.paid_amount = Math.max(0, (receivable.paid_amount || 0) - (payment?.amount || 0));
      receivable.remaining_amount = receivable.amount - receivable.paid_amount;
      receivable.status = receivable.remaining_amount <= 0 ? 'paid' : 'pending';
      await storage.machineReceivables.update(receivable.id, receivable);
      return true;
    }
  }
  return false;
};

// ==================== BULK OPERATIONS ====================

export const createBulkReceivables = async (personId: string, items: any[]) => {
  const results = [];
  for (const item of items) {
    const receivable = await storage.machineReceivables.add({
      person_id: personId,
      ...item
    });
    results.push(receivable);
  }
  return { success: true, created: results.length };
};

export const addPersonBulkPayment = async (personId: string, data: { amount: number; description?: string }) => {
  const receivables = await storage.machineReceivables.getAll();
  const personReceivables = receivables.filter((r: any) => r.person_id === personId && r.status !== 'paid');
  
  let remainingAmount = data.amount;
  let paidCount = 0;
  
  for (const receivable of personReceivables) {
    if (remainingAmount <= 0) break;
    
    const amountToPay = Math.min(remainingAmount, receivable.remaining_amount || receivable.amount);
    await addPaymentToReceivable(receivable.id, { 
      amount: amountToPay, 
      description: data.description || 'Toplu ödeme'
    });
    
    remainingAmount -= amountToPay;
    paidCount++;
  }
  
  return { success: true, paid_count: paidCount };
};

// ==================== CREDIT HELPERS ====================

export const markCreditPaid = async (creditId: string) => {
  const credits = await storage.farmCredits.getAll();
  const credit = credits.find((c: any) => c.id === creditId);
  if (!credit) return null;
  
  return storage.farmCredits.update(creditId, {
    paid_amount: credit.amount,
    status: 'odendi'
  });
};

export const getCreditSummary = async () => {
  return storage.summaries.credits();
};

// ==================== FARM FIELD SUMMARY ====================

export const getFarmFieldSummary = async (fieldId: string) => {
  const fields = await storage.farmFields.getAll();
  const field = fields.find((f: any) => f.id === fieldId);
  if (!field) return null;
  
  const incomes = await storage.farmIncomes.getAll();
  const expenses = await storage.farmExpenses.getAll();
  const harvests = await storage.farmHarvests.getAll();
  const sales = await storage.farmSales.getAll();
  
  const fieldIncomes = incomes.filter((i: any) => i.field_id === fieldId);
  const fieldExpenses = expenses.filter((e: any) => e.field_id === fieldId);
  const fieldHarvests = harvests.filter((h: any) => h.field_id === fieldId);
  const fieldSales = sales.filter((s: any) => s.field_id === fieldId);
  
  const totalIncome = fieldIncomes.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);
  const totalExpense = fieldExpenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
  const totalSales = fieldSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total_price) || 0), 0);
  const totalHarvest = fieldHarvests.reduce((sum: number, h: any) => sum + (parseFloat(h.quantity) || 0), 0);
  const totalSoldQuantity = fieldSales.reduce((sum: number, s: any) => sum + (parseFloat(s.quantity) || 0), 0);
  
  const profitLoss = (totalIncome + totalSales) - totalExpense;
  const sizeDecare = parseFloat(field.size_decare) || 0;
  
  // Dekar bazlı hesaplamalar
  const yieldPerDecare = sizeDecare > 0 ? totalHarvest / sizeDecare : 0;
  const costPerDecare = sizeDecare > 0 ? totalExpense / sizeDecare : 0;
  const incomePerDecare = sizeDecare > 0 ? (totalIncome + totalSales) / sizeDecare : 0;
  const profitPerDecare = sizeDecare > 0 ? profitLoss / sizeDecare : 0;
  
  // Kg bazlı hesaplamalar
  const costPerKg = totalHarvest > 0 ? totalExpense / totalHarvest : 0;
  const avgSalePricePerKg = totalSoldQuantity > 0 ? totalSales / totalSoldQuantity : 0;
  
  // Gelir tipine göre grupla
  const incomeByType: Record<string, number> = {};
  fieldIncomes.forEach((i: any) => {
    const type = i.income_type || 'Diğer';
    incomeByType[type] = (incomeByType[type] || 0) + (parseFloat(i.amount) || 0);
  });
  
  // Satış gelirlerini de ekle
  if (totalSales > 0) {
    incomeByType['Satış Geliri'] = totalSales;
  }
  
  // Gider tipine göre grupla
  const expenseByType: Record<string, number> = {};
  fieldExpenses.forEach((e: any) => {
    const type = e.expense_type || 'Diğer';
    expenseByType[type] = (expenseByType[type] || 0) + (parseFloat(e.amount) || 0);
  });
  
  // Ürün bazlı hasat özeti (pamuk, mısır vs.)
  const harvestByCrop: Record<string, { quantity: number; unit: string }> = {};
  fieldHarvests.forEach((h: any) => {
    const cropName = h.crop_name || 'Diğer';
    const unit = h.unit || 'kg';
    const key = `${cropName}_${unit}`;
    if (!harvestByCrop[key]) {
      harvestByCrop[key] = { quantity: 0, unit };
    }
    harvestByCrop[key].quantity += (parseFloat(h.quantity) || 0);
  });
  
  // Ürün bazlı satış özeti
  const salesByCrop: Record<string, { quantity: number; amount: number; unit: string }> = {};
  fieldSales.forEach((s: any) => {
    const cropName = s.crop_name || 'Diğer';
    const unit = s.unit || 'kg';
    const key = `${cropName}_${unit}`;
    if (!salesByCrop[key]) {
      salesByCrop[key] = { quantity: 0, amount: 0, unit };
    }
    salesByCrop[key].quantity += (parseFloat(s.quantity) || 0);
    salesByCrop[key].amount += (parseFloat(s.total_price) || 0);
  });
  
  return {
    field,
    size_decare: sizeDecare,
    total_income: totalIncome,
    total_expense: totalExpense,
    total_all_expenses: totalExpense,
    total_sales: totalSales,
    total_harvest: totalHarvest,
    total_sold_quantity: totalSoldQuantity,
    income_count: fieldIncomes.length,
    expense_count: fieldExpenses.length,
    harvest_count: fieldHarvests.length,
    sales_count: fieldSales.length,
    profit_loss: profitLoss,
    net_cash: profitLoss,
    // Dekar bazlı metrikler
    yield_per_decare: Math.round(yieldPerDecare * 100) / 100,
    cost_per_decare: Math.round(costPerDecare * 100) / 100,
    income_per_decare: Math.round(incomePerDecare * 100) / 100,
    profit_per_decare: Math.round(profitPerDecare * 100) / 100,
    // Kg bazlı metrikler
    cost_per_kg: Math.round(costPerKg * 100) / 100,
    avg_sale_price_per_kg: Math.round(avgSalePricePerKg * 100) / 100,
    // Tip bazlı dağılımlar
    income_by_type: incomeByType,
    expense_by_type: expenseByType,
    // Ürün bazlı dağılımlar
    harvest_by_crop: harvestByCrop,
    sales_by_crop: salesByCrop,
  };
};

// ==================== STOCK USAGE ====================

export const toggleStockUsageExpense = async (usageId: string) => {
  // Stock kullanımı için basit toggle
  return { success: true, toggled: usageId };
};

export const deleteFieldStockUsage = async (id: string) => {
  // Stock kullanımı silme
  return { success: true };
};

// ==================== BACKUP & RESTORE ====================

export const exportBackup = async () => {
  const data = await backupAllData();
  return { success: true, data };
};

export const importBackup = async (jsonData: string, mode: string = 'skip') => {
  const result = await restoreAllData(jsonData);
  return { success: result };
};

// Default export
const api = {
  // Accounts
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountsSummary,
  
  // Transactions
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  markTransactionPaid,
  
  // Machines
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachinesSummary,
  
  // Machine Persons
  getMachinePersons,
  createMachinePerson,
  updateMachinePerson,
  deleteMachinePerson,
  getMachinePersonsSummary,
  
  // Machine Fields
  getMachineFields,
  createMachineField,
  updateMachineField,
  deleteMachineField,
  
  // Machine Expenses (with aliases)
  getMachineExpenses,
  createMachineExpense,
  updateMachineExpense,
  deleteMachineExpense,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  
  // Machine Receivables
  getMachineReceivables,
  createMachineReceivable,
  updateMachineReceivable,
  deleteMachineReceivable,
  addPaymentToReceivable,
  addMachineReceivablePayment,
  getReceivablePayments,
  deletePayment,
  createReceivable,
  createField,
  
  // Bulk Operations
  createBulkReceivables,
  addPersonBulkPayment,
  
  // Farm Fields
  getFarmFields,
  createFarmField,
  updateFarmField,
  deleteFarmField,
  getFarmFieldSummary,
  
  // Farm Incomes
  getFarmIncomes,
  createFarmIncome,
  updateFarmIncome,
  deleteFarmIncome,
  
  // Farm Expenses
  getFarmExpenses,
  createFarmExpense,
  updateFarmExpense,
  deleteFarmExpense,
  
  // Farm Credits
  getFarmCredits,
  createFarmCredit,
  updateFarmCredit,
  deleteFarmCredit,
  getFarmCreditSummary,
  getCreditSummary,
  markCreditPaid,
  
  // Farm Harvests
  getFarmHarvests,
  createFarmHarvest,
  updateFarmHarvest,
  deleteFarmHarvest,
  
  // Farm Sales
  getFarmSales,
  createFarmSale,
  updateFarmSale,
  deleteFarmSale,
  
  // Farm Stocks
  getFarmStocks,
  createFarmStock,
  updateFarmStock,
  deleteFarmStock,
  
  // Annual Stocks
  getAnnualStocks,
  createAnnualStock,
  deleteAnnualStock,
  getAnnualStockSummary,
  updateAnnualStock,
  
  // Stock Usage
  getFieldStockUsage,
  toggleStockUsageExpense,
  createFieldStockUsage,
  deleteFieldStockUsage,
  updateFieldStockUsage,
  
  // Summaries
  getFarmSummary,
  getYearSummary,
  getChartData,
  
  // Backup & Restore
  backupAllData,
  restoreAllData,
  clearAllData,
  exportBackup,
  importBackup,
};

export default api;
