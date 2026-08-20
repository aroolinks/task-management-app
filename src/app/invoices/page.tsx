import InvoiceArchive from '@/components/invoices/InvoiceArchive';
import AdminInvoiceGuard from '@/components/invoices/AdminInvoiceGuard';

export default function InvoicesPage() {
  return <AdminInvoiceGuard><InvoiceArchive /></AdminInvoiceGuard>;
}
