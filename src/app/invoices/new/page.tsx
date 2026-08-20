import type { Metadata } from 'next';
import InvoiceNewPage from '@/components/invoices/InvoiceNewPage';
import AdminInvoiceGuard from '@/components/invoices/AdminInvoiceGuard';

export const metadata: Metadata = {
  title: 'Create Invoice | Metalogics',
  description: 'Create and preview a professional UK VAT invoice.',
};

export default function NewInvoicePage() {
  return <AdminInvoiceGuard><InvoiceNewPage /></AdminInvoiceGuard>;
}
