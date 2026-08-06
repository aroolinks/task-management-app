'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import InvoiceForm from './InvoiceForm';

export default function InvoiceNewPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">Loading…</div>;
  if (!user) return <LoginForm />;
  if (user.role !== 'admin') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-600">Invoice creation is currently restricted to administrators.</div>;
  }

  return <InvoiceForm />;
}
