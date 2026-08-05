'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface ExpenseCategoryItem {
  id: string;
  name: string;
}

interface ExpenseCategoryContextType {
  expenseCategories: ExpenseCategoryItem[];
  expenseCategoryNames: string[];
  loading: boolean;
  error: string | null;
  addExpenseCategory: (name: string) => Promise<boolean>;
  renameExpenseCategory: (id: string, name: string) => Promise<boolean>;
  removeExpenseCategory: (id: string) => Promise<boolean>;
  refreshExpenseCategories: () => void;
}

const ExpenseCategoryContext = createContext<ExpenseCategoryContextType | undefined>(undefined);

const DEFAULT_EXPENSE_CATEGORIES = ['Salaries', 'Software', 'Marketing', 'Rent', 'Utilities', 'Other'];

export function ExpenseCategoryProvider({ children }: { children: React.ReactNode }) {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenseCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/expense-categories', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch expense categories');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const items: ExpenseCategoryItem[] = result.data.map((ec: { _id: string; name: string }) => ({
          id: ec._id,
          name: ec.name,
        }));
        setExpenseCategories(items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch expense categories');
      }
    } catch (err) {
      console.error('Error fetching expense categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expense categories');
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES.map(name => ({ id: name, name })));
    } finally {
      setLoading(false);
    }
  }, []);

  const addExpenseCategory = useCallback(async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    try {
      const response = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add expense category');
      }
      await fetchExpenseCategories();
      return true;
    } catch (err) {
      console.error('Error adding expense category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add expense category');
      return false;
    }
  }, [fetchExpenseCategories]);

  const renameExpenseCategory = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    try {
      const response = await fetch(`/api/expense-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to rename expense category');
      }
      await fetchExpenseCategories();
      return true;
    } catch (err) {
      console.error('Error renaming expense category:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename expense category');
      return false;
    }
  }, [fetchExpenseCategories]);

  const removeExpenseCategory = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete expense category');
      }
      await fetchExpenseCategories();
      return true;
    } catch (err) {
      console.error('Error deleting expense category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete expense category');
      return false;
    }
  }, [fetchExpenseCategories]);

  const refreshExpenseCategories = useCallback(() => {
    fetchExpenseCategories();
  }, [fetchExpenseCategories]);

  useEffect(() => {
    fetchExpenseCategories();
  }, [fetchExpenseCategories]);

  const value: ExpenseCategoryContextType = {
    expenseCategories,
    expenseCategoryNames: expenseCategories.map(ec => ec.name),
    loading,
    error,
    addExpenseCategory,
    renameExpenseCategory,
    removeExpenseCategory,
    refreshExpenseCategories,
  };

  return (
    <ExpenseCategoryContext.Provider value={value}>
      {children}
    </ExpenseCategoryContext.Provider>
  );
}

export function useExpenseCategories() {
  const context = useContext(ExpenseCategoryContext);
  if (context === undefined) {
    throw new Error('useExpenseCategories must be used within an ExpenseCategoryProvider');
  }
  return context;
}
