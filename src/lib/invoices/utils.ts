import type { InvoiceDraft, InvoiceLineItem, InvoiceParty } from '@/types/invoice';
import type { InvoiceDefaults } from './defaults';

export function createInvoiceParty(name = ''): InvoiceParty {
  return {
    name,
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    vatNumber: '',
  };
}

export function createInvoiceLineItem(): InvoiceLineItem {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `item-${Date.now()}`,
    description: '',
    quantity: 1,
    unitPriceMinor: 0,
    vatRateBasisPoints: 0,
  };
}

function localIsoDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createInvoiceDraft(defaults?: Partial<InvoiceDefaults> | null): InvoiceDraft {
  const issueDate = localIsoDateAfterDays(0);
  return {
    invoiceNumber: `DRAFT-${issueDate.replaceAll('-', '')}`,
    status: 'draft',
    issueDate,
    dueDate: localIsoDateAfterDays(30),
    currency: 'GBP',
    seller: defaults?.seller ?? createInvoiceParty('Metalogics'),
    customer: createInvoiceParty(),
    items: [createInvoiceLineItem()],
    discount: { type: 'none', value: 0 },
    amountPaidMinor: 0,
    notes: defaults?.notes ?? '',
    paymentTerms: defaults?.paymentTerms ?? 'Payment is due within 30 days. Please use the invoice number as your payment reference.',
    bankDetails: defaults?.bankDetails ?? { accountName: '', bankName: '', sortCode: '', accountNumber: '' },
  };
}
