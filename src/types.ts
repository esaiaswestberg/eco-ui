export type CategoryType = 'income' | 'cost';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export type MatchType = 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'not_exact' | 'not_contains' | 'not_starts_with' | 'not_ends_with';

export interface Rule {
  id: string;
  descriptionMatch: string;
  matchType: MatchType;
  minAmount?: number;
  maxAmount?: number;
  action: 'categorize' | 'ignore';
  categoryId?: string; // Required if action === 'categorize'
}

export interface Transaction {
  id: string; // Hash from date + desc + amount + balance
  date: string; // ISO date string or yyyy-mm-dd
  description: string;
  amount: number;
  balance: number;
  categoryId?: string | null;
  splits?: { categoryId: string; amount: number }[];
  isIgnored: boolean;
  isSkipped?: boolean;
}

export interface AppState {
  categories: Category[];
  transactions: Transaction[];
  rules: Rule[];
}
