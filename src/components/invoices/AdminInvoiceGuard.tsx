'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';

export default function AdminInvoiceGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [loading, router, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Checking access…</div>;
  }

  if (!user) return <LoginForm />;

  if (user.role !== 'admin') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Redirecting…</div>;
  }

  return children;
}
