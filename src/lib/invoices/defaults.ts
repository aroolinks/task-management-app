import type { InvoiceBankDetails, InvoiceParty } from '@/types/invoice';

export interface InvoiceDefaults {
  seller: InvoiceParty;
  bankDetails: InvoiceBankDetails;
  paymentTerms: string;
  notes: string;
}

const STORAGE_KEY = 'invoice-defaults';

/** Fields that repeat across invoices (own business details, bank details, boilerplate terms/notes). */
export function loadInvoiceDefaults(): Partial<InvoiceDefaults> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveInvoiceDefaults(defaults: InvoiceDefaults): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // ignore write failures (e.g. private browsing storage limits)
  }
}
