import type { ReactNode } from 'react';
import type { InvoiceParty } from '@/types/invoice';

interface InvoicePartyFieldsProps {
  idPrefix: string;
  title: string;
  party: InvoiceParty;
  onChange: (party: InvoiceParty) => void;
  action?: ReactNode;
}

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'mb-1 block text-xs font-medium text-slate-600';

export default function InvoicePartyFields({ idPrefix, title, party, onChange, action }: InvoicePartyFieldsProps) {
  const set = (field: keyof InvoiceParty, value: string) => onChange({ ...party, [field]: value });
  const id = (field: keyof InvoiceParty) => `${idPrefix}-${field}`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby={`${idPrefix}-heading`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${idPrefix}-heading`} className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={id('name')} className="sm:col-span-2"><span className={labelClass}>Name *</span><input id={id('name')} value={party.name} onChange={(event) => set('name', event.target.value)} className={fieldClass} required /></label>
        <label htmlFor={id('email')}><span className={labelClass}>Email</span><input id={id('email')} type="email" value={party.email} onChange={(event) => set('email', event.target.value)} className={fieldClass} /></label>
        <label htmlFor={id('vatNumber')}><span className={labelClass}>VAT number</span><input id={id('vatNumber')} value={party.vatNumber} onChange={(event) => set('vatNumber', event.target.value)} className={fieldClass} /></label>
        <label htmlFor={id('addressLine1')} className="sm:col-span-2"><span className={labelClass}>Address</span><input id={id('addressLine1')} value={party.addressLine1} onChange={(event) => set('addressLine1', event.target.value)} className={fieldClass} placeholder="Address line 1" /></label>
        <label htmlFor={id('addressLine2')} className="sm:col-span-2"><span className="sr-only">Address line 2</span><input id={id('addressLine2')} value={party.addressLine2} onChange={(event) => set('addressLine2', event.target.value)} className={fieldClass} placeholder="Address line 2" /></label>
        <label htmlFor={id('city')}><span className={labelClass}>Town or city</span><input id={id('city')} value={party.city} onChange={(event) => set('city', event.target.value)} className={fieldClass} /></label>
        <label htmlFor={id('postcode')}><span className={labelClass}>Postcode</span><input id={id('postcode')} value={party.postcode} onChange={(event) => set('postcode', event.target.value)} className={fieldClass} /></label>
      </div>
    </section>
  );
}
