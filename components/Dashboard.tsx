
import React, { useState, useEffect } from 'react';
import { LogOut, Download, AlertTriangle, X } from 'lucide-react';
import EntriesTab from './tabs/EntriesTab';
import RealizedTab from './tabs/RealizedTab';
import HistoryTab from './tabs/HistoryTab';
import ExpenseBudgetTab from './tabs/ExpenseBudgetTab';
import { StorageService } from '../services/storage';

interface Props {
  onLogout: () => void;
}

type TabType = 'entradas' | 'realizado' | 'meta_despesa' | 'historico';

interface BudgetAlert {
    category: string;
    over: number;
}

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('entradas');
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const tabs: { id: TabType; label: string, shortLabel?: string }[] = [
    { id: 'entradas', label: 'Lançamentos', shortLabel: 'Diário' },
    { id: 'realizado', label: 'Realizado Mês', shortLabel: 'Realizado' },
    { id: 'meta_despesa', label: 'Orçamento', shortLabel: 'Metas' },
    { id: 'historico', label: 'Histórico', shortLabel: 'Histórico' },
  ];

  useEffect(() => {
      checkBudgetStatus();
  }, []);

  const checkBudgetStatus = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      try {
          const summary = await StorageService.getMonthlySummary(currentMonth);
          // Filtra categorias que têm meta definida E o valor gasto é maior ou igual a meta
          const alerts = summary.expenseCategories
              .filter(c => c.targetAmount && c.amount >= c.targetAmount)
              .map(c => ({
                  category: `${c.type} (${c.category})`,
                  over: c.amount - (c.targetAmount || 0)
              }));

          if (alerts.length > 0) {
              setBudgetAlerts(alerts);
              setShowNotifications(true);
              // Fecha automaticamente após 10 segundos para ser temporário
              setTimeout(() => setShowNotifications(false), 10000);
          }
      } catch (error) {
          console.error("Erro ao verificar orçamentos:", error);
      }
  };

  const handleExport = async () => {
    if (!window.confirm("Deseja exportar seus dados (Transações e Orçamentos) para arquivos CSV?")) {
      return;
    }

    try {
      const txData = await StorageService.getTransactions();
      const budgetData = await StorageService.getBudgets();

      const toCSV = (data: any[]) => {
          if (!data || !data.length) return '';
          const headers = Object.keys(data[0]);
          const rows = data.map(obj =>
              headers.map(header => {
                  let val = (obj as any)[header];
                  if (val === null || val === undefined) val = '';
                  val = String(val).replace(/"/g, '""');
                  return `"${val}"`;
              }).join(',')
          );
          return [headers.join(','), ...rows].join('\r\n');
      };

      const downloadFile = (content: string, fileName: string) => {
          const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      };

      const dateStr = new Date().toISOString().slice(0, 10);

      if (txData.length > 0) {
          downloadFile(toCSV(txData), `monetus_transacoes_${dateStr}.csv`);
      }

      if (budgetData.length > 0) {
          // Pequeno delay para garantir que o navegador aceite múltiplos downloads
          setTimeout(() => {
              downloadFile(toCSV(budgetData), `monetus_orcamentos_${dateStr}.csv`);
          }, 1000);
      }

      if (txData.length === 0 && budgetData.length === 0) {
        alert("Não há dados para exportar.");
      }

    } catch (error) {
      console.error("Erro ao exportar:", error);
      alert("Ocorreu um erro ao tentar exportar os dados.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-800 text-white p-3 flex justify-between items-center shrink-0 shadow-md z-20 relative">
        <div className="flex items-center gap-2">
           <div className="bg-emerald-900/30 p-1 rounded-lg">
             <span className="bg-white text-emerald-900 p-0.5 px-1.5 rounded text-lg font-bold">$</span>
           </div>
           <h1 className="font-bold text-xl tracking-tight">Monetus</h1>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={handleExport} className="p-2 hover:bg-emerald-700 rounded-full transition-colors" title="Exportar dados (CSV)">
              <Download size={20} />
            </button>
            <button onClick={onLogout} className="p-2 hover:bg-emerald-700 rounded-full transition-colors" title="Sair">
              <LogOut size={20} />
            </button>
        </div>
      </header>

      {/* Budget Notification Banner */}
      {showNotifications && budgetAlerts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 m-2 relative animate-fadeIn shadow-md rounded-r-lg z-20">
           <button onClick={() => setShowNotifications(false)} className="absolute top-2 right-2 text-amber-700/60 hover:text-amber-800 p-1">
               <X size={16} />
           </button>
           <div className="flex items-start gap-3">
               <div className="bg-amber-100 p-1.5 rounded-full shrink-0">
                   <AlertTriangle className="text-amber-600" size={18} />
               </div>
               <div className="flex-1 mr-4">
                   <h4 className="text-sm font-bold text-amber-900 leading-tight">Alerta de Orçamento</h4>
                   <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Você atingiu ou excedeu o limite em <strong>{budgetAlerts.length}</strong> categoria(s) este mês:
                   </p>
                   <ul className="mt-1.5 space-y-0.5">
                       {budgetAlerts.slice(0, 3).map((alert, idx) => (
                           <li key={idx} className="text-xs text-amber-900 flex justify-between items-center bg-amber-100/50 px-2 py-0.5 rounded">
                               <span className="truncate mr-2 font-medium">{alert.category}</span>
                               <span className={`whitespace-nowrap ${alert.over > 0 ? 'text-red-700 font-bold' : 'text-amber-700'}`}>
                                   {alert.over > 0 ? `+${alert.over.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}` : '100%'}
                               </span>
                           </li>
                       ))}
                       {budgetAlerts.length > 3 && (
                           <li className="text-xs text-amber-800 italic pt-0.5">+ {budgetAlerts.length - 3} outra(s)...</li>
                       )}
                   </ul>
               </div>
           </div>
        </div>
      )}

      {/* Tabs Navigation - Styled like spreadsheet tabs with better touch targets for Android */}
      <div className="bg-emerald-700 px-1 pt-3 flex gap-1 overflow-x-auto shrink-0 no-scrollbar shadow-inner z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap transition-all relative
              ${activeTab === tab.id 
                ? 'bg-gray-50 text-emerald-900 shadow-[0_-2px_5px_rgba(0,0,0,0.1)] z-10' 
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-800/80'}`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Area - Scrollable */}
      <main className="flex-1 overflow-hidden relative bg-gray-50">
        <div className="absolute inset-0 overflow-auto">
            {activeTab === 'entradas' && <EntriesTab />}
            {activeTab === 'realizado' && <RealizedTab />}
            {activeTab === 'meta_despesa' && <ExpenseBudgetTab />}
            {activeTab === 'historico' && <HistoryTab />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
