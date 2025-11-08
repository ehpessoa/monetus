
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum PaymentMethod {
  CREDITO = 'Crédito',
  DEBITO = 'Débito',
  BOLETO = 'Boleto',
  PIX = 'PIX',
  DINHEIRO = 'Dinheiro',
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    auth_provider: 'local' | 'google' | 'facebook';
    photoUrl?: string;
}

export interface CategoryItem {
  type: string;
  category: string;
  isExpense: boolean;
}

// "Minhas Entradas" - Actual recorded transactions
export interface TransactionEntry {
  id: string;
  date: string; // ISO date
  type: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  isExpense: boolean;
  // Description removed as per request
  isRecurrent?: boolean;
}

// "Meus Recebimentos" & "Minhas Despesas" - Budget/Planned items
export interface BudgetItem {
  id: string;
  type: string;
  category: string;
  targetAmount: number; // "Valor" for Income, "Meta" for Expense
  isExpense: boolean;
}

export interface CategorySummary {
  type: string;
  category: string;
  amount: number;
  targetAmount?: number; // Meta definida para esta categoria
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  available: number;
  incomeCategories: CategorySummary[];
  expenseCategories: CategorySummary[];
}
