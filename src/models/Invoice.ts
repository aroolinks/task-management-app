import mongoose from 'mongoose';
import type { InvoiceDraft, InvoiceTotals } from '@/types/invoice';

export interface IInvoice {
  _id: string;
  invoiceNumber: string;
  draft: InvoiceDraft;
  totals: InvoiceTotals;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new mongoose.Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    draft: { type: mongoose.Schema.Types.Mixed, required: true },
    totals: { type: mongoose.Schema.Types.Mixed, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: 'invoices' },
);

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);