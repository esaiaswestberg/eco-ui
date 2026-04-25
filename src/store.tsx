import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Transaction, Rule } from './types';
import { v4 as uuidv4 } from 'uuid';

interface StoreContextType {
  state: AppState;
  addCategory: (name: string, type: 'income' | 'cost') => void;
  updateCategory: (id: string, name: string, type: 'income' | 'cost') => void;
  deleteCategory: (id: string) => void;
  processTransaction: (transactionId: string, categoryId: string | null, isIgnored: boolean, splits?: { categoryId: string; amount: number }[], skipped?: boolean) => void;
  addTransactions: (transactions: Transaction[]) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  updateRule: (id: string, rule: Omit<Rule, 'id'>) => void;
  deleteRule: (id: string) => void;
  applyRules: () => void;
  importData: (data: AppState) => void;
  clearData: () => void;
}

const defaultState: AppState = {
  categories: [],
  transactions: [],
  rules: [],
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('ecoUiState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage data');
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('ecoUiState', JSON.stringify(state));
  }, [state]);

  const addCategory = (name: string, type: 'income' | 'cost') => {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, { id: uuidv4(), name, type }],
    }));
  };

  const updateCategory = (id: string, name: string, type: 'income' | 'cost') => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, name, type } : c)),
    }));
  };

  const deleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      transactions: prev.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
    }));
  };

  const processTransaction = (transactionId: string, categoryId: string | null, isIgnored: boolean, splits?: { categoryId: string; amount: number }[], skipped?: boolean) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === transactionId ? { ...t, categoryId, isIgnored, splits, isSkipped: skipped } : t
      ),
    }));
  };

  const checkTransactionAgainstRule = (t: Transaction, r: Rule): boolean => {
    const descLower = t.description.toLowerCase();
    const matchLower = r.descriptionMatch.toLowerCase();

    let textMatches = false;
    switch (r.matchType) {
      case 'exact': textMatches = descLower === matchLower; break;
      case 'contains': textMatches = descLower.includes(matchLower); break;
      case 'starts_with': textMatches = descLower.startsWith(matchLower); break;
      case 'ends_with': textMatches = descLower.endsWith(matchLower); break;
      case 'not_exact': textMatches = descLower !== matchLower; break;
      case 'not_contains': textMatches = !descLower.includes(matchLower); break;
      case 'not_starts_with': textMatches = !descLower.startsWith(matchLower); break;
      case 'not_ends_with': textMatches = !descLower.endsWith(matchLower); break;
      default: textMatches = false;
    }

    if (!textMatches) return false;

    const absAmount = Math.abs(t.amount);
    if (r.minAmount !== undefined && absAmount < r.minAmount) return false;
    if (r.maxAmount !== undefined && absAmount > r.maxAmount) return false;

    return true;
  };

  const addTransactions = (newTransactions: Transaction[]) => {
    setState((prev) => {
      const existingIds = new Set(prev.transactions.map((t) => t.id));
      const added = newTransactions.filter((t) => !existingIds.has(t.id));

      // Apply rules to new transactions
      const processedAdded = added.map(t => {
        for (const rule of prev.rules) {
          if (checkTransactionAgainstRule(t, rule)) {
            if (rule.action === 'ignore') {
              return { ...t, isIgnored: true };
            } else if (rule.action === 'categorize' && rule.categoryId) {
              return { ...t, categoryId: rule.categoryId };
            }
          }
        }
        return t;
      });

      return {
        ...prev,
        transactions: [...prev.transactions, ...processedAdded],
      };
    });
  };

  const addRule = (rule: Omit<Rule, 'id'>) => {
    setState((prev) => {
      const newRule = { ...rule, id: uuidv4() };
      const newRules = [...prev.rules, newRule];
      
      // Apply new rule to pending transactions
      const newTransactions = prev.transactions.map(t => {
        if (!t.isIgnored && !t.categoryId && (!t.splits || t.splits.length === 0)) {
          if (checkTransactionAgainstRule(t, newRule)) {
            if (newRule.action === 'ignore') {
              return { ...t, isIgnored: true };
            } else if (newRule.action === 'categorize' && newRule.categoryId) {
              return { ...t, categoryId: newRule.categoryId };
            }
          }
        }
        return t;
      });

      return {
        ...prev,
        rules: newRules,
        transactions: newTransactions
      };
    });
  };

  const updateRule = (id: string, rule: Omit<Rule, 'id'>) => {
    setState((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === id ? { ...rule, id } : r)),
    }));
  };

  const deleteRule = (id: string) => {
    setState((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== id),
    }));
  };

  const applyRules = () => {
    setState((prev) => {
      const newTransactions = prev.transactions.map(t => {
        if (!t.isIgnored && !t.categoryId && (!t.splits || t.splits.length === 0)) {
          for (const rule of prev.rules) {
            if (checkTransactionAgainstRule(t, rule)) {
              if (rule.action === 'ignore') {
                return { ...t, isIgnored: true };
              } else if (rule.action === 'categorize' && rule.categoryId) {
                return { ...t, categoryId: rule.categoryId };
              }
            }
          }
        }
        return t;
      });

      return { ...prev, transactions: newTransactions };
    });
  };

  const importData = (data: AppState) => {
    setState({ ...defaultState, ...data });
  };

  const clearData = () => {
    setState(defaultState);
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        addCategory,
        updateCategory,
        deleteCategory,
        processTransaction,
        addTransactions,
        addRule,
        updateRule,
        deleteRule,
        applyRules,
        importData,
        clearData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
