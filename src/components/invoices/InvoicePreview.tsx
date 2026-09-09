import Image from 'next/image';
import { formatMinor } from '@/lib/invoices/calculations';
import type { InvoiceDraft, InvoiceTotals } from '@/types/invoice';
import InvoiceSummary from './InvoiceSummary';

interface InvoicePreviewProps {
  invoice: InvoiceDraft;
  totals: InvoiceTotals;
}

function Address({ party }: { party: InvoiceDraft['customer'] }) {
  return (
    <div className="space-y-0.5">
      <p className="font-semibold text-slate-900">{party.name || 'Customer name'}</p>
      {party.addressLine1 && <p>{party.addressLine1}</p>}
      {party.addressLine2 && <p>{party.addressLine2}</p>}
      {(party.city || party.postcode) && <p>{[party.city, party.postcode].filter(Boolean).join(', ')}</p>}
      {party.country && <p>{party.country}</p>}
      {party.email && <p>{party.email}</p>}
      {party.vatNumber && <p>VAT: {party.vatNumber}</p>}
    </div>
  );
}

function paymentStatus(totals: InvoiceTotals): { label: string; className: string } {
  if (totals.totalMinor > 0 && totals.amountDueMinor === 0) {
    return { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (totals.amountPaidMinor > 0) {
    return { label: 'Part paid', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'Due', className: 'bg-blue-50 text-blue-800 border-blue-200' };
}

export default function InvoicePreview({ invoice, totals }: InvoicePreviewProps) {
  const status = paymentStatus(totals);

  return (
    <div className="mx-auto w-full max-w-[794px] [container-type:inline-size]">
      <div
        className="flex aspect-[210/297] flex-col overflow-hidden bg-white p-[6%] text-[max(9px,1.75cqw)] leading-relaxed text-slate-700 tabular-nums shadow-xl ring-1 ring-slate-200"
        role="region"
        aria-label="Live invoice preview"
      >
        <header className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <Image src="/metalogics-logo-full.png" alt="Metalogics" width={274} height={51} className="mb-3 h-14 w-auto" priority unoptimized />
            <Address party={invoice.seller} />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[2.1em] font-bold leading-none tracking-tight text-blue-950">INVOICE</p>
            <p className="mt-2 text-[1.1em] font-semibold text-slate-900">{invoice.invoiceNumber || 'Draft invoice'}</p>
            <span className={`mt-2 inline-block rounded-full border px-[0.7em] py-[0.15em] text-[0.78em] font-semibold uppercase tracking-wide ${status.className}`}>
              {status.label}
            </span>
          </div>
        </header>

        <div className="mt-[5%] h-[3px] rounded-full bg-blue-950" />

        <section className="mt-[5%] flex justify-between gap-8">
          <div className="min-w-0">
            <p className="mb-1.5 text-[0.78em] font-bold uppercase tracking-[0.18em] text-slate-400">Bill to</p>
            <Address party={invoice.customer} />
          </div>
          <dl className="shrink-0 space-y-1 text-right">
            <div className="flex justify-between gap-10"><dt className="text-slate-400">Issue date</dt><dd className="font-medium text-slate-900">{invoice.issueDate}</dd></div>
            <div className="flex justify-between gap-10"><dt className="text-slate-400">Due date</dt><dd className="font-medium text-slate-900">{invoice.dueDate}</dd></div>
          </dl>
        </section>

        <div className="mt-[6%] min-h-0 flex-1">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-blue-950 text-left text-white">
                <th className="w-[48%] px-2.5 py-2 font-semibold">Description</th>
                <th className="w-[10%] px-2.5 py-2 text-right font-semibold">Qty</th>
                <th className="w-[21%] px-2.5 py-2 text-right font-semibold">Unit price</th>
                <th className="w-[21%] px-2.5 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {totals.lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-200 align-top">
                  <td className="break-words px-2.5 py-2 text-slate-900">
                    {line.description || 'Untitled item'}
                    {line.vatRateBasisPoints > 0 && (
                      <span className="text-slate-400"> · incl. VAT {line.vatRateBasisPoints / 100}%</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-right">{line.quantity}</td>
                  <td className="px-2.5 py-2 text-right">{formatMinor(line.unitPriceMinor)}</td>
                  <td className="px-2.5 py-2 text-right font-medium text-slate-900">{formatMinor(line.quantity * line.unitPriceMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-8 w-[52%] min-w-[200px]">
            <InvoiceSummary totals={totals} compact />
          </div>
        </div>

        <footer className="mt-6 grid grid-cols-2 gap-8 border-t-2 border-slate-200 pt-4">
          <div className="min-w-0">
            <p className="mb-1 text-[1.05em] font-semibold text-slate-900">Payment details</p>
            <p>{invoice.bankDetails.accountName || 'Account name'}</p>
            <p>{invoice.bankDetails.bankName || 'Bank name'}</p>
            {(invoice.bankDetails.sortCode || invoice.bankDetails.accountNumber) && (
              <p className="mt-1 font-medium text-slate-900">{invoice.bankDetails.sortCode} · {invoice.bankDetails.accountNumber}</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[1.05em] font-semibold text-slate-900">Terms &amp; notes</p>
            {invoice.paymentTerms && <p className="whitespace-pre-wrap">{invoice.paymentTerms}</p>}
            {invoice.notes && <p className="mt-1 whitespace-pre-wrap text-slate-500">{invoice.notes}</p>}
          </div>
        </footer>
      </div>
    </div>
  );
}
