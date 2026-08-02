'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/task';
import { useClients, Client } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';

interface ClientsListProps {
  tasks: Task[];
  onOpenClientTab: (clientName: string) => void;
  onClientCreated?: (client: Client) => void;
}

export default function ClientsList({ tasks, onOpenClientTab, onClientCreated }: ClientsListProps) {
  const { user } = useAuth();
  const { clients, loading, error, createClient, updateClient, deleteClient, refreshClients } = useClients();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState<'client' | 'agency'>('client');
  const [editClientName, setEditClientName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'projects' | 'recent'>('name');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'agency'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    if (typeof window === 'undefined') return 'card';
    return window.localStorage.getItem('clientsViewMode') === 'list' ? 'list' : 'card';
  });

  const handleSetViewMode = (mode: 'list' | 'card') => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('clientsViewMode', mode);
    } catch {}
  };

  // Which clients currently have a linked project that isn't marked Completed
  const clientsWithActiveProjects = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(task => {
      if (task.clientGroup && task.status !== 'Completed') {
        names.add(task.clientGroup);
      }
    });
    return names;
  }, [tasks]);

  // Number of real Projects linked to each client (by clientGroup match)
  const clientProjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach(task => {
      if (!task.clientGroup) return;
      counts.set(task.clientGroup, (counts.get(task.clientGroup) || 0) + 1);
    });
    return counts;
  }, [tasks]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply type filter (client vs agency)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(client => (client.type || 'client') === typeFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(client.tasks) && client.tasks.some(task =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.content.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    // Apply sorting - clients with an active (not-yet-completed) project always float to the top
    const sorted = [...filtered].sort((a, b) => {
      const aActive = clientsWithActiveProjects.has(a.name) ? 0 : 1;
      const bActive = clientsWithActiveProjects.has(b.name) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'projects':
          const aProjectCount = clientProjectCounts.get(a.name) || 0;
          const bProjectCount = clientProjectCounts.get(b.name) || 0;
          return bProjectCount - aProjectCount;
        case 'recent':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [clients, searchTerm, sortBy, typeFilter, clientsWithActiveProjects, clientProjectCounts]);

  const handleAddClient = async () => {
    const name = newClientName.trim();
    if (!name) {
      setFormError('Please enter a client name');
      return;
    }

    setFormError(null);
    const newClient = await createClient({ name, type: newClientType });

    if (newClient) {
      setNewClientName('');
      setNewClientType('client');
      setShowAddForm(false);
      // Notify parent component that a client was created
      onClientCreated?.(newClient);
      // Force refresh to ensure UI updates
      console.log('🔄 Refreshing clients after client creation');
      await refreshClients();
    } else if (error) {
      setFormError(error);
    }
  };

  const handleStartEdit = (client: Client) => {
    setEditClientName(client.name);
    setEditingClientId(client.id);
    setFormError(null);
  };

  const handleSaveEdit = async (clientId: string) => {
    const name = editClientName.trim();
    if (!name) {
      setFormError('Client name cannot be empty');
      return;
    }

    // Check if name already exists (excluding current client)
    const nameExists = clients.some(c => 
      c.id !== clientId && c.name.toLowerCase() === name.toLowerCase()
    );
    
    if (nameExists) {
      setFormError('A client with this name already exists');
      return;
    }

    setFormError(null);
    const success = await updateClient(clientId, { name });
    
    if (success) {
      setEditingClientId(null);
      setEditClientName('');
      await refreshClients();
    } else if (error) {
      setFormError(error);
    }
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setEditClientName('');
    setFormError(null);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (window.confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
      await deleteClient(clientId);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
          >
            + Add Client / Agency
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-3">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({clients.length})
          </button>
          <button
            onClick={() => setTypeFilter('client')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'client' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Clients ({clients.filter(c => (c.type || 'client') === 'client').length})
          </button>
          <button
            onClick={() => setTypeFilter('agency')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'agency' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Agencies ({clients.filter(c => c.type === 'agency').length})
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
            />
            <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'projects' | 'recent')}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 bg-white font-medium"
          >
            <option value="name">Name (A-Z)</option>
            <option value="projects">Most Projects</option>
            <option value="recent">Recently Updated</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0">
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List view"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => handleSetViewMode('card')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Card view"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v7H4v-7zm9 0h7v7h-7v-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Add Client Form */}
      {showAddForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Add New {newClientType === 'agency' ? 'Agency' : 'Client'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewClientType('client')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                    newClientType === 'client'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => setNewClientType('agency')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                    newClientType === 'agency'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Agency
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {newClientType === 'agency' ? 'Agency Name' : 'Client Name'} *
              </label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder={newClientType === 'agency' ? 'Enter agency name' : 'Enter client name'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                autoFocus
              />
            </div>
            {formError && (
              <p className="text-red-600 text-xs">{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddClient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              >
                Add {newClientType === 'agency' ? 'Agency' : 'Client'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewClientName('');
                  setNewClientType('client');
                  setFormError(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || typeFilter !== 'all' ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || typeFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Start by adding your first client to manage their information and notes.'
            }
          </p>
          {!searchTerm && typeFilter === 'all' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Add First Client
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'list'
            ? 'bg-white border border-gray-200 rounded-xl overflow-hidden'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
          <div className={viewMode === 'list' ? 'divide-y divide-gray-100' : 'contents'}>
            {filteredClients.map((client) => {
              // Count tasks with login information (URL, Username, Password in content)
              const loginTaskCount = Array.isArray(client.tasks)
                ? client.tasks.filter(task =>
                    task.content &&
                    task.content.includes('URL:') &&
                    task.content.includes('Username:') &&
                    task.content.includes('Password:')
                  ).length
                : 0;

              // Real Projects linked to this client (from the main Projects list)
              const projectCount = clientProjectCounts.get(client.name) || 0;

              // Total login count includes both loginDetails array and login tasks
              const loginCount = loginTaskCount + (Array.isArray(client.loginDetails) ? client.loginDetails.length : 0);

              const isEditing = editingClientId === client.id;
              const canEdit = user?.permissions?.canEditClients;
              const isActive = clientsWithActiveProjects.has(client.name);

              if (isEditing) {
                return (
                  <div
                    key={client.id}
                    className={viewMode === 'list' ? 'p-4 bg-blue-50' : 'p-4 bg-blue-50 border border-blue-200 rounded-xl'}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(client.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(client.id)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    </div>
                    {formError && (
                      <p className="text-red-600 text-xs mt-2">{formError}</p>
                    )}
                  </div>
                );
              }

              const nameBadges = (
                <>
                  {client.type === 'agency' && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold shrink-0">
                      Agency
                    </span>
                  )}
                  {isActive && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-semibold shrink-0">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Active
                    </span>
                  )}
                </>
              );

              const editDeleteButtons = canEdit && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(client);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit client name"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClient(client.id, client.name);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete client"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              );

              const key = `${client.id}-${projectCount}-${loginCount}-${client.updatedAt.getTime()}`;

              if (viewMode === 'card') {
                return (
                  <div
                    key={key}
                    onClick={() => onOpenClientTab(client.name)}
                    className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editDeleteButtons}
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">{client.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {nameBadges}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {projectCount} project{projectCount !== 1 ? 's' : ''} · {loginCount} login{loginCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Updated {new Date(client.updatedAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>

                  <button
                    onClick={() => onOpenClientTab(client.name)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{client.name}</h3>
                      {nameBadges}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {projectCount} project{projectCount !== 1 ? 's' : ''} · {loginCount} login{loginCount !== 1 ? 's' : ''} · Updated {new Date(client.updatedAt).toLocaleDateString('en-GB')}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editDeleteButtons}
                    </div>
                    <button
                      onClick={() => onOpenClientTab(client.name)}
                      className="p-1.5 text-gray-300 group-hover:text-gray-500 transition-colors"
                      title="View details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}