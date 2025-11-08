
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { StorageService } from './services/storage';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Reduzido tempo artificial para melhorar percepção de velocidade
      await new Promise(resolve => setTimeout(resolve, 300));
      const hasSession = localStorage.getItem('monetus_session');
      if (hasSession) {
        setIsAuthenticated(true);
        // Tenta processar transações recorrentes em background
        StorageService.processRecurrentTransactions().catch(console.warn);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (provider: string = 'local') => {
    localStorage.setItem('monetus_session', `token_${provider}_${Date.now()}`);
    // Força a atualização do estado para true imediatamente
    setIsAuthenticated(true);
    // Garante que transações recorrentes sejam verificadas no login também
    StorageService.processRecurrentTransactions().catch(console.warn);
  };

  const handleLogout = () => {
    localStorage.removeItem('monetus_session');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-emerald-900">
        <div className="text-white text-3xl font-bold animate-pulse flex items-center gap-2">
            <span className="bg-white text-emerald-900 p-1 px-2 rounded-md">$</span> Monetus
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <AuthScreen onLogin={handleLogin} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/*"
          element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </HashRouter>
  );
};

export default App;
