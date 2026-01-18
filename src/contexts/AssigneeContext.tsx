'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AssigneeContextType {
  assignees: string[];
  loading: boolean;
  error: string | null;
  addAssignee: (assignee: string) => void;
  removeAssignee: (assignee: string) => void;
  refreshAssignees: () => void;
}

const AssigneeContext = createContext<AssigneeContextType | undefined>(undefined);

export function AssigneeProvider({ children }: { children: React.ReactNode }) {
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const result = await response.json();
      if (result.success) {
        // Extract usernames from users for assignment dropdown
        const usernames = result.users.map((user: { username: string }) => user.username);
        setAssignees(usernames || []);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users for assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      
      // No fallback - users must be created through the user management interface
      setAssignees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addAssignee = useCallback(async (newAssignee: string) => {
    const trimmed = newAssignee.trim();
    if (!trimmed || assignees.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    // Immediately update local state for better UX
    setAssignees(prev => [...prev, trimmed].sort((a, b) => 
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    ));

    // Persist to database by creating a new user
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: trimmed,
          email: `${trimmed.toLowerCase()}@company.com`,
          password: 'defaultpassword123',
          role: 'team_member',
          permissions: {
            canViewTasks: true,
            canEditTasks: true,
            canViewClients: true,
            canEditClients: true,
            canManageUsers: false
          }
        })
      });

      if (!response.ok) {
        // If API call fails, revert the local state
        setAssignees(prev => prev.filter(a => a !== trimmed));
        const result = await response.json();
        console.error('Failed to add user:', result.error);
      }
    } catch (error) {
      // If API call fails, revert the local state
      setAssignees(prev => prev.filter(a => a !== trimmed));
      console.error('Error adding user:', error);
    }
  }, [assignees]);

  const removeAssignee = useCallback(async (assigneeToRemove: string) => {
    console.log('🗑️ Starting removal process for:', assigneeToRemove);
    
    // Immediately update local state for better UX
    setAssignees(prev => prev.filter(a => a !== assigneeToRemove));

    // Persist to database by deleting the user
    try {
      console.log('🌐 Making DELETE request to API...');
      const response = await fetch(`/api/assignees?name=${encodeURIComponent(assigneeToRemove)}`, {
        method: 'DELETE'
      });

      console.log('📡 API Response status:', response.status);
      const result = await response.json();
      console.log('📡 API Response data:', result);

      if (!response.ok) {
        // If API call fails, revert the local state
        console.error('❌ Failed to remove user:', result.error);
        setAssignees(prev => [...prev, assigneeToRemove].sort((a, b) => 
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        ));
      } else {
        console.log('✅ Successfully removed user from database');
      }
    } catch (error) {
      // If API call fails, revert the local state
      console.error('❌ Error removing user:', error);
      setAssignees(prev => [...prev, assigneeToRemove].sort((a, b) => 
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ));
    }
  }, []);

  const refreshAssignees = useCallback(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  const value = {
    assignees,
    loading,
    error,
    addAssignee,
    removeAssignee,
    refreshAssignees
  };

  return (
    <AssigneeContext.Provider value={value}>
      {children}
    </AssigneeContext.Provider>
  );
}

export function useAssignees() {
  const context = useContext(AssigneeContext);
  if (context === undefined) {
    throw new Error('useAssignees must be used within an AssigneeProvider');
  }
  return context;
}