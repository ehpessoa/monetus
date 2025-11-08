
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, User, KeyRound, HelpCircle, PlayCircle, AlertCircle, Sparkles } from 'lucide-react';
import { StorageService } from '../services/storage';

interface Props {
  onLogin: (provider?: string) => void;
}

const AuthScreen: React.FC<Props> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
      if (isResetting) return;

      const rememberedEmail = localStorage.getItem('monetus_remember_email');
      const rememberedPwd = localStorage.getItem('monetus_remember_pwd');

      if (rememberedEmail && rememberedPwd) {
          setEmail(rememberedEmail);
          try {
              setPassword(atob(rememberedPwd));
          } catch (e) {
              console.error("Failed to decode remembered password");
          }
          setRememberMe(true);
      }
  }, [isResetting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (!email || !password) {
        setErrorMsg("Preencha email e senha.");
        return;
    }
    if (isRegistering && (!name || !securityAnswer)) {
        setErrorMsg("Preencha todos os campos para cadastro.");
        return;
    }
    if (isResetting && !securityAnswer) {
        setErrorMsg("A resposta de segurança é necessária.");
        return;
    }

    setIsLoading(true);
    try {
        if (isResetting) {
            await StorageService.resetLocalUserPassword(email, securityAnswer, password);
            alert("Senha redefinida com sucesso! Faça login com a nova senha.");
            setIsResetting(false);
            setPassword('');
            setSecurityAnswer('');
            setErrorMsg(null);
        } else if (isRegistering) {
            await StorageService.registerLocalUser({
                id: 'local_' + Date.now(),
                email,
                password,
                name,
                securityQuestion: 'Qual o nome do seu primeiro animal de estimação?',
                securityAnswer
            });
            
            // Auto-login após registro
            const success = await StorageService.authenticateLocalUser(email, password);
            if (success) {
                onLogin('local');
            } else {
                // Fallback caso raro onde o registro funciona mas a auth imediata falha
                setErrorMsg("Conta criada, mas falha no login automático. Tente entrar manualmente.");
                setIsRegistering(false);
            }
        } else {
            // Login normal
            const success = await StorageService.authenticateLocalUser(email, password);
            if (success) {
                if (rememberMe) {
                    localStorage.setItem('monetus_remember_email', email);
                    localStorage.setItem('monetus_remember_pwd', btoa(password));
                } else {
                    localStorage.removeItem('monetus_remember_email');
                    localStorage.removeItem('monetus_remember_pwd');
                }
                onLogin('local');
            } else {
                setErrorMsg("Email ou senha incorretos.");
            }
        }
    } catch (error: any) {
        setErrorMsg(error.message || "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
      setIsLoading(true);
      // Simula um pequeno delay para parecer real
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Cria um perfil temporário para o modo demo se não existir
      await StorageService.saveUserProfile({
          id: 'demo_user',
          name: 'Visitante Demo',
          email: 'demo@monetus.app',
          auth_provider: 'local'
      });
      
      onLogin('demo');
      setIsLoading(false);
  };

  const toggleMode = (mode: 'login' | 'register' | 'reset') => {
      setIsRegistering(mode === 'register');
      setIsResetting(mode === 'reset');
      setErrorMsg(null);
      setPassword('');
      setSecurityAnswer('');
      if (mode === 'register') setName('');
  }

  const getTitle = () => {
      if (isResetting) return 'Redefinir Senha';
      if (isRegistering) return 'Crie sua conta local';
      return 'Controle financeiro pessoal';
  }

  return (
    <div className="min-h-screen bg-emerald-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-all">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="flex justify-center items-center gap-2 text-center text-4xl font-extrabold text-white">
          <span className="bg-white text-emerald-900 p-1 rounded-md">$</span> Monetus
        </h2>
        <p className="mt-2 text-center text-sm text-emerald-200">
          {getTitle()}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 relative">
          
          {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 flex items-center gap-2 text-red-700 text-sm animate-fadeIn">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMsg}</span>
              </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isRegistering && (
                 <div className="animate-fadeIn">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input id="name" name="name" type="text" autoComplete="name" required={isRegistering} value={name} onChange={e => setName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder="Seu Nome" />
                    </div>
                </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder="seu@email.com" />
              </div>
            </div>

            {(isRegistering || isResetting) && (
                <div className="animate-fadeIn">
                    <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
                        <div className="flex items-center gap-1 mb-1">
                            <HelpCircle size={16} className="text-emerald-600" />
                            <span>Qual o nome do seu primeiro pet?</span>
                        </div>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input id="securityAnswer" name="securityAnswer" type="text" required value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder="Sua resposta secreta" />
                    </div>
                </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">{isResetting ? 'Nova Senha' : 'Senha'}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isResetting ? <KeyRound className="h-5 w-5 text-gray-400" /> : <Lock className="h-5 w-5 text-gray-400" />}
                </div>
                <input id="password" name="password" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder={isResetting ? "Nova senha segura" : "••••••"} />
              </div>
            </div>

            {!isRegistering && !isResetting && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer" />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">Lembrar de mim</label>
                    </div>
                    <div className="text-sm">
                        <button type="button" onClick={() => toggleMode('reset')} className="font-medium text-emerald-600 hover:text-emerald-500">Esqueceu a senha?</button>
                    </div>
                </div>
            )}

            <button type="submit" disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 transition-colors">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isResetting ? 'Redefinir Senha' : (isRegistering ? 'Criar Conta' : 'Entrar'))}
            </button>
          </form>

          <div className="mt-4 text-center space-y-3">
              {!isResetting ? (
                  <button type="button" onClick={() => toggleMode(isRegistering ? 'login' : 'register')} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium block w-full">
                      {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Crie uma agora'}
                  </button>
              ) : (
                  <button type="button" onClick={() => toggleMode('login')} className="text-sm text-gray-600 hover:text-gray-800 font-medium block w-full">
                      Voltar para o Login
                  </button>
              )}
          </div>

          {!isResetting && !isRegistering && (
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Alternativo</span></div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                    <button onClick={handleDemoLogin} disabled={isLoading} className="w-full inline-flex justify-center items-center py-2 px-4 border border-emerald-200 rounded-md shadow-sm bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                        <PlayCircle size={18} className="mr-2" /> Modo Demo (Acesso Rápido)
                    </button>
                    
                    <div className="w-full flex items-center justify-center gap-1.5 py-1 mt-1 opacity-70 hover:opacity-100 transition-opacity select-none">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Powered by</span>
                        <div className="flex items-center gap-0.5 text-emerald-700">
                            <Sparkles size={14} fill="currentColor" className="text-emerald-500/50" />
                            <span className="font-bold text-sm tracking-tight flex">Sensz<span className="text-emerald-500">IA</span></span>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
