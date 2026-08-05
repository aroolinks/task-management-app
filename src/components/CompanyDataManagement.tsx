'use client';

import { useState } from 'react';
import { useCompanyData, CompanyCredential } from '@/hooks/useCompanyData';
import { useCompanyDataCategories } from '@/contexts/CompanyDataCategoryContext';

const CATEGORY_COLOR_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-indigo-100 text-indigo-800',
  'bg-amber-100 text-amber-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
  'bg-rose-100 text-rose-800',
];

function getCategoryColor(category: string): string {
  if (category === 'Other') return 'bg-gray-100 text-gray-800';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
}

export default function CompanyDataManagement() {
  const { credentials, loading, error, createCredential, updateCredential, deleteCredential } = useCompanyData();
  const { companyDataCategoryNames } = useCompanyDataCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CompanyCredential | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const resetForm = () => {
    setTitle('');
    setCategory(companyDataCategoryNames[0] || 'Other');
    setUrl('');
    setUsername('');
    setPassword('');
    setNotes('');
    setFormError(null);
    setShowFormPassword(false);
    setEditingCredential(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!username.trim()) {
      setFormError('Username is required');
      return;
    }
    if (!password.trim()) {
      setFormError('Password is required');
      return;
    }

    const input = {
      title: title.trim(),
      category,
      url: url.trim(),
      username: username.trim(),
      password: password.trim(),
      notes: notes.trim(),
    };

    const success = editingCredential
      ? await updateCredential(editingCredential._id, input)
      : await createCredential(input);

    if (success) {
      setShowForm(false);
      resetForm();
    }
  };

  const handleEdit = (credential: CompanyCredential) => {
    setEditingCredential(credential);
    setTitle(credential.title);
    setCategory(credential.category);
    setUrl(credential.url || '');
    setUsername(credential.username);
    setPassword(credential.password);
    setNotes(credential.notes || '');
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (credential: CompanyCredential) => {
    if (window.confirm(`Are you sure you want to delete "${credential.title}"? This cannot be undone.`)) {
      await deleteCredential(credential._id);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const filteredCredentials = credentials.filter((credential) => {
    const matchesCategory = categoryFilter === 'all' || credential.category === categoryFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      credential.title.toLowerCase().includes(query) ||
      credential.username.toLowerCase().includes(query) ||
      (credential.url || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading company data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Company Data</h1>
            <p className="text-sm text-gray-500 mt-1">Store and manage the company&apos;s own login credentials</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
          >
            + Add Credential
          </button>
        </div>

        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-800">
            Sensitive credentials — visible to administrators only.
          </p>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, username, or URL..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {companyDataCategoryNames.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Credentials list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              All Credentials ({filteredCredentials.length})
            </h2>
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === 'card'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Grid view"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List view"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {filteredCredentials.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {credentials.length === 0 ? 'No company credentials yet' : 'No matches found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {credentials.length === 0
                ? 'Start by adding a company login, domain, or software credential.'
                : 'Try adjusting your search or category filter.'}
            </p>
            {credentials.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Add First Credential
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCredentials.map((credential) => {
              const isVisible = visiblePasswords.has(credential._id);
              return (
                <div key={credential._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 truncate">{credential.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium shrink-0 ${getCategoryColor(credential.category)}`}>
                      {credential.category}
                    </span>
                  </div>

                  {credential.url && (
                    <a
                      href={credential.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline flex items-center gap-1 mb-3 truncate"
                    >
                      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="truncate">{credential.url}</span>
                    </a>
                  )}

                  <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16 shrink-0">Username</span>
                      <span className="text-xs text-gray-900 font-mono truncate flex-1" title={credential.username}>
                        {credential.username}
                      </span>
                      <button
                        onClick={() => copyToClipboard(credential.username, `${credential._id}-user`)}
                        className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors shrink-0"
                      >
                        {copiedField === `${credential._id}-user` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16 shrink-0">Password</span>
                      <span className="text-xs text-gray-900 font-mono truncate flex-1">
                        {isVisible ? credential.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(credential._id)}
                        className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors shrink-0"
                      >
                        {isVisible ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(credential.password, `${credential._id}-pass`)}
                        className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors shrink-0"
                      >
                        {copiedField === `${credential._id}-pass` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    {credential.notes && (
                      <p className="text-xs text-gray-500 whitespace-pre-wrap">{credential.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-400 truncate">
                      {credential.createdBy && <span>Added by {credential.createdBy}</span>}
                      {credential.editedBy && credential.editedBy !== credential.createdBy && (
                        <span> • Edited by {credential.editedBy}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(credential)}
                        className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-xs border border-blue-200"
                        title="Edit credential"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(credential)}
                        className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-xs border border-red-200"
                        title="Delete credential"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCredentials.map((credential) => {
              const isVisible = visiblePasswords.has(credential._id);
              return (
                <div key={credential._id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">{credential.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getCategoryColor(credential.category)}`}>
                          {credential.category}
                        </span>
                        {credential.url && (
                          <a
                            href={credential.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 underline truncate max-w-xs"
                          >
                            {credential.url}
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">Username</span>
                          <span className="text-xs text-gray-900 font-mono truncate flex-1" title={credential.username}>
                            {credential.username}
                          </span>
                          <button
                            onClick={() => copyToClipboard(credential.username, `${credential._id}-user`)}
                            className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors shrink-0"
                          >
                            {copiedField === `${credential._id}-user` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">Password</span>
                          <span className="text-xs text-gray-900 font-mono truncate flex-1">
                            {isVisible ? credential.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(credential._id)}
                            className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors shrink-0"
                          >
                            {isVisible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => copyToClipboard(credential.password, `${credential._id}-pass`)}
                            className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors shrink-0"
                          >
                            {copiedField === `${credential._id}-pass` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {credential.notes && (
                        <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{credential.notes}</p>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        {credential.createdBy && <span>Added by {credential.createdBy}</span>}
                        {credential.editedBy && credential.editedBy !== credential.createdBy && (
                          <>
                            <span>•</span>
                            <span>Edited by {credential.editedBy}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(credential)}
                        className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-xs"
                        title="Edit credential"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(credential)}
                        className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-xs"
                        title="Delete credential"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              resetForm();
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCredential ? 'Edit Credential' : 'Add Company Credential'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Company Domain Registrar"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  {companyDataCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/login"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-16 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showFormPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes (e.g., 2FA recovery codes location)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white resize-none"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">{formError}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded font-medium transition-colors"
              >
                {editingCredential ? 'Update Credential' : 'Add Credential'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
