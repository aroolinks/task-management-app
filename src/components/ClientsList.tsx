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

export default function ClientsList({ tasks: _tasks, onOpenClientTab, onClientCreated }: ClientsListProps) {
  const { user } = useAuth();
  const { clients, loading, error, createClient, updateClient, deleteClient, refreshClients } = useClients();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'recent'>('name');

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = clients;
    
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
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'tasks':
          const aTaskCount = Array.isArray(a.tasks) ? a.tasks.length : 0;
          const bTaskCount = Array.isArray(b.tasks) ? b.tasks.length : 0;
          return bTaskCount - aTaskCount;
        case 'recent':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [clients, searchTerm, sortBy]);

  const handleAddClient = async () => {
    const name = newClientName.trim();
    if (!name) {
      setFormError('Please enter a client name');
      return;
    }

    setFormError(null);
    const newClient = await createClient({ name });
    
    if (newClient) {
      setNewClientName('');
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
            + Add Client
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
            onChange={(e) => setSortBy(e.target.value as 'name' | 'tasks' | 'recent')}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 bg-white font-medium"
          >
            <option value="name">Name (A-Z)</option>
            <option value="tasks">Most Tasks</option>
            <option value="recent">Recently Updated</option>
          </select>
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
          <h3 className="text-base font-semibold text-gray-900 mb-3">Add New Client</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Enter client name"
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
                Add Client
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewClientName('');
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
            {searchTerm ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Start by adding your first client to manage their information and notes.'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Add First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            
            // Count regular tasks (without login info) + loginDetails array
            const regularTaskCount = Array.isArray(client.tasks) 
              ? client.tasks.filter(task => 
                  !(task.content && 
                    task.content.includes('URL:') && 
                    task.content.includes('Username:') && 
                    task.content.includes('Password:'))
                ).length 
              : 0;
            
            // Total login count includes both loginDetails array and login tasks
            const loginCount = loginTaskCount + (Array.isArray(client.loginDetails) ? client.loginDetails.length : 0);
            
            const isEditing = editingClientId === client.id;
            const canEdit = user?.permissions?.canEditClients;
            
            return (
              <div key={`${client.id}-${regularTaskCount}-${loginCount}-${client.updatedAt.getTime()}`} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                {isEditing ? (
                  /* Inline Edit Form */
                  <div className="p-4 bg-blue-50 border-2 border-blue-500">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Client Name *
                        </label>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">Press Enter to save, Esc to cancel</p>
                      </div>
                      {formError && (
                        <p className="text-red-600 text-xs">{formError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(client.id)}
                          className="flex-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Client Display - Simple Design */
                  <div className="overflow-hidden">
                    {/* Client Header with Colored Background */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-3.5 py-2.5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h2 className="text-base font-bold text-gray-900">{client.name}</h2>
                        </div>
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Stats Pills */}
                      <div className="flex items-center gap-1.5">
                        <div className="px-2.5 py-0.5 bg-white border border-blue-200 rounded-full">
                          <span className="text-xs font-semibold text-blue-600">{regularTaskCount} task{regularTaskCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-white border border-green-200 rounded-full">
                          <span className="text-xs font-semibold text-green-600">{loginCount} login{loginCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section with Buttons */}
                    <div className="p-3.5 bg-white">
                      <p className="text-xs text-gray-500 mb-2">
                        Updated {new Date(client.updatedAt).toLocaleDateString('en-GB')}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenClientTab(client.name)}
                          className="flex-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleStartEdit(client)}
                              className="p-2 bg-gray-700 hover:bg-gray-800 text-white rounded-2xl transition-all active:scale-[0.95]"
                              title="Edit client name"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id, client.name)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all active:scale-[0.95]"
                              title="Delete client"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}