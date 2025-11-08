
import React, { useEffect, useState } from 'react';
import { MonthlySummary } from '../../types';
import { StorageService } from '../../services/storage';
import Spreadsheet from '../ui/Spreadsheet';

const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<MonthlySummary[]>([]);
  // Default to current month as the end of the 6-month period
  const [endMonth, setEndMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory(endMonth);
  }, [endMonth]);

  const loadHistory = async (selectedEndMonth: string) => {
    setLoading(true);
    
    // Calculate last 6 months (inclusive of selected)
    const historyMonths = [];
    let [y, m] = selectedEndMonth.split('-').map(Number);
    for(let i=0; i<6; i++) {
        historyMonths.push(`${y}-${String(m).padStart(2, '0')}`);
        m--;
        if(m === 0) { m = 12; y--; }
    }
    
    // Fetch all in parallel
    const data = await Promise.all(historyMonths.map(mStr => StorageService.getMonthlySummary(mStr)));
    
    setHistory(data.reverse()); // Reverse to show oldest to newest
    setLoading(false);
  };

  // --- Columns for 6-Month History ---
  const historyColumns = [
    { 
        header: 'Mês', 
        accessor: (item: MonthlySummary) => {
             const [y_str, m_str] = item.month.split('-');
             return <span>{m_str}/{y_str}</span>;
        }
    },
    { 
        header: 'Receitas', 
        accessor: (item: MonthlySummary) => (
            <span className="text-emerald-700">
                {item.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        ),
        className: 'text-right'
    },
    { 
        header: 'Despesas', 
        accessor: (item: MonthlySummary) => (
            <span className="text-red-700">
                {item.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        ),
        className: 'text-right'
    },
    { 
        header: 'Saldo Final', 
        accessor: (item: MonthlySummary) => (
            <span className={`font-bold ${item.available >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {item.available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        ),
        className: 'text-right bg-gray-50'
    },
  ];

  // History Chart data preparation
  const allHistoryValues = history.flatMap(h => [h.totalIncome, h.totalExpense]);
  const maxHistoryValue = Math.max(...allHistoryValues) || 1;
  const historyChartScale = maxHistoryValue * 1.05;

  return (
    <div className="p-2 sm:p-4 pb-16">
      <div className="mb-6 flex items-center gap-4 bg-white p-3 rounded shadow-sm border border-gray-200 sticky top-0 z-20">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Período até:</label>
          <input 
            type="month" 
            value={endMonth} 
            onChange={(e) => setEndMonth(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium text-emerald-900"
          />
      </div>

      {loading ? (
          <div className="text-gray-500 p-4 animate-pulse">Carregando histórico...</div>
      ) : (
        <div className="space-y-8">
            {/* 6-Month History Section */}
            <div>
                <h3 className="text-gray-800 font-semibold mb-2 px-1">Histórico (Últimos 6 Meses)</h3>
                <Spreadsheet
                    data={history}
                    columns={historyColumns}
                    keyExtractor={(item) => item.month}
                />
                {/* History Trend Chart */}
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
                   <h4 className="text-xs sm:text-sm font-medium text-gray-500 mb-4 text-center uppercase tracking-wider">Evolução Receitas x Despesas</h4>
                   <div className="flex items-end h-32 sm:h-40 gap-2 sm:gap-4 justify-between sm:justify-center px-1 relative">
                       {/* Subtle Grid lines */}
                       <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none z-0 opacity-50">
                           <div className="border-t border-dashed border-gray-100 h-full"></div>
                           <div className="border-t border-dashed border-gray-100 h-full"></div>
                           <div className="border-t border-dashed border-gray-100 h-full"></div>
                       </div>

                     {history.map(h => {
                         const incomeH = Math.max((h.totalIncome / historyChartScale) * 100, 2);
                         const expenseH = Math.max((h.totalExpense / historyChartScale) * 100, 2);
                         const [y_str, m_str] = h.month.split('-');
                         
                         return (
                             <div key={h.month} className="flex flex-col items-center z-10 flex-1 max-w-[60px] group cursor-default">
                                 <div className="flex items-end gap-0.5 sm:gap-1 w-full justify-center h-full">
                                     <div className="w-3 sm:w-5 bg-emerald-400/90 hover:bg-emerald-500 rounded-t-[2px] transition-all" style={{height: `${incomeH}%`}} title={`Receita (${m_str}/${y_str}): R$ ${h.totalIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}></div>
                                     <div className="w-3 sm:w-5 bg-red-400/90 hover:bg-red-500 rounded-t-[2px] transition-all" style={{height: `${expenseH}%`}} title={`Despesa (${m_str}/${y_str}): R$ ${h.totalExpense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}></div>
                                 </div>
                                 <span className="text-[10px] mt-2 text-gray-500">{m_str}</span>
                             </div>
                         )
                     })}
                   </div>
                   <div className="flex justify-center gap-4 mt-3">
                       <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-600"><div className="w-3 h-3 bg-emerald-400/90 rounded-[2px]"></div> Receitas</div>
                       <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-600"><div className="w-3 h-3 bg-red-400/90 rounded-[2px]"></div> Despesas</div>
                   </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
