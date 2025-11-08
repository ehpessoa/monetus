
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BudgetItem, CategoryItem, CategorySummary, MonthlySummary, SyncPacket, TransactionEntry, UserProfile } from '../types';

interface LocalUserAuth {
    email: string;
    password: string; // In a real app, this must be hashed. Storing plain text for this demo only.
    name: string;
    id: string;
    securityQuestion?: string; // Optional for now, we'll use a fixed one in UI
    securityAnswer?: string;
}

interface MonetusDB extends DBSchema {
  transactions: {
    key: string;
    value: TransactionEntry;
    indexes: { 'by-date': string };
  };
  budgets: {
    key: string;
    value: BudgetItem;
  };
  custom_categories: {
    key: string | number;
    value: CategoryItem;
    indexes: { 'by-type-cat-expense': [string, string, boolean] };
  };
  user_profile: {
    key: string;
    value: UserProfile;
  };
  local_users: {
      key: string; // email as key for simplicity
      value: LocalUserAuth;
  };
  system_meta: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'monetus_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<MonetusDB>>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MonetusDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('custom_categories')) {
           const catStore = db.createObjectStore('custom_categories', { keyPath: 'id', autoIncrement: true });
           catStore.createIndex('by-type-cat-expense', ['type', 'category', 'isExpense'], { unique: true });
        }
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('local_users')) {
            db.createObjectStore('local_users', { keyPath: 'email' });
        }
        if (!db.objectStoreNames.contains('system_meta')) {
            db.createObjectStore('system_meta');
        }
      },
    });
  }
  return dbPromise;
};

const KEY_LAST_RECURRENCE_SYNC = 'last_recurrence_sync';

