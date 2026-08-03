'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task } from '@/types/task';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  notes: string;
  createdBy?: string;
}

interface MonthlyExpensesProps {
  tasks: Task[];
}

const categories = ['Salaries', 'Software', 'Marketing', 'Rent', 'Utilities', 'Other'];

const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' })
);

const getToday = () => new Date().toISOString().split('T')[0];

export default function MonthlyExpenses({ tasks }: MonthlyExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState(getToday());
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(false);

  const fetchExpenses = useCallback(async (year: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/expenses?year=${year}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setExpenses(result.data.map((e: { _id: string; description: string; amount: number; category: string; date: string; notes?: string; createdBy?: string }) => ({
          id: e._id,
          description: e.description,
          amount: e.amount,
          category: e.category,
          date: new Date(e.date),
          notes: e.notes || '',
          createdBy: e.createdBy,
        })));
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses(selectedYear);
  }, [selectedYear, fetchExpenses]);

  const monthExpenses = useMemo(() => {
    return expenses
      .filter(e => e.date.getFullYear() === selectedYear && e.date.getMonth() === selectedMonth)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses, selectedYear, selectedMonth]);

  const totalExpenses = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses]
  );

  const totalRevenue = useMemo(() => {
    return tasks.reduce((sum, task) => {
      if (
        task.dueDate instanceof Date &&
        task.dueDate.getFullYear() === selectedYear &&
        task.dueDate.getMonth() === selectedMonth
      ) {
        return sum + (task.totalPrice || 0);
      }
      return sum;
    }, 0);
  }, [tasks, selectedYear, selectedMonth]);

  const netProfit = totalRevenue - totalExpenses;

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory(categories[0]);
    setDate(getToday());
    setNotes('');
    setFormError(null);
    setEditingExpense(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setDate(new Date(selectedYear, selectedMonth, Math.min(now.getDate(), 28)).toISOString().split('T')[0]);
    setShowForm(true);
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setDate(expense.date.toISOString().split('T')[0]);
    setNotes(expense.notes);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDescription = description.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedDescription) {
      setFormError('Description is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setFormError('Enter a valid amount');
      return;
    }
    if (!date) {
      setFormError('Date is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        description: trimmedDescription,
        amount: parsedAmount,
        category,
        date,
        notes: notes.trim(),
      };

      const response = editingExpense
        ? await fetch(`/api/expenses/${editingExpense.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save expense');
      }

      resetForm();
      const targetDate = new Date(date);
      setSelectedYear(targetDate.getFullYear());
      setSelectedMonth(targetDate.getMonth());
      await fetchExpenses(targetDate.getFullYear());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return;
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete expense');
      }
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  const formatCurrency = (value: number) => `£${value.toFixed(2)}`;
  const display = (value: number) => (showValues ? formatCurrency(value) : '••••');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Monthly Exp</h2>
          <p className="text-gray-600 mt-1">Track business expenses and see a simple monthly P&amp;L</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthNames.map((name, i) => (
              <option key={name} value={i}>{name}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => setShowValues(!showValues)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
            title={showValues ? 'Hide amounts' : 'Show amounts'}
          >
            {showValues ? 'Hide' : 'Show'} amounts
          </button>
          <button
            onClick={openAddForm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Revenue</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{display(totalRevenue)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Expenses</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{display(totalExpenses)}</p>
        </div>
        <div className={`rounded-lg border p-4 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Net Profit</p>
          <p className={`mt-1 text-xl font-semibold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {showValues ? `${netProfit >= 0 ? '' : '-'}${formatCurrency(Math.abs(netProfit))}` : '••••'}
          </p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Office rent"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              {formError && <p className="text-red-600 text-sm">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-sm font-medium transition-colors"
                >
                  {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {monthNames[selectedMonth]} {selectedYear} Expenses
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading expenses...</div>
        ) : monthExpenses.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No expenses recorded for this month yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900 font-medium">{expense.description}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{expense.category}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{expense.date.toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-gray-900 font-semibold">{showValues ? formatCurrency(expense.amount) : '••••'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(expense)}
                          className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
