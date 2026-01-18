'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/task';
import { useClients, Client } from '@/contexts/ClientContext';

interface ClientsListProps {
  tasks: Task[];
  onOpenClientTab: (clientName: string) => void;
  onClientCreated?: (client: Client) => void;
}

export default function ClientsList({ tasks, onOpenClientTab, onClientCreated }: ClientsListProps) {
  const { clients, loading, error, createClient, updateClient, deleteClient, refreshClients } = useClients();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(client.tasks) && client.tasks.some(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.content.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }, [clients, searchTerm]);

  // Get task counts for each client
  const clientTaskCounts = useMemo(() => {
    const counts: { [clientName: string]: number } = {};
    tasks.forEach(task => {
      if (task.clientName) {
        counts[task.clientName] = (counts[task.clientName] || 0) + 1;
      }
    });
    return counts;
  }, [tasks]);

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

  const handleEditClient = async (client: Client) => {
    setEditClientName(client.name);
    setShowEditForm(client.id);
    setFormError(null);
  };

  const handleUpdateClient = async (clientId: string) => {
    const name = editClientName.trim();
    if (!name) {
      setFormError('Please enter a client name');
      return;
    }

    setFormError(null);
    const success = await updateClient(clientId, { name });
    
    if (success) {
      setShowEditForm(null);
      setEditClientName('');
    } else if (error) {
      setFormError(error);
    }
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
            <p className="text-gray-600 mt-1">Manage clients and their important information</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Add Client
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Add Client Form */}
      {showAddForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Client</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Enter client name"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                autoFocus
              />
            </div>
            {formError && (
              <p className="text-red-600 text-sm">{formError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleAddClient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Add Client
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewClientName('');
                  setFormError(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
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
            // Count regular tasks (non-login tasks)
            const regularTaskCount = Array.isArray(client.tasks) 
              ? client.tasks.filter(task => 
                  !(task.content.includes('URL: ') && 
                    task.content.includes('Username: ') && 
                    task.content.includes('Password: '))
                ).length 
              : 0;
            
            const isEditing = showEditForm === client.id;
            
            // Count login details (tasks that contain login information)
            const loginCount = Array.isArray(client.tasks) 
              ? client.tasks.filter(task => 
                  task.content.includes('URL: ') && 
                  task.content.includes('Username: ') && 
                  task.content.includes('Password: ')
                ).length 
              : 0;
            
            return (
              <div key={`${client.id}-${regularTaskCount}-${loginCount}-${client.updatedAt.getTime()}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {isEditing ? (
                  /* Edit Form */
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Edit Client</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Client Name *
                        </label>
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                        />
                      </div>
                      {formError && (
                        <p className="text-red-600 text-xs">{formError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateClient(client.id)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowEditForm(null);
                            setEditClientName('');
                            setFormError(null);
                          }}
                          className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Client Display */
                  <div className="flex flex-col h-full">
                    {/* Client Header */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-4 border-b border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1 pr-2">{client.name}</h2>
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-white text-blue-800 rounded-full border border-blue-200 font-medium">
                          {regularTaskCount} task{regularTaskCount !== 1 ? 's' : ''}
                        </span>
                        {loginCount > 0 && (
                          <span className="px-2 py-1 text-xs bg-white text-green-800 rounded-full border border-green-200 font-medium">
                            {loginCount} login{loginCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Client Info Preview */}
                    <div className="px-4 py-3 flex-1 bg-white">
                      <div className="space-y-3">
                        {/* Tasks Info */}
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">Tasks</span>
                          </div>
                          <span className="text-sm font-bold text-blue-600">{regularTaskCount}</span>
                        </div>

                        {/* Web Logins Info */}
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6c-3 0-5.197-1.756-6-4M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">Web Logins</span>
                          </div>
                          <span className="text-sm font-bold text-green-600">{loginCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={() => onOpenClientTab(client.name)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Open
                      </button>
                      <button
                        onClick={() => handleEditClient(client)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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