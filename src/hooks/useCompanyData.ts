import { useState, useEffect, useCallback } from 'react';

export interface CompanyCredential {
  _id: string;
  title: string;
  category: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
  createdBy?: string;
  editedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyCredentialInput {
  title: string;
  category?: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
}

export function useCompanyData() {
  const [credentials, setCredentials] = useState<CompanyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/company-data', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company data');
      }

      if (data.success && Array.isArray(data.data)) {
        const formatted = data.data.map((credential: CompanyCredential) => ({
          ...credential,
          createdAt: new Date(credential.createdAt),
          updatedAt: new Date(credential.updatedAt),
        }));
        setCredentials(formatted);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCredential = useCallback(async (input: CompanyCredentialInput): Promise<CompanyCredential | null> => {
    try {
      setError(null);

      const response = await fetch('/api/company-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company credential');
      }

      if (data.success && data.data) {
        const newCredential: CompanyCredential = {
          ...data.data,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        setCredentials(prev => [...prev, newCredential].sort((a, b) => a.title.localeCompare(b.title)));
        return newCredential;
      }

      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error creating company credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to create company credential');
      return null;
    }
  }, []);

  const updateCredential = useCallback(async (id: string, input: CompanyCredentialInput): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/company-data/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update company credential');
      }

      if (data.success && data.data) {
        const updatedCredential: CompanyCredential = {
          ...data.data,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        setCredentials(prev =>
          prev.map(c => (c._id === id ? updatedCredential : c)).sort((a, b) => a.title.localeCompare(b.title))
        );
        return true;
      }

      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error updating company credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to update company credential');
      return false;
    }
  }, []);

  const deleteCredential = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/company-data/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete company credential');
      }

      if (data.success) {
        setCredentials(prev => prev.filter(c => c._id !== id));
        return true;
      }

      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error deleting company credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete company credential');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return {
    credentials,
    loading,
    error,
    createCredential,
    updateCredential,
    deleteCredential,
    refreshCredentials: fetchCredentials,
  };
}
