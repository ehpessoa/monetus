import { CategoryItem, PaymentMethod } from './types';

export const INCOME_CATEGORIES: CategoryItem[] = [
  { type: 'Abono Pecuniário', category: 'Benefício Adicional', isExpense: false },
  { type: 'Abono por Tempo de Serviço', category: 'Benefício Adicional', isExpense: false },
  { type: 'Adicional de Insalubridade', category: 'Adicional Salarial', isExpense: false },
  { type: 'Adicional de Periculosidade', category: 'Adicional Salarial', isExpense: false },
  { type: 'Adicional Noturno', category: 'Adicional Salarial', isExpense: false },
  { type: 'Ajuda de Custo', category: 'Reembolso/Benefício', isExpense: false },
  { type: 'Aluguel de Imóvel', category: 'Benefício', isExpense: false },
  { type: 'Aposentadoria', category: 'Benefício de Longo Prazo', isExpense: false },
  { type: 'Auxílio-Alimentação/Refeição', category: 'Benefício', isExpense: false },
  { type: 'Auxílio-Combustível', category: 'Benefício', isExpense: false },
  { type: 'Auxílio-Creche', category: 'Benefício', isExpense: false },
  { type: 'Auxílio-Educação', category: 'Benefício', isExpense: false },
  { type: 'Auxílio-Farmácia', category: 'Benefício', isExpense: false },
  { type: 'Auxílio-Home Office', category: 'Benefício', isExpense: false },
  { type: 'Auxílio-Moradia', category: 'Benefício', isExpense: false },
  { type: 'Bolsas de Estudo', category: 'Benefício', isExpense: false },
  { type: 'Bônus', category: 'Remuneração Variável', isExpense: false },
  { type: 'Cashback', category: 'Benefício', isExpense: false },
  { type: 'Comissões', category: 'Remuneração Variável', isExpense: false },
  { type: 'Décimo Terceiro Salário', category: 'Benefício Adicional', isExpense: false },
  { type: 'Férias Remuneradas', category: 'Benefício Adicional', isExpense: false },
  { type: 'Horas Extras', category: 'Adicional Salarial', isExpense: false },
  { type: 'Participação nos Lucros (PLR)', category: 'Remuneração Variável', isExpense: false },
  { type: 'Salário Base', category: 'Remuneração Fixa', isExpense: false },
  { type: 'Vale-Transporte', category: 'Benefício', isExpense: false },
  { type: 'Outros Recebimentos', category: 'Geral', isExpense: false },
];

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { type: 'Academia', category: 'Lazer/Bem-estar', isExpense: true },
  { type: 'Aluguel', category: 'Moradia', isExpense: true },
  { type: 'Água', category: 'Contas de Consumo', isExpense: true },
  { type: 'Assinatura de Software', category: 'Serviços Digitais', isExpense: true },
  { type: 'Barbeiro/Cabeleireiro', category: 'Cuidados Pessoais', isExpense: true },
  { type: 'Boletos em geral', category: 'Contas Diversas', isExpense: true },
  { type: 'Cartão de Crédito', category: 'Dívidas', isExpense: true },
  { type: 'Celular', category: 'Telecomunicações', isExpense: true },
  { type: 'Cinema', category: 'Lazer', isExpense: true },
  { type: 'Condomínio', category: 'Moradia', isExpense: true },
  { type: 'Conta de Luz', category: 'Contas de Consumo', isExpense: true },
  { type: 'Educação (Faculdade/Cursos)', category: 'Educação', isExpense: true },
  { type: 'Farmácia/Remédios', category: 'Saúde', isExpense: true },
  { type: 'Feira/Supermercado', category: 'Alimentação', isExpense: true },
  { type: 'Financiamento (Carro/Imóvel)', category: 'Dívidas', isExpense: true },
  { type: 'Gás', category: 'Contas de Consumo', isExpense: true },
  { type: 'Gasolina/Combustível', category: 'Transporte', isExpense: true },
  { type: 'Impostos (IPTU/IPVA/IRPF)', category: 'Tributos', isExpense: true },
  { type: 'Internet/TV', category: 'Telecomunicações', isExpense: true },
  { type: 'Lazer Geral', category: 'Lazer', isExpense: true },
  { type: 'Manutenção Veículo', category: 'Veículo', isExpense: true },
  { type: 'Plano de Saúde', category: 'Saúde', isExpense: true },
  { type: 'Restaurantes/Delivery', category: 'Alimentação', isExpense: true },
  { type: 'Seguros (Vida/Carro)', category: 'Seguros', isExpense: true },
  { type: 'Streaming (Netflix/Spotify)', category: 'Serviços Digitais', isExpense: true },
  { type: 'Transporte (Táxi/Uber/Público)', category: 'Transporte', isExpense: true },
  { type: 'Outras Despesas', category: 'Geral', isExpense: true },
];

export const PAYMENT_METHODS_LIST = Object.values(PaymentMethod);

// SQLite Schema as requested by prompt.
// In a real React Native app, this would be executed by a library like react-native-sqlite-storage.
export const SQLITE_SCHEMA_SCRIPT = `
-- Database Schema for Monetus (com.senszia)
-- To be used with SQLite in React Native environment

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Nullable for social auth users
    name TEXT,
    auth_provider TEXT DEFAULT 'local', -- 'local', 'google', 'facebook'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL, -- 'category' in JSON
    is_expense BOOLEAN NOT NULL DEFAULT 1,
    UNIQUE(name, group_name, is_expense)
);

-- Pre-populate categories (examples)
-- INSERT OR IGNORE INTO categories (name, group_name, is_expense) VALUES ('Salário Base', 'Remuneração Fixa', 0);
-- INSERT OR IGNORE INTO categories (name, group_name, is_expense) VALUES ('Aluguel', 'Moradia', 1);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_name TEXT NOT NULL, -- Denormalized for simpler querying in this example, or FK to categories
    category_group TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL, -- ISO8601 strings ('YYYY-MM-DD')
    payment_method TEXT, -- 'Crédito', 'Débito', etc.
    is_expense BOOLEAN NOT NULL,
    description TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    category_group TEXT NOT NULL,
    is_expense BOOLEAN NOT NULL,
    target_amount REAL NOT NULL DEFAULT 0,
    month_ref TEXT NOT NULL, -- 'YYYY-MM' to version budgets by month
    UNIQUE(user_id, category_name, is_expense, month_ref),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month_ref);
`;
