import type { Metadata } from 'next';
import InvoiceNewPage from '@/components/invoices/InvoiceNewPage';

export const metadata: Metadata = {
  title: 'Create Invoice | Metalogics',
  description: 'Create and preview a professional UK VAT invoice.',
};

export default function NewInvoicePage() {
  return <InvoiceNewPage />;
}
