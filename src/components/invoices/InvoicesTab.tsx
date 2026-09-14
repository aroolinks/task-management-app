'use client';

import { useState } from 'react';
import InvoiceArchive from './InvoiceArchive';
import InvoiceForm from './InvoiceForm';
import type { StoredInvoice } from '@/hooks/useInvoices';

// Embedded in TaskApp as the "Invoices" tab: a small local toggle between the
// archive and the create/edit form, so both are reachable without leaving the
// main page shell. The standalone /invoices and /invoices/new routes still work too.
export default function InvoicesTab() {
  const [view, setView] = useState<'archive' | 'new'>('archive');
  const [editingInvoice, setEditingInvoice] = useState<StoredInvoice | null>(null);
  const tabClass = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm font-medium ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`;

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 bg-slate-100 px-4 py-2 sm:px-6">
        <button type="button" onClick={() => setView('archive')} className={tabClass(view === 'archive')}>Invoice archive</button>
        <button type="button" onClick={() => { setEditingInvoice(null); setView('new'); }} className={tabClass(view === 'new')}>+ New invoice</button>
      </div>
      {view === 'archive' ? (
        <InvoiceArchive
          onCreateNew={() => { setEditingInvoice(null); setView('new'); }}
          onEdit={(invoice) => { setEditingInvoice(invoice); setView('new'); }}
        />
      ) : (
        <InvoiceForm
          invoiceId={editingInvoice?._id}
          initialDraft={editingInvoice?.draft}
          onSaved={() => { setEditingInvoice(null); setView('archive'); }}
        />
      )}
    </div>
  );
}
