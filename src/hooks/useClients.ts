import { useState, useEffect, useCallback } from 'react';
import { IClient, IClientNote } from '@/models/Client';

export interface ClientLoginDetail {
  id: string;
  website: string;
  url: string;
  username: string;
  password: string;
  createdBy?: string;
  editedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientNote {
  id: string;
  title: string;
  content: string;
  createdBy?: string;
  editedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  notes: ClientNote[];
  loginDetails: ClientLoginDetail[];
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

export interface LoginDetailInput {
  website: string;
  url: string;
  username: string;
  password: string;
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
        // If 403 (Forbidden), user doesn't have permission
        if (response.status === 403) {
          console.log('User does not have permission to view clients');
          setClients([]);
          setLoading(false);
          return;
        }
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
                createdBy: note.createdBy,
                editedBy: note.editedBy,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt),
              }))
            : [], // Fallback to empty array if notes is not an array
          loginDetails: Array.isArray(client.loginDetails) 
            ? client.loginDetails.map((login: any) => ({
                id: login._id || '',
                website: login.website,
                url: login.url,
                username: login.username,
                password: login.password,
                createdBy: login.createdBy,
                editedBy: login.editedBy,
                createdAt: new Date(login.createdAt),
                updatedAt: new Date(login.updatedAt),
              }))
            : [], // Fallback to empty array if loginDetails is not an array
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
                createdBy: note.createdBy,
                editedBy: note.editedBy,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt),
              }))
            : [], // Fallback to empty array for new clients
          loginDetails: Array.isArray(data.data.loginDetails) 
            ? data.data.loginDetails.map((login: any) => ({
                id: login._id || '',
                website: login.website,
                url: login.url,
                username: login.username,
                password: login.password,
                createdBy: login.createdBy,
                editedBy: login.editedBy,
                createdAt: new Date(login.createdAt),
                updatedAt: new Date(login.updatedAt),
              }))
            : [], // Fallback to empty array for new clients
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        console.log('👤 Creating new client:', newClient);
        setClients(prev => {
          const updated = [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name));
          console.log('👤 Updated clients state:', updated);
          return updated;
        });
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
            createdBy: note.createdBy,
            editedBy: note.editedBy,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          })),
          loginDetails: Array.isArray(data.data.loginDetails) 
            ? data.data.loginDetails.map((login: any) => ({
                id: login._id || '',
                website: login.website,
                url: login.url,
                username: login.username,
                password: login.password,
                createdBy: login.createdBy,
                editedBy: login.editedBy,
                createdAt: new Date(login.createdAt),
                updatedAt: new Date(login.updatedAt),
              }))
            : [], // Fallback to empty array
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
        console.log('📝 Adding note to client:', clientId, 'Note:', newNote);
        setClients(prev => {
          const updated = prev.map(client => 
            client.id === clientId 
              ? { ...client, notes: [...client.notes, newNote] }
              : client
          );
          console.log('📝 Updated clients state:', updated);
          return updated;
        });
        
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
      
      console.log('🗑️ deleteNote called with:', { clientId, noteId });
      const url = `/api/clients/${clientId}/notes/${noteId}`;
      console.log('🗑️ DELETE URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      console.log('🗑️ Response status:', response.status);
      
      if (!response.ok) {
        // Try to parse error message if available
        try {
          const data = await response.json();
          console.log('🗑️ Error data:', data);
          throw new Error(data.error || 'Failed to delete note');
        } catch (jsonError) {
          console.log('🗑️ JSON parse error:', jsonError);
          throw new Error('Failed to delete note');
        }
      }
      
      // Try to parse JSON response, but handle empty responses
      let data;
      try {
        data = await response.json();
      } catch {
        // If JSON parsing fails, assume success if status is ok
        data = { success: true };
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

  const addLoginDetail = useCallback(async (clientId: string, loginDetailData: LoginDetailInput): Promise<ClientLoginDetail | null> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/logins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginDetailData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add login detail');
      }
      
      if (data.success) {
        const newLoginDetail: ClientLoginDetail = {
          id: data.data._id,
          website: data.data.website,
          url: data.data.url,
          username: data.data.username,
          password: data.data.password,
          createdBy: data.data.createdBy,
          editedBy: data.data.editedBy,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        // Add the login detail to the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { ...client, loginDetails: [...client.loginDetails, newLoginDetail] }
              : client
          )
        );
        
        return newLoginDetail;
      }
      
      return null;
    } catch (err) {
      console.error('Error adding login detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to add login detail');
      return null;
    }
  }, []);

  const updateLoginDetail = useCallback(async (clientId: string, loginId: string, loginDetailData: LoginDetailInput): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/logins/${loginId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginDetailData),
      });
      
      if (!response.ok) {
        try {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update login detail');
        } catch {
          throw new Error('Failed to update login detail');
        }
      }
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = { success: true };
      }
      
      if (data.success) {
        const updatedLoginDetail: ClientLoginDetail = {
          id: loginId,
          website: loginDetailData.website,
          url: loginDetailData.url,
          username: loginDetailData.username,
          password: loginDetailData.password,
          createdBy: data.data?.createdBy,
          editedBy: data.data?.editedBy,
          createdAt: data.data ? new Date(data.data.createdAt) : new Date(),
          updatedAt: new Date(),
        };
        
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  loginDetails: client.loginDetails.map(login => 
                    login.id === loginId ? updatedLoginDetail : login
                  )
                }
              : client
          )
        );
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error updating login detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to update login detail');
      return false;
    }
  }, []);

  const deleteLoginDetail = useCallback(async (clientId: string, loginId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/logins/${loginId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        try {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete login detail');
        } catch {
          throw new Error('Failed to delete login detail');
        }
      }
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = { success: true };
      }
      
      if (data.success) {
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  loginDetails: client.loginDetails.filter(login => login.id !== loginId)
                }
              : client
          )
        );
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error deleting login detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete login detail');
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
    addLoginDetail,
    updateLoginDetail,
    deleteLoginDetail,
    refreshClients: fetchClients,
  };
}