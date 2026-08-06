'use client';

import { createInvoiceLineItem } from '@/lib/invoices/utils';
import type { InvoiceLineItem } from '@/types/invoice';
import InvoiceCurrencyInput from './InvoiceCurrencyInput';

interface InvoiceLineItemsProps {
  items: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
}

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

export default function InvoiceLineItems({ items, onChange }: InvoiceLineItemsProps) {
  const updateItem = (id: string, update: Partial<InvoiceLineItem>) => {
    onChange(items.map((item) => item.id === id ? { ...item, ...update } : item));
  };

  const addItem = () => {
    onChange([...items, createInvoiceLineItem()]);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Invoice items</h2>
          <p className="text-xs text-slate-500">Prices are entered in pounds and retained as integer pence.</p>
        </div>
        <button type="button" onClick={addItem} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          + Add item
        </button>
      </div>

      <div className="space-y-3">
        <div className="hidden grid-cols-12 gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid" aria-hidden="true">
          <span className="col-span-8">Description</span>
          <span className="col-span-2">Quantity</span>
          <span className="col-span-2">Unit price</span>
        </div>
        {items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))}
                disabled={items.length === 1}
                aria-label={`Remove invoice item ${index + 1}`}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-12">
              <label className="sm:col-span-8">
                <span className="mb-1 block text-xs font-medium text-slate-600 sm:sr-only">Description</span>
                <input
                  value={item.description}
                  onChange={(event) => updateItem(item.id, { description: event.target.value })}
                  className={fieldClass}
                  placeholder="Service or product"
                  required
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600 sm:sr-only">Quantity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number.parseInt(event.target.value || '1', 10)) })}
                  className={fieldClass}
                />
              </label>
              <div className="sm:col-span-2">
                <label htmlFor={`item-${item.id}-price`} className="mb-1 block text-xs font-medium text-slate-600 sm:sr-only">Unit price</label>
                <InvoiceCurrencyInput
                  id={`item-${item.id}-price`}
                  valueMinor={item.unitPriceMinor}
                  onChange={(unitPriceMinor) => updateItem(item.id, { unitPriceMinor })}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
