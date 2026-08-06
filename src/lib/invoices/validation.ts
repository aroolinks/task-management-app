import { z } from 'zod';

const safeNonNegativeInteger = z.number().int().nonnegative().safe();
const optionalText = z.string().trim().max(500).default('');

export const invoicePartySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  postcode: optionalText,
  country: z.string().trim().max(100).default('United Kingdom'),
  vatNumber: z.string().trim().max(50).default(''),
});

export const invoiceLineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().trim().min(1, 'Every item needs a description').max(500),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').safe(),
  unitPriceMinor: safeNonNegativeInteger,
  vatRateBasisPoints: z.number().int().min(0).max(10_000).safe(),
});

export const invoiceDraftSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required').max(50),
  status: z.enum(['draft', 'sent', 'paid', 'partially_paid', 'overdue']),
  issueDate: z.iso.date(),
  dueDate: z.iso.date(),
  currency: z.literal('GBP'),
  seller: invoicePartySchema,
  customer: invoicePartySchema,
  items: z.array(invoiceLineItemSchema).min(1, 'Add at least one invoice item').max(100),
  discount: z.discriminatedUnion('type', [
    z.object({ type: z.literal('none'), value: z.literal(0) }),
    z.object({ type: z.literal('percentage'), value: safeNonNegativeInteger.max(10_000) }),
    z.object({ type: z.literal('fixed'), value: safeNonNegativeInteger }),
  ]),
  amountPaidMinor: safeNonNegativeInteger,
  notes: z.string().trim().max(5_000),
  paymentTerms: z.string().trim().max(2_000),
  bankDetails: z.object({
    accountName: optionalText,
    bankName: optionalText,
    sortCode: z.string().trim().max(20),
    accountNumber: z.string().trim().max(34),
  }),
}).superRefine((invoice, context) => {
  if (invoice.dueDate < invoice.issueDate) {
    context.addIssue({ code: 'custom', path: ['dueDate'], message: 'Due date cannot be before issue date' });
  }
});

export type ValidatedInvoiceDraft = z.infer<typeof invoiceDraftSchema>;
