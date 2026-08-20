import { useCallback, useState } from 'react';
import type { InvoiceDraft, InvoiceTotals } from '@/types/invoice';

export interface StoredInvoice {
  _id: string;
  invoiceNumber: string;
  draft: InvoiceDraft;
  totals: InvoiceTotals;
  createdAt: string;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/invoices', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load invoices.');
      }

      setInvoices(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvoice = useCallback(async (draft: InvoiceDraft): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Could not save the invoice.' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Could not save the invoice.' };
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not delete the invoice.');
        return false;
      }

      setInvoices((current) => current.filter((invoice) => invoice._id !== id));
      return true;
    } catch {
      setError('Could not delete the invoice.');
      return false;
    }
  }, []);

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    deleteInvoice,
  };
}
