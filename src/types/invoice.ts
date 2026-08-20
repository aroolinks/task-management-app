export type MinorUnit = number;

export type InvoiceDiscountType = 'none' | 'percentage' | 'fixed';

export interface InvoiceParty {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
  vatNumber: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceMinor: MinorUnit;
  vatRateBasisPoints: number;
}

export interface InvoiceDiscount {
  type: InvoiceDiscountType;
  /** Percentage in basis points (1% = 100), or a fixed amount in minor units. */
  value: number;
}

export interface InvoiceBankDetails {
  accountName: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
}

export interface SavedBankAccount {
  id: string;
  label: string;
  details: InvoiceBankDetails;
}

export interface InvoiceDraft {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: 'GBP';
  seller: InvoiceParty;
  customer: InvoiceParty;
  items: InvoiceLineItem[];
  discount: InvoiceDiscount;
  amountPaidMinor: MinorUnit;
  notes: string;
  paymentTerms: string;
  bankDetails: InvoiceBankDetails;
}

export interface CalculatedInvoiceLine extends InvoiceLineItem {
  netMinor: MinorUnit;
  vatMinor: MinorUnit;
  grossMinor: MinorUnit;
}

export interface InvoiceTotals {
  lines: CalculatedInvoiceLine[];
  subtotalMinor: MinorUnit;
  discountMinor: MinorUnit;
  netMinor: MinorUnit;
  vatMinor: MinorUnit;
  totalMinor: MinorUnit;
  amountPaidMinor: MinorUnit;
  amountDueMinor: MinorUnit;
}
