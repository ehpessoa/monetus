
import React, { useEffect, useState } from 'react';
import { INCOME_CATEGORIES } from '../../constants';
import { StorageService } from '../../services/storage';
import { BudgetItem, CategoryItem } from '../../types';
import Spreadsheet from '../ui/Spreadsheet';
import { PlusCircle, Trash2 } from 'lucide-react';

const IncomePlanningTab: React.FC = () => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedTypeCat, setSelectedTypeCat] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const budgets = await StorageService.getBudgets();
    setItems(budgets.filter(b => !b.isExpense));
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
      await StorageService.deleteBudget(id);
      loadData();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeCat || !targetAmount) return;
    const [type, category] = selectedTypeCat.split('||');

    const newItem: BudgetItem = {
      id: Date.now().toString(),
      isExpense: false,
      type,
      category,
      targetAmount: parseFloat(targetAmount),
    };

    await StorageService.saveBudget(newItem);
    setTargetAmount('');
    loadData();
  };

  const columns = [
    { header: 'Tipo de Recebimento', accessor: (item: BudgetItem) => <span className="font-medium">{item.type}</span> },
    { header: 'Categoria', accessor: (item: BudgetItem) => <span className="text-gray-500">{item.category}</span> },
    { 
      header: 'Valor Previsto', 
      accessor: (item: BudgetItem) => item.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      className: 'text-right text-emerald-700 font-semibold'
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
            <label className="text-xs text-gray-500 font-medium mb-1">Tipo de Recebimento</label>
            <select 
                value={selectedTypeCat} 
                onChange={e => setSelectedTypeCat(e.target.value)} 
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full" 
                required
            >
                <option value="">Selecione da lista...</option>
                {INCOME_CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={`${cat.type}||${cat.category}`}>
                        {cat.type} - {cat.category}
                    </option>
                ))}
            </select>
        </div>
        <div className="flex flex-col w-40">
             <label className="text-xs text-gray-500 font-medium mb-1">Valor Previsto (R$)</label>
             <input 
                type="number" 
                step="0.01" 
                min="0"
                placeholder="0,00" 
                value={targetAmount} 
                onChange={e => setTargetAmount(e.target.value)} 
                className="border border-gray-300 rounded px-2 py-1 text-sm" 
                required 
             />
        </div>
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded flex items-center gap-1 text-sm font-medium h-[30px]">
            <PlusCircle size={16} /> Salvar
        </button>
    </form>
  );

  return (
    <div className="p-2 sm:p-4">
      <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-3 text-sm text-blue-800">
          Defina aqui suas fontes de renda recorrentes ou esperadas para o mês.
      </div>
      <Spreadsheet
        data={items}
        columns={columns}
        keyExtractor={item => item.id}
        footer={footerForm}
       />
    </div>
  );
};

export default IncomePlanningTab;
