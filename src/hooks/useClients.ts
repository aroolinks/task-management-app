import { useState, useEffect, useCallback } from 'react';
import { IClient, IClientTask, IClientLoginDetail } from '@/models/Client';

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

export interface ClientTask {
  id: string;
  title: string;
  content: string;
  createdBy?: string;
  editedBy?: string;
  assignedTo?: string;
  completed?: boolean;
  completedBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  tasks: ClientTask[];
  loginDetails: ClientLoginDetail[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientInput {
  name: string;
}

export interface TaskInput {
  title: string;
  content: string;
  assignedTo?: string;
  completed?: boolean;
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
        // If 401 (Unauthorized) or 403 (Forbidden), user doesn't have permission
        if (response.status === 401 || response.status === 403) {
          console.log('User is not authenticated or does not have permission to view clients');
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
          tasks: Array.isArray(client.tasks) 
            ? client.tasks.map((task: IClientTask) => ({
                id: task._id || '',
                title: task.title,
                content: task.content,
                createdBy: task.createdBy,
                editedBy: task.editedBy,
                assignedTo: task.assignedTo || undefined, // Ensure it's undefined if empty
                completed: task.completed || false,
                completedBy: task.completedBy,
                completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
                createdAt: new Date(task.createdAt),
                updatedAt: new Date(task.updatedAt),
              }))
            : [], // Fallback to empty array if tasks is not an array
          loginDetails: Array.isArray(client.loginDetails) 
            ? client.loginDetails.map((login: IClientLoginDetail) => ({
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
          tasks: Array.isArray(data.data.tasks) 
            ? data.data.tasks.map((task: IClientTask) => ({
                id: task._id || '',
                title: task.title,
                content: task.content,
                createdBy: task.createdBy,
                editedBy: task.editedBy,
                assignedTo: task.assignedTo || undefined, // Ensure it's undefined if empty
                completed: task.completed || false,
                completedBy: task.completedBy,
                completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
                createdAt: new Date(task.createdAt),
                updatedAt: new Date(task.updatedAt),
              }))
            : [], // Fallback to empty array for new clients
          loginDetails: Array.isArray(data.data.loginDetails) 
            ? data.data.loginDetails.map((login: IClientLoginDetail) => ({
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
        
        setClients(prev => {
          const updated = [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name));
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
          tasks: data.data.tasks.map((task: IClientTask) => ({
            id: task._id || '',
            title: task.title,
            content: task.content,
            createdBy: task.createdBy,
            editedBy: task.editedBy,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
          })),
          loginDetails: Array.isArray(data.data.loginDetails) 
            ? data.data.loginDetails.map((login: IClientLoginDetail) => ({
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

  const addTask = useCallback(async (clientId: string, taskData: TaskInput): Promise<ClientTask | null> => {
    try {
      setError(null);
      
      console.log('addTask API call:', { clientId, taskData });
      
      const response = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      const data = await response.json();
      console.log('addTask API response:', { status: response.status, data });
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add task');
      }
      
      if (data.success && data.data) {
        const newTask: ClientTask = {
          id: data.data._id,
          title: data.data.title,
          content: data.data.content,
          createdBy: data.data.createdBy,
          editedBy: data.data.editedBy,
          assignedTo: data.data.assignedTo || undefined,
          completed: data.data.completed || false,
          completedBy: data.data.completedBy,
          completedAt: data.data.completedAt ? new Date(data.data.completedAt) : undefined,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        console.log('Transformed task:', newTask);
        
        // Update the client in the local state
        setClients(prev => {
          const updated = prev.map(client => 
            client.id === clientId 
              ? { ...client, tasks: [...client.tasks, newTask] }
              : client
          );
          return updated;
        });
        
        return newTask;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error in addTask:', err);
      setError(err instanceof Error ? err.message : 'Failed to add task');
      return null;
    }
  }, []);

  const updateTask = useCallback(async (clientId: string, taskId: string, updates: TaskInput): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/notes/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task');
      }
      
      if (data.success && data.data) {
        const updatedTask: ClientTask = {
          id: data.data._id,
          title: data.data.title,
          content: data.data.content,
          createdBy: data.data.createdBy,
          editedBy: data.data.editedBy,
          assignedTo: data.data.assignedTo || undefined,
          completed: data.data.completed || false,
          completedBy: data.data.completedBy,
          completedAt: data.data.completedAt ? new Date(data.data.completedAt) : undefined,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        // Update the task in the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  tasks: client.tasks.map(task => 
                    task.id === taskId ? updatedTask : task
                  )
                }
              : client
          )
        );
        
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
      return false;
    }
  }, []);

  const toggleTaskCompletion = useCallback(async (clientId: string, taskId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/clients/${clientId}/notes/${taskId}/toggle-completion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle task completion');
      }
      
      if (data.success && data.data) {
        const updatedTask: ClientTask = {
          id: data.data._id,
          title: data.data.title,
          content: data.data.content,
          createdBy: data.data.createdBy,
          editedBy: data.data.editedBy,
          assignedTo: data.data.assignedTo || undefined,
          completed: data.data.completed || false,
          completedBy: data.data.completedBy,
          completedAt: data.data.completedAt ? new Date(data.data.completedAt) : undefined,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        // Update the task in the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  tasks: client.tasks.map(task => 
                    task.id === taskId ? updatedTask : task
                  )
                }
              : client
          )
        );
        
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle task completion');
      return false;
    }
  }, []);

  const deleteTask = useCallback(async (clientId: string, taskId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const url = `/api/clients/${clientId}/notes/${taskId}`;
      
      console.log('🗑️ Deleting task:', { url, clientId, taskId });
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      console.log('🗑️ Delete response status:', response.status);
      
      if (!response.ok) {
        // Try to parse error message if available
        try {
          const data = await response.json();
          console.error('🗑️ Delete error response:', data);
          throw new Error(data.error || `Failed to delete task (${response.status})`);
        } catch (jsonError) {
          console.error('🗑️ Delete failed, could not parse error:', jsonError);
          throw new Error(`Failed to delete task (${response.status})`);
        }
      }
      
      // Try to parse JSON response, but handle empty responses
      let data;
      try {
        data = await response.json();
        console.log('🗑️ Delete success response:', data);
      } catch {
        // If JSON parsing fails, assume success if status is ok
        console.log('🗑️ Delete succeeded (no JSON response)');
        data = { success: true };
      }
      
      if (data.success) {
        // Remove the task from the local state
        setClients(prev => 
          prev.map(client => 
            client.id === clientId 
              ? { 
                  ...client, 
                  tasks: client.tasks.filter(task => task.id !== taskId)
                }
              : client
          )
        );
        
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
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

  const refreshClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

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
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    addLoginDetail,
    updateLoginDetail,
    deleteLoginDetail,
    refreshClients,
  };
}