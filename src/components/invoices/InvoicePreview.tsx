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

export default function InvoicePreview({ invoice, totals }: InvoicePreviewProps) {
  return (
    <div className="mx-auto aspect-[210/297] w-full max-w-[794px] overflow-hidden bg-white text-slate-700 shadow-xl ring-1 ring-slate-200" role="region" aria-label="Live invoice preview">
      <div className="flex h-full flex-col p-[6%] text-[clamp(7px,1vw,12px)]">
        <header className="flex items-start justify-between border-b-2 border-blue-900 pb-[4%]">
          <div>
            <Image src="/metalogics-logo-full.svg" alt="Metalogics" width={274} height={56} className="mb-3 h-14 w-auto" priority unoptimized />
            <Address party={invoice.seller} />
          </div>
          <div className="text-right">
            <h1 className="text-[2.4em] font-bold tracking-tight text-blue-950">INVOICE</h1>
            <p className="mt-2 font-semibold text-slate-900">{invoice.invoiceNumber || 'Draft invoice'}</p>
            <p className="mt-1 capitalize text-slate-500">{invoice.status.replace('_', ' ')}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-[8%] py-[5%]">
          <div>
            <p className="mb-2 text-[0.8em] font-bold uppercase tracking-[0.18em] text-slate-400">Bill to</p>
            <Address party={invoice.customer} />
          </div>
          <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-1 text-right">
            <dt className="text-slate-500">Issue date</dt><dd className="font-medium text-slate-900">{invoice.issueDate}</dd>
            <dt className="text-slate-500">Due date</dt><dd className="font-medium text-slate-900">{invoice.dueDate}</dd>
          </dl>
        </section>

        <div className="min-h-0 flex-1">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-blue-950 text-left text-white">
                <th className="w-[63%] px-2 py-2 font-semibold">Description</th>
                <th className="w-[12%] px-2 py-2 text-right font-semibold">Qty</th>
                <th className="w-[25%] px-2 py-2 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {totals.lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-200 align-top">
                  <td className="break-words px-2 py-2 text-slate-900">{line.description || 'Untitled item'}</td>
                  <td className="px-2 py-2 text-right">{line.quantity}</td>
                  <td className="px-2 py-2 text-right font-medium">{formatMinor(line.unitPriceMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-10 w-[48%] min-w-[180px]">
            <InvoiceSummary totals={totals} compact />
          </div>
        </div>

        <footer className="mt-4 grid grid-cols-2 gap-6 border-t border-slate-200 pt-3 text-[0.9em]">
          <div>
            <p className="font-semibold text-slate-900">Payment details</p>
            <p>{invoice.bankDetails.accountName}</p>
            <p>{invoice.bankDetails.bankName}</p>
            {(invoice.bankDetails.sortCode || invoice.bankDetails.accountNumber) && <p>{invoice.bankDetails.sortCode} · {invoice.bankDetails.accountNumber}</p>}
          </div>
          <div>
            <p className="font-semibold text-slate-900">Terms & notes</p>
            <p className="whitespace-pre-wrap">{invoice.paymentTerms}</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-500">{invoice.notes}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
