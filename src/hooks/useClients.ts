import { useState, useEffect, useCallback } from 'react';
import { IClient, IClientNote } from '@/models/Client';

export interface ClientNote {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  notes: ClientNote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientInput {
  name: string;
}

export interface NoteInput {
  title: string;
  content: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/clients', {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const formattedClients = data.data.map((client: IClient) => ({
          id: client._id,
          name: client.name,
          notes: Array.isArray(client.notes) 
            ? client.notes.map((note: IClientNote) => ({
                id: note._id || '',
                title: note.title,
                content: note.content,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt),
              }))
            : [], // Fallback to empty array if notes is not an array
          createdAt: new Date(client.createdAt),
          updatedAt: new Date(client.updatedAt),
        }));
        
        setClients(formattedClients);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(async (clientData: ClientInput): Promise<Client | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create client');
      }
      
      if (data.success && data.data) {
        const newClient: Client = {
          id: data.data._id,
          name: data.data.name,
          notes: Array.isArray(data.data.notes) 
            ? data.data.notes.map((note: IClientNote) => ({
                id: note._id || '',
                title: note.title,
                content: note.content,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt),
              }))
            : [], // Fallback to empty array for new clients
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
        return newClient;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err instanceof Error ? err.message : 'Failed to create client');
      return null;
    }
  }, []);

  const updateClient = useCallback(async (id: string, updates: Partial<ClientInput>): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update client');
      }
      
      if (data.success && data.data) {
        const updatedClient: Client = {
          id: data.data._id,
          name: data.data.name,
          notes: data.data.notes.map((note: IClientNote) => ({
            id: note._id || '',
            title: note.title,
            content: note.content,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          })),
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        setClients(prev => 
          prev.map(client => 
            client.id === id ? updatedClient : client
          ).sort((a, b) => a.name.localeCompare(b.name))
        );
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error updating client:', err);
      setError(err instanceof Error ? err.message : 'Failed to update client');
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete client');
      }
      
      if (data.success) {
        setClients(prev => prev.filter(client => client.id !== id));
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error deleting client:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete client');
      return false;
    }
  }, []);

  const addNote = useCallback(async (clientId: string, noteData: NoteInput): Promise<ClientNote | null> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add note');
      }
      
      if (data.success && data.data) {
        const newNote: ClientNote = {
          id: data.data._id,
          title: data.data.title,
          content: data.data.content,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        // Update the client in the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { ...client, notes: [...client.notes, newNote] }
              : client
          )
        );
        
        return newNote;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
      return null;
    }
  }, []);

  const updateNote = useCallback(async (clientId: string, noteId: string, updates: NoteInput): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update note');
      }
      
      if (data.success && data.data) {
        const updatedNote: ClientNote = {
          id: data.data._id,
          title: data.data.title,
          content: data.data.content,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        // Update the note in the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  notes: client.notes.map(note => 
                    note.id === noteId ? updatedNote : note
                  )
                }
              : client
          )
        );
        
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error updating note:', err);
      setError(err instanceof Error ? err.message : 'Failed to update note');
      return false;
    }
  }, []);

  const deleteNote = useCallback(async (clientId: string, noteId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }
      
      if (data.success) {
        // Remove the note from the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  notes: client.notes.filter(note => note.id !== noteId)
                }
              : client
          )
        );
        
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    addNote,
    updateNote,
    deleteNote,
    refreshClients: fetchClients,
  };
}