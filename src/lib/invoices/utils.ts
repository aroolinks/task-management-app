import type { InvoiceBankDetails, InvoiceDraft, InvoiceLineItem, InvoiceParty, SavedBankAccount } from '@/types/invoice';
import type { InvoiceDefaults } from './defaults';

export function createInvoiceParty(name = ''): InvoiceParty {
  return {
    name,
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: '',
    vatNumber: '',
  };
}

const clearBankDetails: InvoiceBankDetails = {
  accountName: 'Metalogics Solutions Limited',
  bankName: 'Clear Bank',
  sortCode: '04-06-05',
  accountNumber: '31819556',
};

export function getSavedBankAccounts(defaults?: Partial<InvoiceDefaults> | null): SavedBankAccount[] {
  const savedAccounts = defaults?.bankAccounts ?? [];
  const hasClearBank = savedAccounts.some((account) => account.id === 'clear-bank');
  if (hasClearBank) return savedAccounts;

  const legacyDetails = defaults?.bankDetails;
  const accounts = [{ id: 'clear-bank', label: 'Clear Bank', details: clearBankDetails }];
  if (legacyDetails && Object.values(legacyDetails).some(Boolean) && legacyDetails.accountNumber !== clearBankDetails.accountNumber) {
    accounts.push({ id: 'legacy-bank', label: legacyDetails.bankName || 'Previous bank account', details: legacyDetails });
  }
  return [...accounts, ...savedAccounts];
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

export function createCompanyParty(): InvoiceParty {
  return {
    name: 'Metalogics',
    email: 'work@metalogics.io',
    addressLine1: '51 Lonwood Avenue',
    addressLine2: '',
    city: 'Slough',
    postcode: 'SL3 8GH',
    country: 'United Kingdom',
    vatNumber: '',
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
  const bankAccounts = getSavedBankAccounts(defaults);
  const selectedBankAccountId = defaults?.selectedBankAccountId ?? bankAccounts[0]?.id;
  const selectedBankAccount = bankAccounts.find((account) => account.id === selectedBankAccountId) ?? bankAccounts[0];
  return {
    invoiceNumber: `DRAFT-${issueDate.replaceAll('-', '')}`,
    issueDate,
    dueDate: localIsoDateAfterDays(30),
    currency: 'GBP',
    seller: createCompanyParty(),
    customer: createInvoiceParty(),
    items: [createInvoiceLineItem()],
    discount: { type: 'none', value: 0 },
    amountPaidMinor: 0,
    notes: defaults?.notes ?? '',
    paymentTerms: defaults?.paymentTerms ?? 'Payment is due within 30 days. Please use the invoice number as your payment reference.',
    bankDetails: selectedBankAccount?.details ?? { accountName: '', bankName: '', sortCode: '', accountNumber: '' },
  };
}
