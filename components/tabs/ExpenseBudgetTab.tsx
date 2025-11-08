
import React, { useEffect, useState, useMemo } from 'react';
import { EXPENSE_CATEGORIES } from '../../constants';
import { StorageService } from '../../services/storage';
import { BudgetItem, TransactionEntry } from '../../types';
import Spreadsheet from '../ui/Spreadsheet';
import { PlusCircle, Trash2, AlertCircle } from 'lucide-react';

interface ExpenseRow extends BudgetItem {
  spent: number;
  available: number;
}

const ExpenseBudgetTab: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Current month filter for "Actuals"
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Form
  const [selectedTypeCat, setSelectedTypeCat] = useState('');
  const [metaAmount, setMetaAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedBudgets, fetchedTx] = await Promise.all([
      StorageService.getBudgets(),
      StorageService.getTransactions()
    ]);
    setBudgets(fetchedBudgets.filter(b => b.isExpense));
    setTransactions(fetchedTx.filter(t => t.isExpense && t.date.startsWith(currentMonthStr)));
    setLoading(false);
  };

  // Merge budgets with actual transactions to calculate "Available"
  const rows: ExpenseRow[] = useMemo(() => {
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => t.type === budget.type && t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        ...budget,
        spent,
        available: budget.targetAmount - spent
      };
    });
  }, [budgets, transactions]);

  const handleDelete = async (id: string) => {
    await StorageService.deleteBudget(id);
    loadData();
};

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeCat || !metaAmount) return;
    const [type, category] = selectedTypeCat.split('||');

    const newItem: BudgetItem = {
      id: Date.now().toString(),
      isExpense: true,
      type,
      category,
      targetAmount: parseFloat(metaAmount),
    };

    await StorageService.saveBudget(newItem);
    setMetaAmount('');
    loadData();
  };

  const columns = [
    { header: 'Tipo de Despesa', accessor: (item: ExpenseRow) => <span className="font-medium">{item.type}</span> },
    { header: 'Categoria', accessor: (item: ExpenseRow) => <span className="text-gray-500 text-xs">{item.category}</span> },
    { 
      header: 'Valor Gasto (Mês)', 
      accessor: (item: ExpenseRow) => item.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      className: 'text-right'
    },
    { 
        header: 'Meta', 
        accessor: (item: ExpenseRow) => item.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        className: 'text-right bg-gray-50 font-medium'
    },
    { 
        header: 'Disponível', 
        accessor: (item: ExpenseRow) => {
            const isNegative = item.available < 0;
            return (
                <div className={`flex items-center justify-end gap-1 font-semibold ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isNegative && <AlertCircle size={14} />}
                    {item.available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            );
        },
        className: 'text-right'
    },
    {
        header: '',
        accessor: (item: BudgetItem) => (
            <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600 flex mx-auto">
                <Trash2 size={14} />
            </button>
        ),
        className: 'w-10'
    }
  ];

  const footerForm = (
    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col flex-1 min-w-[250px]">
            <label className="text-xs text-gray-500 font-medium mb-1">Tipo de Despesa</label>
            <select 
                value={selectedTypeCat} 
                onChange={e => setSelectedTypeCat(e.target.value)} 
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full" 
                required
            >
                <option value="">Selecione...</option>
                {EXPENSE_CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={`${cat.type}||${cat.category}`}>
                        {cat.type} ({cat.category})
                    </option>
                ))}
            </select>
        </div>
        <div className="flex flex-col w-32">
             <label className="text-xs text-gray-500 font-medium mb-1">Meta (R$)</label>
             <input 
                type="number" 
                step="0.01" 
                min="0"
                placeholder="0,00" 
                value={metaAmount} 
                onChange={e => setMetaAmount(e.target.value)} 
                className="border border-gray-300 rounded px-2 py-1 text-sm" 
                required 
             />
        </div>
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded flex items-center gap-1 text-sm font-medium h-[30px]">
            <PlusCircle size={16} /> Definir Meta
        </button>
    </form>
  );

  return (
    <div className="p-2 sm:p-4">
       <div className="mb-4 flex justify-between items-center bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800">
          <span>Defina metas para suas despesas. O "Valor Gasto" refere-se ao mês atual ({currentMonthStr}).</span>
      </div>
      <Spreadsheet
        data={rows}
        columns={columns}
        keyExtractor={item => item.id}
        footer={footerForm}
       />
    </div>
  );
};

export default ExpenseBudgetTab;
