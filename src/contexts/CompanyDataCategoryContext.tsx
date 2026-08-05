'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CompanyDataCategoryItem {
  id: string;
  name: string;
}

interface CompanyDataCategoryContextType {
  companyDataCategories: CompanyDataCategoryItem[];
  companyDataCategoryNames: string[];
  loading: boolean;
  error: string | null;
  addCompanyDataCategory: (name: string) => Promise<boolean>;
  renameCompanyDataCategory: (id: string, name: string) => Promise<boolean>;
  removeCompanyDataCategory: (id: string) => Promise<boolean>;
  refreshCompanyDataCategories: () => void;
}

const CompanyDataCategoryContext = createContext<CompanyDataCategoryContextType | undefined>(undefined);

const DEFAULT_COMPANY_DATA_CATEGORIES = ['Domain', 'Hosting', 'Email', 'Software', 'Banking', 'Social Media', 'Other'];

export function CompanyDataCategoryProvider({ children }: { children: React.ReactNode }) {
  const [companyDataCategories, setCompanyDataCategories] = useState<CompanyDataCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyDataCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/company-data-categories', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch company data categories');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const items: CompanyDataCategoryItem[] = result.data.map((cat: { _id: string; name: string }) => ({
          id: cat._id,
          name: cat.name,
        }));
        setCompanyDataCategories(items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch company data categories');
      }
    } catch (err) {
      console.error('Error fetching company data categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch company data categories');
      setCompanyDataCategories(DEFAULT_COMPANY_DATA_CATEGORIES.map(name => ({ id: name, name })));
    } finally {
      setLoading(false);
    }
  }, []);

  const addCompanyDataCategory = useCallback(async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    try {
      const response = await fetch('/api/company-data-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add company data category');
      }
      await fetchCompanyDataCategories();
      return true;
    } catch (err) {
      console.error('Error adding company data category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add company data category');
      return false;
    }
  }, [fetchCompanyDataCategories]);

  const renameCompanyDataCategory = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    try {
      const response = await fetch(`/api/company-data-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to rename company data category');
      }
      await fetchCompanyDataCategories();
      return true;
    } catch (err) {
      console.error('Error renaming company data category:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename company data category');
      return false;
    }
  }, [fetchCompanyDataCategories]);

  const removeCompanyDataCategory = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/company-data-categories/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete company data category');
      }
      await fetchCompanyDataCategories();
      return true;
    } catch (err) {
      console.error('Error deleting company data category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete company data category');
      return false;
    }
  }, [fetchCompanyDataCategories]);

  const refreshCompanyDataCategories = useCallback(() => {
    fetchCompanyDataCategories();
  }, [fetchCompanyDataCategories]);

  useEffect(() => {
    fetchCompanyDataCategories();
  }, [fetchCompanyDataCategories]);

  const value: CompanyDataCategoryContextType = {
    companyDataCategories,
    companyDataCategoryNames: companyDataCategories.map(cat => cat.name),
    loading,
    error,
    addCompanyDataCategory,
    renameCompanyDataCategory,
    removeCompanyDataCategory,
    refreshCompanyDataCategories,
  };

  return (
    <CompanyDataCategoryContext.Provider value={value}>
      {children}
    </CompanyDataCategoryContext.Provider>
  );
}

export function useCompanyDataCategories() {
  const context = useContext(CompanyDataCategoryContext);
  if (context === undefined) {
    throw new Error('useCompanyDataCategories must be used within a CompanyDataCategoryProvider');
  }
  return context;
}
