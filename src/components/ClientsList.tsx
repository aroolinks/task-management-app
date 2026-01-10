'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/task';
import { useClients, Client } from '@/hooks/useClients';

interface ClientsListProps {
  tasks: Task[];
  onOpenClientTab: (clientName: string) => void;
  onClientCreated?: (client: Client) => void;
}

export default function ClientsList({ tasks, onOpenClientTab, onClientCreated }: ClientsListProps) {
  const { clients, loading, error, createClient, updateClient, deleteClient } = useClients();
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
      (Array.isArray(client.notes) && client.notes.some(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const taskCount = clientTaskCounts[client.name] || 0;
            const isEditing = showEditForm === client.id;
            
            return (
              <div key={client.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {isEditing ? (
                  /* Edit Form */
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Client</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client Name *
                        </label>
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      {formError && (
                        <p className="text-red-600 text-sm">{formError}</p>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleUpdateClient(client.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setShowEditForm(null);
                            setEditClientName('');
                            setFormError(null);
                          }}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Client Display */
                  <>
                    {/* Client Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-semibold text-gray-900">{client.name}</h2>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {taskCount} task{taskCount !== 1 ? 's' : ''}
                            </span>
                            {(Array.isArray(client.notes) && client.notes.length > 0) && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                {client.notes.length} note{client.notes.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenClientTab(client.name)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Open Tab
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Client Notes Preview */}
                    <div className="px-6 py-4">
                      {(Array.isArray(client.notes) && client.notes.length > 0) ? (
                        <div className="space-y-3">
                          {client.notes.slice(0, 2).map((note) => (
                            <div key={note.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-900">{note.title}</h4>
                                <span className="text-xs text-gray-500">
                                  {formatDate(note.updatedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 font-mono leading-relaxed">
                                {note.content.length > 100 
                                  ? `${note.content.substring(0, 100)}...` 
                                  : note.content
                                }
                              </p>
                            </div>
                          ))}
                          {client.notes.length > 2 && (
                            <p className="text-sm text-gray-500 text-center">
                              +{client.notes.length - 2} more note{client.notes.length - 2 !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-8 h-8 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm">No notes for this client yet</p>
                          <button
                            onClick={() => onOpenClientTab(client.name)}
                            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Add notes
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}