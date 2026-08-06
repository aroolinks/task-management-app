'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useClients } from '@/contexts/ClientContext';
import { calculateInvoice, parseMajorToMinor, percentageToBasisPoints } from '@/lib/invoices/calculations';
import { invoiceDraftSchema } from '@/lib/invoices/validation';
import { createInvoiceDraft } from '@/lib/invoices/utils';
import { loadInvoiceDefaults, saveInvoiceDefaults } from '@/lib/invoices/defaults';
import type { InvoiceDiscountType, InvoiceDraft } from '@/types/invoice';
import InvoiceCurrencyInput from './InvoiceCurrencyInput';
import InvoiceLineItems from './InvoiceLineItems';
import InvoicePartyFields from './InvoicePartyFields';
import InvoicePreview from './InvoicePreview';
import InvoiceSummary from './InvoiceSummary';

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'mb-1 block text-xs font-medium text-slate-600';

export default function InvoiceForm() {
  const { clients } = useClients();
  const [invoice, setInvoice] = useState<InvoiceDraft>(() => createInvoiceDraft(loadInvoiceDefaults()));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const totals = useMemo(() => calculateInvoice(invoice.items, invoice.discount, invoice.amountPaidMinor), [invoice]);

  useEffect(() => {
    saveInvoiceDefaults({
      seller: invoice.seller,
      bankDetails: invoice.bankDetails,
      paymentTerms: invoice.paymentTerms,
      notes: invoice.notes,
    });
  }, [invoice.seller, invoice.bankDetails, invoice.paymentTerms, invoice.notes]);

  const setDiscountType = (type: InvoiceDiscountType) => {
    setInvoice((current) => ({ ...current, discount: { type, value: 0 } }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = invoiceDraftSchema.safeParse(invoice);
    if (!result.success) {
      setMessage({ type: 'error', text: result.error.issues[0]?.message || 'Please check the invoice details.' });
      return;
    }
    setMessage({ type: 'success', text: 'Invoice details are valid. Saving will be added in the database phase.' });
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">← Dashboard</Link>
            <div><h1 className="font-semibold text-slate-900">Create invoice</h1><p className="text-xs text-slate-500">Draft values are not saved yet</p></div>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Validate draft</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:p-6 2xl:grid-cols-[760px_minmax(520px,1fr)]">
        <div className="min-w-0 space-y-4">
          {message && <div role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.text}</div>}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Invoice details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className={labelClass}>Invoice number *</span><input value={invoice.invoiceNumber} onChange={(event) => setInvoice({ ...invoice, invoiceNumber: event.target.value })} className={fieldClass} required /></label>
              <label><span className={labelClass}>Status</span><select value={invoice.status} onChange={(event) => setInvoice({ ...invoice, status: event.target.value as InvoiceDraft['status'] })} className={fieldClass}><option value="draft">Draft</option><option value="sent">Sent</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></label>
              <label><span className={labelClass}>Issue date</span><input type="date" value={invoice.issueDate} onChange={(event) => setInvoice({ ...invoice, issueDate: event.target.value })} className={fieldClass} /></label>
              <label><span className={labelClass}>Due date</span><input type="date" value={invoice.dueDate} onChange={(event) => setInvoice({ ...invoice, dueDate: event.target.value })} className={fieldClass} /></label>
            </div>
          </section>

          <InvoicePartyFields idPrefix="seller" title="Your business" party={invoice.seller} onChange={(seller) => setInvoice({ ...invoice, seller })} />

          <InvoicePartyFields
            idPrefix="customer"
            title="Bill to"
            party={invoice.customer}
            onChange={(customer) => setInvoice({ ...invoice, customer })}
            action={clients.length > 0 ? (
              <label htmlFor="existing-client" className="w-full sm:w-48">
                <span className="sr-only">Use existing client</span>
                <select id="existing-client" value="" onChange={(event) => setInvoice({ ...invoice, customer: { ...invoice.customer, name: event.target.value } })} className={fieldClass}>
                  <option value="">Use a client…</option>
                  {clients.map((client) => <option key={client.id} value={client.name}>{client.name}</option>)}
                </select>
              </label>
            ) : undefined}
          />

          <InvoiceLineItems items={invoice.items} calculatedLines={totals.lines} onChange={(items) => setInvoice({ ...invoice, items })} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Totals and payment</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label><span className={labelClass}>Discount</span><select value={invoice.discount.type} onChange={(event) => setDiscountType(event.target.value as InvoiceDiscountType)} className={fieldClass}><option value="none">No discount</option><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
              {invoice.discount.type !== 'none' && <label><span className={labelClass}>{invoice.discount.type === 'percentage' ? 'Discount %' : 'Discount amount'}</span><input inputMode="decimal" defaultValue="0" onBlur={(event) => { const value = invoice.discount.type === 'percentage' ? percentageToBasisPoints(event.target.value) : parseMajorToMinor(event.target.value); if (value !== null && value >= 0) setInvoice({ ...invoice, discount: { ...invoice.discount, value } }); }} className={fieldClass} /></label>}
              <div><label htmlFor="amount-paid" className={labelClass}>Amount paid</label><InvoiceCurrencyInput id="amount-paid" valueMinor={invoice.amountPaidMinor} onChange={(amountPaidMinor) => setInvoice({ ...invoice, amountPaidMinor })} className={fieldClass} /></div>
            </div>
            <InvoiceSummary totals={totals} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Payment details and notes</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className={labelClass}>Account name</span><input value={invoice.bankDetails.accountName} onChange={(event) => setInvoice({ ...invoice, bankDetails: { ...invoice.bankDetails, accountName: event.target.value } })} className={fieldClass} /></label>
              <label><span className={labelClass}>Bank name</span><input value={invoice.bankDetails.bankName} onChange={(event) => setInvoice({ ...invoice, bankDetails: { ...invoice.bankDetails, bankName: event.target.value } })} className={fieldClass} /></label>
              <label><span className={labelClass}>Sort code</span><input value={invoice.bankDetails.sortCode} onChange={(event) => setInvoice({ ...invoice, bankDetails: { ...invoice.bankDetails, sortCode: event.target.value } })} className={fieldClass} /></label>
              <label><span className={labelClass}>Account number</span><input value={invoice.bankDetails.accountNumber} onChange={(event) => setInvoice({ ...invoice, bankDetails: { ...invoice.bankDetails, accountNumber: event.target.value } })} className={fieldClass} /></label>
              <label className="sm:col-span-2"><span className={labelClass}>Payment terms</span><textarea rows={3} value={invoice.paymentTerms} onChange={(event) => setInvoice({ ...invoice, paymentTerms: event.target.value })} className={fieldClass} /></label>
              <label className="sm:col-span-2"><span className={labelClass}>Notes</span><textarea rows={3} value={invoice.notes} onChange={(event) => setInvoice({ ...invoice, notes: event.target.value })} className={fieldClass} /></label>
            </div>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Live A4 preview</h2><span className="text-xs text-slate-500">210 × 297 mm</span></div>
          <InvoicePreview invoice={invoice} totals={totals} />
        </aside>
      </main>
    </form>
  );
}
