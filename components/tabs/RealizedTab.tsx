
import React, { useEffect, useState } from 'react';
import { MonthlySummary } from '../../types';
import { StorageService } from '../../services/storage';
import { AlertTriangle } from 'lucide-react';

const RealizedTab: React.FC = () => {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSummary(month);
  }, [month]);

  const loadSummary = async (selectedMonth: string) => {
    setLoading(true);
    const data = await StorageService.getMonthlySummary(selectedMonth);
    setSummary(data);
    setLoading(false);
  };

  if (loading) {
      return <div className="p-4 sm:p-6 text-gray-500 animate-pulse">Carregando dados do mês...</div>;
  }

  if (!summary) return null;

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-2 sm:p-4 pb-16 bg-gray-50 min-h-full">
      <div className="mb-4 flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-20">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Mês de Referência:</label>
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Demonstrativo Mensal - {month.split('-').reverse().join('/')}</h3>
          </div>
          
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                      <tr className="bg-gray-100">
                          <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Receitas</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Despesas</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                      {/* RECEITAS SECTION */}
                      <tr className="bg-emerald-50/50">
                          <td colSpan={3} className="px-4 py-2 text-sm font-bold text-emerald-800 uppercase">Receitas</td>
                      </tr>
                      {summary.incomeCategories.length > 0 ? (
                          summary.incomeCategories.map((item, idx) => (
                              <tr key={`inc-${idx}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                      <div className="font-medium">{item.type}</div>
                                      <div className="text-xs text-gray-500 flex items-center gap-1">
                                          {item.category}
                                          {item.targetAmount && (
                                              <span className="text-gray-400 ml-1">(Meta: {formatCurrency(item.targetAmount)})</span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-emerald-700 text-right font-medium align-top pt-2.5">
                                      {formatCurrency(item.amount)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-400 text-right align-top pt-2.5">-</td>
                              </tr>
                          ))
                      ) : (
                          <tr><td colSpan={3} className="px-4 py-3 text-sm text-gray-500 italic text-center">Nenhuma receita registrada.</td></tr>
                      )}
                      <tr className="bg-gray-50 font-semibold">
                          <td className="px-4 py-2 text-sm text-gray-800 text-right">Total Receitas</td>
                          <td className="px-4 py-2 text-sm text-emerald-700 text-right">{formatCurrency(summary.totalIncome)}</td>
                          <td className="px-4 py-2"></td>
                      </tr>

                      {/* SPACER ROW */}
                      <tr aria-hidden="true" className="h-4 bg-gray-50/30"></tr>

                      {/* DESPESAS SECTION */}
                      <tr className="bg-red-50/50">
                          <td colSpan={3} className="px-4 py-2 text-sm font-bold text-red-800 uppercase">Despesas</td>
                      </tr>
                      {summary.expenseCategories.length > 0 ? (
                          summary.expenseCategories.map((item, idx) => {
                              // Verifica se a despesa excedeu a meta
                              const isOverBudget = item.targetAmount && item.amount > item.targetAmount;

                              return (
                                <tr key={`exp-${idx}`} className={`transition-colors ${isOverBudget ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-2 text-sm text-gray-700">
                                        <div className={`font-medium ${isOverBudget ? 'text-red-800' : ''}`}>
                                            {item.type}
                                        </div>
                                        <div className={`text-xs flex flex-wrap items-center gap-1 ${isOverBudget ? 'text-red-600/80' : 'text-gray-500'}`}>
                                            {item.category}
                                            {item.targetAmount && (
                                                <span className={`ml-1 ${isOverBudget ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                    (Meta: {formatCurrency(item.targetAmount)})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-400 text-right align-top pt-2.5">-</td>
                                    <td className={`px-4 py-2 text-sm text-right font-medium align-top pt-2.5 ${isOverBudget ? 'text-red-700 font-bold' : 'text-red-700'}`}>
                                        <div className="flex items-center justify-end gap-1">
                                            {isOverBudget && <AlertTriangle size={14} className="text-red-600" title="Meta excedida!" />}
                                            {formatCurrency(item.amount)}
                                        </div>
                                    </td>
                                </tr>
                              );
                          })
                      ) : (
                          <tr><td colSpan={3} className="px-4 py-3 text-sm text-gray-500 italic text-center">Nenhuma despesa registrada.</td></tr>
                      )}
                      <tr className="bg-gray-50 font-semibold">
                          <td className="px-4 py-2 text-sm text-gray-800 text-right">Total Despesas</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-sm text-red-700 text-right">{formatCurrency(summary.totalExpense)}</td>
                      </tr>
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                          <td className="px-4 py-3 text-base font-bold text-gray-900 text-right uppercase">Saldo Líquido</td>
                          <td colSpan={2} className={`px-4 py-3 text-base font-bold text-right ${summary.available >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {formatCurrency(summary.available)}
                          </td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      </div>
    </div>
  );
};

export default RealizedTab;
