
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS_LIST } from '../../constants';
import { StorageService } from '../../services/storage';
import { AIService } from '../../services/ai';
import { BudgetItem, CategoryItem, PaymentMethod, TransactionEntry } from '../../types';
import Spreadsheet from '../ui/Spreadsheet';
import { PlusCircle, Trash2, Filter, XCircle, CalendarRange, X, Receipt, Tag, Calendar, CreditCard, Edit, Save, Repeat, Target, Camera, Loader2 } from 'lucide-react';

const EntriesTab: React.FC = () => {
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<TransactionEntry | null>(null);

  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form state
  const [isExpense, setIsExpense] = useState(true);
  const [selectedTypeCat, setSelectedTypeCat] = useState(''); 
  const [amount, setAmount] = useState('');
  // Description state removed
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.DEBITO);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurrent, setIsRecurrent] = useState(false);

  // Custom Category Creation State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Inline Budget Editing State
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [tempBudgetAmount, setTempBudgetAmount] = useState('');

  const availableCategories = useMemo(() => {
      const base = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      const custom = customCategories.filter(c => c.isExpense === isExpense);
      return [...base, ...custom];
  }, [isExpense, customCategories]);

  // All categories for AI matching, regardless of current isExpense Toggle
  const allCategoriesForAI = useMemo(() => {
      return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCategories];
  }, [customCategories]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [txData, budgetData, customCats] = await Promise.all([
        StorageService.getTransactions(),
        StorageService.getBudgets(),
        StorageService.getCustomCategories()
    ]);
    setEntries(txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setBudgets(budgetData);
    setCustomCategories(customCats);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      await StorageService.deleteTransaction(id);
      if (viewingEntry?.id === id) setViewingEntry(null);
      if (editingId === id) resetForm();
      loadData();
    }
  };

  const handleEdit = (entry: TransactionEntry) => {
      setEditingId(entry.id);
      setIsExpense(entry.isExpense);
      setSelectedTypeCat(`${entry.type}||${entry.category}`);
      setAmount(entry.amount.toString());
      // Description set removed
      setPaymentMethod(entry.paymentMethod);
      setDate(entry.date);
      setIsRecurrent(!!entry.isRecurrent);
      setShowBudgetEdit(false);
      setIsCreatingCategory(false);
      
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const resetForm = () => {
      setEditingId(null);
      setAmount('');
      // Description reset removed
      setIsRecurrent(false);
      setDate(new Date().toISOString().split('T')[0]);
      setIsCreatingCategory(false);
      setNewType('');
      setNewCategory('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalType = '';
    let finalCategory = '';

    if (isCreatingCategory) {
        if (!newType.trim() || !newCategory.trim()) {
             alert("Por favor, preencha o Novo Tipo e a Nova Categoria.");
             return;
        }
        finalType = newType.trim();
        finalCategory = newCategory.trim();
        
        // Persist new custom category
        const newCatItem: CategoryItem = { type: finalType, category: finalCategory, isExpense };
        await StorageService.addCustomCategory(newCatItem);
        // Update local state immediately to avoid full reload flicker if desired, 
        // but loadData() at the end will handle it too.
    } else {
         if (!selectedTypeCat || !amount) return;
         [finalType, finalCategory] = selectedTypeCat.split('||');
    }

    const entryToSave: TransactionEntry = {
      id: editingId || Date.now().toString(),
      date,
      isExpense,
      type: finalType,
      category: finalCategory,
      amount: parseFloat(amount),
      paymentMethod,
      // Description removed
      isRecurrent
    };

    await StorageService.saveTransaction(entryToSave);
    resetForm();
    loadData();
  };

  // --- AI Receipt Scanning ---
  const handleScanClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsScanning(true);
      try {
          // Convert to Base64
          const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                  const result = reader.result as string;
                  // Remove data url prefix (e.g., "data:image/jpeg;base64,")
                  const base64Data = result.split(',')[1];
                  resolve(base64Data);
              };
              reader.onerror = error => reject(error);
          });

          const scannedData = await AIService.scanReceipt(base64, allCategoriesForAI);
          
          // Apply scanned data to form
          if (scannedData.amount) setAmount(scannedData.amount.toString());
          if (scannedData.date) setDate(scannedData.date);
          setIsExpense(scannedData.isExpense);

          // Try to match category if AI returned one
          if (scannedData.type && scannedData.category) {
              const match = allCategoriesForAI.find(
                  c => c.type === scannedData.type && 
                       c.category === scannedData.category && 
                       c.isExpense === scannedData.isExpense
              );

              if (match) {
                  setSelectedTypeCat(`${match.type}||${match.category}`);
              } else {
                  // Fallback: if AI suggested something valid but maybe slight mismatch in bool, just try setting the text match
                   setSelectedTypeCat(`${scannedData.type}||${scannedData.category}`);
              }
          }

      } catch (error) {
          console.error("Scan error:", error);
          alert("Não foi possível ler o recibo. Tente novamente ou preencha manualmente.");
      } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      }
  };

  // --- Budget (Meta) Handling ---
  const currentBudget = useMemo(() => {
      if (!isExpense || (!selectedTypeCat && !isCreatingCategory)) return null;
      
      let typeToCheck = '';
      let catToCheck = '';

      if (isCreatingCategory) {
          typeToCheck = newType;
          catToCheck = newCategory;
      } else if (selectedTypeCat) {
          [typeToCheck, catToCheck] = selectedTypeCat.split('||');
      }

      if (!typeToCheck || !catToCheck) return null;

      return budgets.find(b => b.isExpense && b.type === typeToCheck && b.category === catToCheck);
  }, [isExpense, selectedTypeCat, isCreatingCategory, newType, newCategory, budgets]);

  const handleSaveBudget = async () => {
      let typeToSave = '';
      let catToSave = '';

      if (isCreatingCategory) {
          typeToSave = newType.trim();
          catToSave = newCategory.trim();
      } else if (selectedTypeCat) {
          [typeToSave, catToSave] = selectedTypeCat.split('||');
      }

      if (!typeToSave || !catToSave || !tempBudgetAmount) return;
      
      const budgetItem: BudgetItem = {
          id: currentBudget?.id || Date.now().toString(),
          isExpense: true,
          type: typeToSave,
          category: catToSave,
          targetAmount: parseFloat(tempBudgetAmount)
      };

      await StorageService.saveBudget(budgetItem);
      setShowBudgetEdit(false);
      loadData();
  };

  const startEditingBudget = () => {
      setTempBudgetAmount(currentBudget?.targetAmount.toString() || '');
      setShowBudgetEdit(true);
  };

  // Filtering Logic
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filterStartDate && entry.date < filterStartDate) return false;
      if (filterEndDate && entry.date > filterEndDate) return false;
      return true;
    });
  }, [entries, filterStartDate, filterEndDate]);

  const hasActiveFilters = filterStartDate || filterEndDate;
  const clearFilters = () => {
    setFilterStartDate(''); setFilterEndDate('');
  };

  // Date Range Quick Actions
  const applyThisMonthFilter = () => {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      setFilterStartDate(new Date(y, m, 1).toISOString().split('T')[0]);
      setFilterEndDate(new Date(y, m + 1, 0).toISOString().split('T')[0]);
  };
  const applyLastMonthFilter = () => {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      const y = now.getFullYear(), m = now.getMonth();
      setFilterStartDate(new Date(y, m, 1).toISOString().split('T')[0]);
      setFilterEndDate(new Date(y, m + 1, 0).toISOString().split('T')[0]);
  };

  const columns = [
    { header: 'Data', accessor: (item: TransactionEntry) => new Date(item.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}), className: 'w-24' },
    { 
        header: 'Categoria', 
        accessor: (item: TransactionEntry) => (
            <div className="flex flex-col">
                <span>{item.type}</span>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                    {item.category}
                    {item.isRecurrent && <Repeat size={10} className="text-blue-500" title="Transação Recorrente" />}
                </span>
            </div>
        ) 
    },
    { 
      header: 'Valor', 
      accessor: (item: TransactionEntry) => (
        <span className={`font-medium ${item.isExpense ? 'text-red-700' : 'text-emerald-700'}`}>
          {item.isExpense ? '- ' : '+ '}
          {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
      className: 'text-right'
    },
    {
        header: 'Ações',
        accessor: (item: TransactionEntry) => (
            <div className="flex items-center justify-center gap-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(item); }} 
                    className="text-gray-400 hover:text-blue-600 p-1"
                    title="Editar"
                >
                    <Edit size={14} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Excluir"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        ),
        className: 'text-center w-20'
    }
  ];

  const footerForm = (
    <div className="flex flex-col gap-2 w-full">
        {/* Hidden File Input for Camera/Upload */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            capture="environment"
            className="hidden" 
        />

        {editingId && (
            <div className="bg-yellow-50 text-yellow-800 px-3 py-1 text-xs flex justify-between items-center rounded">
                <span>Editando lançamento...</span>
                <button onClick={resetForm} className="text-yellow-900 hover:underline font-medium">Cancelar Edição</button>
            </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-2">
            <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between">
                    Operação
                    {/* Scan Button */}
                     <button 
                        type="button" 
                        onClick={handleScanClick} 
                        disabled={isScanning}
                        className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ml-2 transition-colors ${isScanning ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        title="Escanear Recibo (Câmera/Arquivo)"
                     >
                         {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                         <span className="hidden sm:inline">{isScanning ? 'Lendo...' : 'Escanear'}</span>
                     </button>
                </label>
                <div className="flex bg-gray-200 rounded p-0.5">
                    <button type="button" onClick={() => setIsExpense(true)} className={`text-xs px-3 py-1 rounded ${isExpense ? 'bg-white shadow-sm text-red-700 font-medium' : 'text-gray-600'}`}>Despesa</button>
                    <button type="button" onClick={() => setIsExpense(false)} className={`text-xs px-3 py-1 rounded ${!isExpense ? 'bg-white shadow-sm text-emerald-700 font-medium' : 'text-gray-600'}`}>Receita</button>
                </div>
            </div>
            <div className="flex flex-col w-28 sm:w-32">
                <label className="text-xs text-gray-500 font-medium mb-1">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" required />
                <label className="flex items-center gap-1 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={isRecurrent} onChange={e => setIsRecurrent(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-xs text-gray-600 flex items-center gap-0.5"><Repeat size={10} /> Recorrente</span>
                </label>
            </div>
            <div className="flex flex-col flex-1 min-w-[220px]">
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between items-center">
                    <span>Tipo / Categoria</span>
                    {isCreatingCategory ? (
                        <button type="button" onClick={() => setIsCreatingCategory(false)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5" title="Cancelar criação">
                            <XCircle size={14} />
                        </button>
                    ) : (
                         <button type="button" onClick={() => { setIsCreatingCategory(true); setSelectedTypeCat(''); }} className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5 font-medium">
                            <PlusCircle size={14} /> Nova
                        </button>
                    )}
                </label>
                
                {isCreatingCategory ? (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Novo Tipo" 
                            value={newType} 
                            onChange={e => setNewType(e.target.value)}
                            className="border border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1 text-sm w-1/2"
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Nova Categoria" 
                            value={newCategory} 
                            onChange={e => setNewCategory(e.target.value)}
                            className="border border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1 text-sm w-1/2"
                            required
                        />
                    </div>
                ) : (
                    <select 
                        value={selectedTypeCat} 
                        onChange={e => setSelectedTypeCat(e.target.value)} 
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full" 
                        required
                    >
                        <option value="">Selecione...</option>
                        {availableCategories.map((cat, idx) => (
                            <option key={idx} value={`${cat.type}||${cat.category}`}>
                                {cat.type} ({cat.category})
                            </option>
                        ))}
                    </select>
                )}
                
                {/* INLINE BUDGET (META) SETTING */}
                {isExpense && (selectedTypeCat || (isCreatingCategory && newType && newCategory)) && (
                    <div className="mt-1 text-xs flex items-center gap-1">
                        {showBudgetEdit ? (
                            <div className="flex items-center gap-1 animate-fadeIn">
                                <span className="text-gray-600">Meta: R$</span>
                                <input 
                                    type="number" 
                                    value={tempBudgetAmount} 
                                    onChange={e => setTempBudgetAmount(e.target.value)}
                                    className="border rounded px-1 py-0.5 w-20 text-xs"
                                    placeholder="0,00"
                                    autoFocus
                                />
                                <button type="button" onClick={handleSaveBudget} className="bg-emerald-100 text-emerald-700 p-0.5 rounded hover:bg-emerald-200" title="Salvar Meta">
                                    <Save size={14} />
                                </button>
                                <button type="button" onClick={() => setShowBudgetEdit(false)} className="text-gray-400 hover:text-gray-600" title="Cancelar">
                                    <XCircle size={14} />
                                </button>
                            </div>
                        ) : (
                            <button type="button" onClick={startEditingBudget} className="text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition-colors" title="Definir/Alterar Meta para esta categoria">
                                <Target size={12} />
                                {currentBudget ? `Meta: R$ ${currentBudget.targetAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'Definir Meta'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            {/* Description field removed from here */}
            <div className="flex flex-col w-24 sm:w-28">
                 <label className="text-xs text-gray-500 font-medium mb-1">Valor (R$)</label>
                 <input type="number" step="0.01" min="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" required />
            </div>
            {isExpense && (
                <div className="flex flex-col w-28 sm:w-32">
                     <label className="text-xs text-gray-500 font-medium mb-1">Método</label>
                     <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
                         {PAYMENT_METHODS_LIST.map(method => (
                             <option key={method} value={method}>{method}</option>
                         ))}
                     </select>
                </div>
            )}
            <div className="flex items-end h-[54px] pb-[2px]">
                <button type="submit" className={`${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-1.5 rounded flex items-center gap-1 text-sm font-medium h-[34px] transition-colors`}>
                    {editingId ? <Save size={16} /> : <PlusCircle size={16} />} 
                    <span className="hidden sm:inline">{editingId ? 'Salvar' : 'Adicionar'}</span>
                </button>
            </div>
        </form>
    </div>
  );

  if (loading && entries.length === 0) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-2 sm:p-4 relative pb-20">
       <div className="flex justify-between items-center mb-2">
           <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">Lançamentos Diários</h2>
       </div>

       {/* Filter Bar */}
       <div className="mb-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center text-emerald-800 font-semibold gap-1 mb-2">
                <Filter size={16} /> Filtros
            </div>
            <div className="flex flex-wrap gap-2 items-end text-sm">
                <div className="flex flex-wrap items-end gap-1 p-1.5 bg-gray-50 rounded border border-gray-100">
                    <div className="flex items-center text-gray-500 mr-1"><CalendarRange size={16} /></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-semibold px-0.5">DE</span>
                        <input type="date" className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-semibold px-0.5">ATÉ</span>
                        <input type="date" className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    </div>
                     <div className="flex gap-1 ml-1">
                        <button type="button" onClick={applyThisMonthFilter} className="px-2 py-1 text-xs bg-white border border-gray-300 hover:bg-emerald-50 rounded">Este Mês</button>
                        <button type="button" onClick={applyLastMonthFilter} className="px-2 py-1 text-xs bg-white border border-gray-300 hover:bg-emerald-50 rounded">Mês Passado</button>
                    </div>
                </div>
                
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-300 px-3 py-1 rounded ml-auto flex items-center gap-1 h-[30px]">
                        <XCircle size={14} /> Limpar
                    </button>
                )}
            </div>
        </div>

       <Spreadsheet 
         data={filteredEntries}
         columns={columns}
         keyExtractor={(item) => item.id}
         footer={footerForm}
         onRowClick={(item) => setViewingEntry(item)}
       />

       {/* Transaction Details Modal */}
       {viewingEntry && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingEntry(null)}>
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                   <div className={`p-4 flex justify-between items-center ${viewingEntry.isExpense ? 'bg-red-50 border-b border-red-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                       <h3 className={`text-lg font-bold flex items-center gap-2 ${viewingEntry.isExpense ? 'text-red-800' : 'text-emerald-800'}`}>
                           <Receipt size={20} /> Detalhes da Transação
                       </h3>
                       <button onClick={() => setViewingEntry(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full"><X size={20} /></button>
                   </div>
                   <div className="p-6 space-y-5">
                       <div className="text-center mb-6">
                           <span className={`text-4xl font-extrabold ${viewingEntry.isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                               {viewingEntry.isExpense ? '- ' : '+ '}
                               {viewingEntry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                           <div className="flex justify-center gap-2 mt-2">
                               <span className={`px-3 py-1 rounded-full text-sm font-medium ${viewingEntry.isExpense ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                   {viewingEntry.isExpense ? 'Despesa' : 'Receita'}
                               </span>
                               {viewingEntry.isRecurrent && (
                                   <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                                       <Repeat size={14} /> Recorrente
                                   </span>
                               )}
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                               <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase"><Calendar size={14} /> Data</span>
                               <span className="text-gray-800 font-medium">{new Date(viewingEntry.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                           </div>
                           <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                               <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase"><CreditCard size={14} /> Método</span>
                               <span className="text-gray-800 font-medium">{viewingEntry.paymentMethod}</span>
                           </div>
                           <div className="col-span-2 flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                               <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase"><Tag size={14} /> Tipo / Categoria</span>
                               <div className="flex items-center gap-2 text-gray-800">
                                   <span className="font-medium">{viewingEntry.type}</span><span className="text-gray-400">•</span><span className="text-gray-600">{viewingEntry.category}</span>
                               </div>
                           </div>
                           {/* Description detail removed */}
                       </div>
                   </div>
                   <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2 border-t border-gray-100">
                        <button onClick={() => { setViewingEntry(null); handleEdit(viewingEntry); }} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors">
                           <Edit size={16} /> Editar
                       </button>
                       <button onClick={() => handleDelete(viewingEntry.id)} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors">
                           <Trash2 size={16} /> Excluir
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default EntriesTab;