export const StorageService = {
  // --- Auth & User Profile ---
  registerLocalUser: async (user: LocalUserAuth): Promise<void> => {
      const db = await getDB();
      const existing = await db.get('local_users', user.email);
      if (existing) {
          throw new Error("Este email já está cadastrado.");
      }
      await db.add('local_users', user);
  },

  authenticateLocalUser: async (email: string, password: string): Promise<boolean> => {
      const db = await getDB();
      const user = await db.get('local_users', email);
      
      if (user && user.password === password) {
          await db.put('user_profile', {
              id: user.id,
              name: user.name,
              email: user.email,
              auth_provider: 'local'
          });
          return true;
      }
      return false;
  },

  resetLocalUserPassword: async (email: string, securityAnswer: string, newPassword: string): Promise<void> => {
      const db = await getDB();
      const user = await db.get('local_users', email);

      if (!user) {
          throw new Error("Usuário não encontrado.");
      }

      if (!user.securityAnswer || user.securityAnswer.trim().toLowerCase() !== securityAnswer.trim().toLowerCase()) {
           throw new Error("Resposta de segurança incorreta.");
      }

      user.password = newPassword;
      await db.put('local_users', user);
  },

  getUserProfile: async (): Promise<UserProfile | null> => {
      const db = await getDB();
      const allUsers = await db.getAll('user_profile');
      return allUsers.length > 0 ? allUsers[0] : null;
  },

  saveUserProfile: async (profile: UserProfile): Promise<void> => {
      const db = await getDB();
      await db.clear('user_profile'); 
      await db.put('user_profile', profile);
  },

  clearUserProfile: async (): Promise<void> => {
      const db = await getDB();
      await db.clear('user_profile');
  },

  // --- Transactions ---
  getTransactions: async (): Promise<TransactionEntry[]> => {
    const db = await getDB();
    return db.getAll('transactions');
  },

  saveTransaction: async (entry: TransactionEntry): Promise<void> => {
    const db = await getDB();
    await db.put('transactions', entry);
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const db = await getDB();
    await db.delete('transactions', id);
  },

  // --- Budgets ---
  getBudgets: async (): Promise<BudgetItem[]> => {
    const db = await getDB();
    return db.getAll('budgets');
  },

  saveBudget: async (item: BudgetItem): Promise<void> => {
    const db = await getDB();
    if (!item.id || item.id.startsWith('temp_')) {
       const all = await db.getAll('budgets');
       const existing = all.find(b => b.type === item.type && b.category === item.category && b.isExpense === item.isExpense);
       if (existing) {
           item.id = existing.id;
       }
    }
    await db.put('budgets', item);
  },

  deleteBudget: async (id: string): Promise<void> => {
    const db = await getDB();
    await db.delete('budgets', id);
  },

  // --- Custom Categories ---
  getCustomCategories: async (): Promise<CategoryItem[]> => {
      const db = await getDB();
      return db.getAll('custom_categories');
  },

  addCustomCategory: async (item: CategoryItem): Promise<void> => {
      const db = await getDB();
      const existing = await db.getFromIndex('custom_categories', 'by-type-cat-expense', [item.type, item.category, item.isExpense]);
      if (!existing) {
          await db.add('custom_categories', item);
      }
  },

  // --- Synchronization ---
  getSyncData: async (): Promise<SyncPacket> => {
      const db = await getDB();
      return {
          transactions: await db.getAll('transactions'),
          budgets: await db.getAll('budgets'),
          custom_categories: await db.getAll('custom_categories')
      };
  },

  mergeSyncData: async (data: SyncPacket): Promise<void> => {
      const db = await getDB();
      // We perform a series of PUT operations. 
      // Existing items with same ID will be overwritten (last write wins effectively during sync process)
      // New items will be added.
      const tx = db.transaction(['transactions', 'budgets', 'custom_categories'], 'readwrite');
      
      const promises = [
          ...data.transactions.map(t => tx.objectStore('transactions').put(t)),
          ...data.budgets.map(b => tx.objectStore('budgets').put(b)),
          // For custom categories, we try to avoid duplicates based on the unique index
          ...data.custom_categories.map(async (c) => {
               // If it has an ID, try to put it.
               if (c.id) {
                   await tx.objectStore('custom_categories').put(c);
               } else {
                   // Fallback if no ID (older versions), check existence
                   // Note: We can't easily use getFromIndex inside this same transaction cleanly without careful async management
                   // simplified: just try add, ignore if fails due to constraint (if we had one enforced at DB level beyond index)
                   // Actually, 'put' without key might fail if keyPath is 'id' and it's missing.
                   // Let's assume synced data has IDs.
               }
          })
      ];

      await Promise.all(promises);
      await tx.done;
  },

  // --- Reporting Aggregation ---
  getMonthlySummary: async (monthStr: string): Promise<MonthlySummary> => {
    const db = await getDB();
    const start = `${monthStr}-01`;
    const end = `${monthStr}-31`; 
    const range = IDBKeyRange.bound(start, end);
    
    const [monthlyTx, allBudgets] = await Promise.all([
        db.getAllFromIndex('transactions', 'by-date', range),
        db.getAll('budgets')
    ]);

    const incomeMap = new Map<string, CategorySummary>();
    const expenseMap = new Map<string, CategorySummary>();
    let totalIncome = 0;
    let totalExpense = 0;

    monthlyTx.forEach(t => {
        const key = `${t.type}||${t.category}`;
        if (!t.isExpense) {
            totalIncome += t.amount;
            const existing = incomeMap.get(key) || { type: t.type, category: t.category, amount: 0 };
            incomeMap.set(key, { ...existing, amount: existing.amount + t.amount });
        } else {
            totalExpense += t.amount;
            const existing = expenseMap.get(key) || { type: t.type, category: t.category, amount: 0 };
            expenseMap.set(key, { ...existing, amount: existing.amount + t.amount });
        }
    });

    const attachBudget = (item: CategorySummary, isExpense: boolean): CategorySummary => {
        const budget = allBudgets.find(b => b.isExpense === isExpense && b.type === item.type && b.category === item.category);
        if (budget) {
            return { ...item, targetAmount: budget.targetAmount };
        }
        return item;
    };

    const incomeCategories = Array.from(incomeMap.values())
        .map(item => attachBudget(item, false))
        .sort((a, b) => b.amount - a.amount);

    const expenseCategories = Array.from(expenseMap.values())
        .map(item => attachBudget(item, true))
        .sort((a, b) => b.amount - a.amount);

    return {
      month: monthStr,
      totalIncome,
      totalExpense,
      available: totalIncome - totalExpense,
      incomeCategories,
      expenseCategories
    };
  },

  // --- System / Recurrence ---
  processRecurrentTransactions: async (): Promise<void> => {
      const db = await getDB();
      const now = new Date();
      const currentMonthStr = now.toISOString().slice(0, 7);
      
      const lastSync = await db.get('system_meta', KEY_LAST_RECURRENCE_SYNC);

      if (lastSync === currentMonthStr) {
          return;
      }

      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStr = prevDate.toISOString().slice(0, 7);
      const prevMonthStart = `${prevMonthStr}-01`;
      const prevMonthEnd = `${prevMonthStr}-31`;

      const range = IDBKeyRange.bound(prevMonthStart, prevMonthEnd);
      const prevMonthTx = await db.getAllFromIndex('transactions', 'by-date', range);
      
      const recurrentToCopy = prevMonthTx.filter(t => t.isRecurrent);

      if (recurrentToCopy.length > 0) {
          const tx = db.transaction('transactions', 'readwrite');
          const store = tx.objectStore('transactions');

          for (const t of recurrentToCopy) {
              const originalDate = new Date(t.date);
              const newDateObj = new Date(now.getFullYear(), now.getMonth(), originalDate.getDate());
              
              const newEntry: TransactionEntry = {
                  ...t,
                  id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
                  date: newDateObj.toISOString().split('T')[0],
              };
              await store.add(newEntry);
          }
          await tx.done;
      }

      await db.put('system_meta', currentMonthStr, KEY_LAST_RECURRENCE_SYNC);
  }
};