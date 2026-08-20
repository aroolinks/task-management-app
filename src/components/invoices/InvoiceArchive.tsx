'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import { useInvoices, type StoredInvoice } from '@/hooks/useInvoices';
import { downloadInvoicePdf } from '@/lib/invoices/pdf';
import { formatMinor } from '@/lib/invoices/calculations';
import InvoicePreview from './InvoicePreview';

export default function InvoiceArchive() {
  const { user, loading: authLoading } = useAuth();
  const { invoices, loading, error, fetchInvoices, deleteInvoice } = useInvoices();
  const [selected, setSelected] = useState<StoredInvoice | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [monthFilter, setMonthFilter] = useState('all');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    fetchInvoices();
  }, [user, fetchInvoices]);

  const months = Array.from(new Set(invoices.map((invoice) => invoice.draft.issueDate.slice(0, 7)))).sort().reverse();
  const filteredInvoices = monthFilter === 'all' ? invoices : invoices.filter((invoice) => invoice.draft.issueDate.startsWith(monthFilter));

  const handleDelete = async (invoice: StoredInvoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    const success = await deleteInvoice(invoice._id);
    if (success && selected?._id === invoice._id) setSelected(null);
  };

  const printInvoice = (invoice: StoredInvoice) => {
    setSelected(invoice);
    window.setTimeout(() => window.print(), 0);
  };

  const downloadPdf = async (invoice: StoredInvoice) => {
    setSelected(invoice);
    setIsDownloading(true);
    setMessage(null);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const filename = `invoice-${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]+/g, '-')}.pdf`;
      if (printRef.current) await downloadInvoicePdf(printRef.current, filename);
    } catch {
      setMessage('Could not generate the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">Loading…</div>;
  if (!user) return <LoginForm />;
  if (user.role !== 'admin') return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-600">Invoice archive is restricted to administrators.</div>;

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm font-medium text-blue-700 hover:text-blue-900">← Dashboard</Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Invoice archive</h1>
            <p className="text-sm text-slate-500">{filteredInvoices.length} of {invoices.length} saved invoice{invoices.length === 1 ? '' : 's'}</p>
          </div>
          <Link href="/invoices/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create invoice</Link>
        </header>

        <nav aria-label="Filter invoices by month" className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex min-w-max gap-2">
            <button type="button" onClick={() => setMonthFilter('all')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${monthFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>All months</button>
            {months.map((month) => (
              <button key={month} type="button" onClick={() => setMonthFilter(month)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${monthFilter === month ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(`${month}-01`))}
              </button>
            ))}
          </div>
        </nav>

        {(error || message) && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || message}</div>}
        {loading && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading invoices…</p>}
        {!loading && invoices.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No invoices have been saved yet.</p>}
        {!loading && invoices.length > 0 && filteredInvoices.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No invoices found for this month.</p>}
        {!loading && filteredInvoices.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Issue date</th><th className="px-4 py-3">Total</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="text-slate-700">
                      <td className="px-4 py-4 font-semibold text-slate-900">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-4">{invoice.draft.customer.name}</td>
                      <td className="px-4 py-4">{invoice.draft.issueDate}</td>
                      <td className="px-4 py-4 font-medium">{formatMinor(invoice.totals.totalMinor, invoice.draft.currency)}</td>
                      <td className="px-4 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => printInvoice(invoice)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50">Print</button><button type="button" onClick={() => downloadPdf(invoice)} disabled={isDownloading} className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50">PDF</button><button type="button" onClick={() => handleDelete(invoice)} className="rounded-md border border-red-200 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50">Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && <div ref={printRef} className="invoice-print-target"><InvoicePreview invoice={selected.draft} totals={selected.totals} /></div>}
    </main>
  );
}