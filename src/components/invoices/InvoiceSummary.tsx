import { formatMinor } from '@/lib/invoices/calculations';
import type { InvoiceTotals } from '@/types/invoice';

interface InvoiceSummaryProps {
  totals: InvoiceTotals;
  compact?: boolean;
}

export default function InvoiceSummary({ totals, compact = false }: InvoiceSummaryProps) {
  return (
    <dl className={compact ? 'space-y-1' : 'ml-auto mt-5 max-w-xs space-y-2 text-sm'}>
      <div className="flex justify-between gap-6">
        <dt className="text-slate-500">Subtotal</dt>
        <dd>{formatMinor(totals.subtotalMinor)}</dd>
      </div>
      {totals.discountMinor > 0 && (
        <div className="flex justify-between gap-6">
          <dt className="text-slate-500">Discount</dt>
          <dd>-{formatMinor(totals.discountMinor)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-6">
        <dt className="text-slate-500">Net</dt>
        <dd>{formatMinor(totals.netMinor)}</dd>
      </div>
      <div className="flex justify-between gap-6">
        <dt className="text-slate-500">VAT</dt>
        <dd>{formatMinor(totals.vatMinor)}</dd>
      </div>
      <div className="flex justify-between gap-6 border-t border-slate-200 pt-2 font-semibold text-slate-900">
        <dt>Total</dt>
        <dd>{formatMinor(totals.totalMinor)}</dd>
      </div>
      {totals.amountPaidMinor > 0 && (
        <div className="flex justify-between gap-6">
          <dt className="text-slate-500">Amount paid</dt>
          <dd>-{formatMinor(totals.amountPaidMinor)}</dd>
        </div>
      )}
      <div className={compact
        ? 'flex justify-between gap-6 rounded bg-blue-50 px-2 py-2 font-bold text-blue-950'
        : 'flex justify-between gap-6 rounded-lg bg-blue-50 px-3 py-2 text-base font-bold text-blue-950'}
      >
        <dt>Amount due</dt>
        <dd>{formatMinor(totals.amountDueMinor)}</dd>
      </div>
    </dl>
  );
}
