'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import InvoiceForm from './InvoiceForm';
import type { InvoiceDraft } from '@/types/invoice';

export default function InvoiceNewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Read the query param directly rather than via useSearchParams(), so this
  // client component doesn't need a Suspense boundary just to support editing.
  const [editId, setEditId] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState<InvoiceDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('edit');
    setEditId(id);
    if (!id) return;
    let cancelled = false;
    setLoadingDraft(true);
    fetch(`/api/invoices/${id}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (!result.success) { setLoadError(result.error || 'Could not load that invoice.'); return; }
        setInitialDraft(result.data.draft);
      })
      .catch(() => { if (!cancelled) setLoadError('Could not load that invoice.'); })
      .finally(() => { if (!cancelled) setLoadingDraft(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">Loading…</div>;
  if (!user) return <LoginForm />;
  if (user.role !== 'admin') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-600">Invoice creation is currently restricted to administrators.</div>;
  }
  if (editId && loadingDraft) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">Loading invoice…</div>;
  if (editId && loadError) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-600">{loadError}</div>;

  return <InvoiceForm invoiceId={editId ?? undefined} initialDraft={initialDraft ?? undefined} onSaved={editId ? () => router.push('/invoices') : undefined} />;
}
