'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task } from '@/types/task';
import { useClients } from '@/contexts/ClientContext';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  notes: string;
  createdBy?: string;
}

interface IncomeItem {
  id: string;
  description: string;
  clientName: string;
  amount: number;
  category: string;
  date: Date;
  notes: string;
  createdBy?: string;
}

interface MonthlyExpensesProps {
  tasks: Task[];
}

const expenseCategories = ['Salaries', 'Software', 'Marketing', 'Rent', 'Utilities', 'Other'];
const incomeCategories = ['Client Payment', 'Deposit', 'Refund Received', 'Other'];

const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' })
);

const getToday = () => new Date().toISOString().split('T')[0];

export default function MonthlyExpenses({ tasks }: MonthlyExpensesProps) {
  const { clients } = useClients();

  const [activeSection, setActiveSection] = useState<'expenses' | 'income'>('expenses');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState(expenseCategories[0]);
  const [expDate, setExpDate] = useState(getToday());
  const [expNotes, setExpNotes] = useState('');
  const [expFormError, setExpFormError] = useState<string | null>(null);
  const [expSubmitting, setExpSubmitting] = useState(false);

  // Income form state
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);
  const [incDescription, setIncDescription] = useState('');
  const [incClientName, setIncClientName] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incCategory, setIncCategory] = useState(incomeCategories[0]);
  const [incDate, setIncDate] = useState(getToday());
  const [incNotes, setIncNotes] = useState('');
  const [incFormError, setIncFormError] = useState<string | null>(null);
  const [incSubmitting, setIncSubmitting] = useState(false);

  const [showValues, setShowValues] = useState(false);

  const fetchAll = useCallback(async (year: number) => {
    try {
      setLoading(true);
      const [expRes, incRes] = await Promise.all([
        fetch(`/api/expenses?year=${year}`, { cache: 'no-store' }),
        fetch(`/api/income?year=${year}`, { cache: 'no-store' }),
      ]);
      const expResult = await expRes.json();
      const incResult = await incRes.json();

      if (expResult.success && Array.isArray(expResult.data)) {
        setExpenses(expResult.data.map((e: { _id: string; description: string; amount: number; category: string; date: string; notes?: string; createdBy?: string }) => ({
          id: e._id,
          description: e.description,
          amount: e.amount,
          category: e.category,
          date: new Date(e.date),
          notes: e.notes || '',
          createdBy: e.createdBy,
        })));
      } else {
        throw new Error(expResult.error || 'Failed to fetch expenses');
      }

      if (incResult.success && Array.isArray(incResult.data)) {
        setIncome(incResult.data.map((i: { _id: string; description: string; clientName?: string; amount: number; category: string; date: string; notes?: string; createdBy?: string }) => ({
          id: i._id,
          description: i.description,
          clientName: i.clientName || '',
          amount: i.amount,
          category: i.category,
          date: new Date(i.date),
          notes: i.notes || '',
          createdBy: i.createdBy,
        })));
      } else {
        throw new Error(incResult.error || 'Failed to fetch income');
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching P&L data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(selectedYear);
  }, [selectedYear, fetchAll]);

  // Year-scoped datasets, used both for display and for the month tab counts
  const yearExpenses = useMemo(
    () => expenses.filter(e => e.date.getFullYear() === selectedYear),
    [expenses, selectedYear]
  );
  const yearIncome = useMemo(
    () => income.filter(i => i.date.getFullYear() === selectedYear),
    [income, selectedYear]
  );

  const activeYearData = activeSection === 'expenses' ? yearExpenses : yearIncome;

  const monthCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    activeYearData.forEach(item => { counts[item.date.getMonth()] += 1; });
    return counts;
  }, [activeYearData]);

  const monthExpenses = useMemo(() => {
    return yearExpenses
      .filter(e => selectedMonth === 'all' || e.date.getMonth() === selectedMonth)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [yearExpenses, selectedMonth]);

  const monthIncome = useMemo(() => {
    return yearIncome
      .filter(i => selectedMonth === 'all' || i.date.getMonth() === selectedMonth)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [yearIncome, selectedMonth]);

  const totalExpenses = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses]
  );

  const totalOtherIncome = useMemo(
    () => monthIncome.reduce((sum, i) => sum + i.amount, 0),
    [monthIncome]
  );

  const totalProjectRevenue = useMemo(() => {
    return tasks.reduce((sum, task) => {
      if (
        task.dueDate instanceof Date &&
        task.dueDate.getFullYear() === selectedYear &&
        (selectedMonth === 'all' || task.dueDate.getMonth() === selectedMonth)
      ) {
        return sum + (task.totalPrice || 0);
      }
      return sum;
    }, 0);
  }, [tasks, selectedYear, selectedMonth]);

  const totalRevenue = totalProjectRevenue + totalOtherIncome;
  const netProfit = totalRevenue - totalExpenses;

  // --- Expense form handlers ---

  const resetExpenseForm = () => {
    setExpDescription('');
    setExpAmount('');
    setExpCategory(expenseCategories[0]);
    setExpDate(getToday());
    setExpNotes('');
    setExpFormError(null);
    setEditingExpense(null);
    setShowExpenseForm(false);
  };

  const openAddExpenseForm = () => {
    resetExpenseForm();
    const month = selectedMonth === 'all' ? now.getMonth() : selectedMonth;
    setExpDate(new Date(selectedYear, month, Math.min(now.getDate(), 28)).toISOString().split('T')[0]);
    setShowExpenseForm(true);
  };

  const openEditExpenseForm = (expense: Expense) => {
    setEditingExpense(expense);
    setExpDescription(expense.description);
    setExpAmount(expense.amount.toString());
    setExpCategory(expense.category);
    setExpDate(expense.date.toISOString().split('T')[0]);
    setExpNotes(expense.notes);
    setExpFormError(null);
    setShowExpenseForm(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDescription = expDescription.trim();
    const parsedAmount = parseFloat(expAmount);

    if (!trimmedDescription) {
      setExpFormError('Description is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setExpFormError('Enter a valid amount');
      return;
    }
    if (!expDate) {
      setExpFormError('Date is required');
      return;
    }

    setExpSubmitting(true);
    setExpFormError(null);

    try {
      const payload = {
        description: trimmedDescription,
        amount: parsedAmount,
        category: expCategory,
        date: expDate,
        notes: expNotes.trim(),
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

      resetExpenseForm();
      const targetDate = new Date(expDate);
      setSelectedYear(targetDate.getFullYear());
      setSelectedMonth(targetDate.getMonth());
      await fetchAll(targetDate.getFullYear());
    } catch (err) {
      setExpFormError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
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

  // --- Income form handlers ---

  const resetIncomeForm = () => {
    setIncDescription('');
    setIncClientName('');
    setIncAmount('');
    setIncCategory(incomeCategories[0]);
    setIncDate(getToday());
    setIncNotes('');
    setIncFormError(null);
    setEditingIncome(null);
    setShowIncomeForm(false);
  };

  const openAddIncomeForm = () => {
    resetIncomeForm();
    const month = selectedMonth === 'all' ? now.getMonth() : selectedMonth;
    setIncDate(new Date(selectedYear, month, Math.min(now.getDate(), 28)).toISOString().split('T')[0]);
    setShowIncomeForm(true);
  };

  const openEditIncomeForm = (item: IncomeItem) => {
    setEditingIncome(item);
    setIncDescription(item.description);
    setIncClientName(item.clientName);
    setIncAmount(item.amount.toString());
    setIncCategory(item.category);
    setIncDate(item.date.toISOString().split('T')[0]);
    setIncNotes(item.notes);
    setIncFormError(null);
    setShowIncomeForm(true);
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDescription = incDescription.trim();
    const parsedAmount = parseFloat(incAmount);

    if (!trimmedDescription) {
      setIncFormError('Description is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setIncFormError('Enter a valid amount');
      return;
    }
    if (!incDate) {
      setIncFormError('Date is required');
      return;
    }

    setIncSubmitting(true);
    setIncFormError(null);

    try {
      const payload = {
        description: trimmedDescription,
        clientName: incClientName.trim(),
        amount: parsedAmount,
        category: incCategory,
        date: incDate,
        notes: incNotes.trim(),
      };

      const response = editingIncome
        ? await fetch(`/api/income/${editingIncome.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/income', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save payment');
      }

      resetIncomeForm();
      const targetDate = new Date(incDate);
      setSelectedYear(targetDate.getFullYear());
      setSelectedMonth(targetDate.getMonth());
      await fetchAll(targetDate.getFullYear());
    } catch (err) {
      setIncFormError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setIncSubmitting(false);
    }
  };

  const handleDeleteIncome = async (item: IncomeItem) => {
    if (!window.confirm(`Delete payment "${item.description}"?`)) return;
    try {
      const response = await fetch(`/api/income/${item.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete payment');
      }
      setIncome(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  };

  const formatCurrency = (value: number) => `£${value.toFixed(2)}`;
  const display = (value: number) => (showValues ? formatCurrency(value) : '••••');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Monthly Exp</h2>
          <p className="text-gray-600 mt-1">Track expenses and miscellaneous client payments to see a simple P&amp;L</p>
        </div>
        <div className="flex items-center gap-2">
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
          {activeSection === 'expenses' ? (
            <button
              onClick={openAddExpenseForm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              + Add Expense
            </button>
          ) : (
            <button
              onClick={openAddIncomeForm}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors"
            >
              + Add Payment
            </button>
          )}
        </div>
      </div>

      {/* Month tabs */}
      <div className="flex items-center gap-1 overflow-x-auto mb-6 pb-1">
        <button
          onClick={() => setSelectedMonth('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
            selectedMonth === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          All
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${selectedMonth === 'all' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-600'}`}>
            {activeYearData.length}
          </span>
        </button>
        {monthNames.map((name, i) => (
          <button
            key={name}
            onClick={() => setSelectedMonth(i)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              selectedMonth === i
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {name.slice(0, 3)}
            <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${selectedMonth === i ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-600'}`}>
              {monthCounts[i]}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Income (Total Earning)</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{display(totalRevenue)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {showValues
              ? `Projects ${formatCurrency(totalProjectRevenue)} · Other ${formatCurrency(totalOtherIncome)}`
              : 'Projects •••• · Other ••••'}
          </p>
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

      {/* Section tabs */}
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 mb-4">
        <button
          onClick={() => setActiveSection('expenses')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'expenses' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveSection('income')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'income' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Other Income
        </button>
      </div>

      {/* Add/Edit Expense Form */}
      {showExpenseForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) resetExpenseForm(); }}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
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
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
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
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {expenseCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              {expFormError && <p className="text-red-600 text-sm">{expFormError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={expSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-sm font-medium transition-colors"
                >
                  {expSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
                <button
                  type="button"
                  onClick={resetExpenseForm}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Income Form */}
      {showIncomeForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) resetIncomeForm(); }}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingIncome ? 'Edit Payment' : 'Add Received Payment'}
            </h3>
            <form onSubmit={handleIncomeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={incDescription}
                  onChange={(e) => setIncDescription(e.target.value)}
                  placeholder="e.g., Extra design work"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <input
                  type="text"
                  list="income-client-options"
                  value={incClientName}
                  onChange={(e) => setIncClientName(e.target.value)}
                  placeholder="e.g., Acme Ltd"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                />
                <datalist id="income-client-options">
                  {clients.map(client => (
                    <option key={client.id} value={client.name} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    value={incAmount}
                    onChange={(e) => setIncAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={incDate}
                    onChange={(e) => setIncDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                >
                  {incomeCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={incNotes}
                  onChange={(e) => setIncNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                />
              </div>

              {incFormError && <p className="text-red-600 text-sm">{incFormError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={incSubmitting}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded text-sm font-medium transition-colors"
                >
                  {incSubmitting ? 'Saving...' : editingIncome ? 'Update Payment' : 'Add Payment'}
                </button>
                <button
                  type="button"
                  onClick={resetIncomeForm}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedMonth === 'all'
              ? `All ${selectedYear} ${activeSection === 'expenses' ? 'Expenses' : 'Payments'}`
              : `${monthNames[selectedMonth]} ${selectedYear} ${activeSection === 'expenses' ? 'Expenses' : 'Payments'}`}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : activeSection === 'expenses' ? (
          monthExpenses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {selectedMonth === 'all' ? `No expenses recorded for ${selectedYear} yet.` : 'No expenses recorded for this month yet.'}
            </div>
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
                            onClick={() => openEditExpenseForm(expense)}
                            className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense)}
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
          )
        ) : monthIncome.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {selectedMonth === 'all' ? `No payments recorded for ${selectedYear} yet.` : 'No payments recorded for this month yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthIncome.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900 font-medium">{item.description}</td>
                    <td className="px-6 py-3 text-gray-600">{item.clientName || '-'}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded">{item.category}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{item.date.toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-gray-900 font-semibold">{showValues ? formatCurrency(item.amount) : '••••'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditIncomeForm(item)}
                          className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteIncome(item)}
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
