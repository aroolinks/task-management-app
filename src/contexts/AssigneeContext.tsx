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
      const response = await fetch('/api/assignees', { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch assignees');
      }
      
      const result = await response.json();
      if (result.success) {
        setAssignees(result.data || []);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch assignees');
      }
    } catch (err) {
      console.error('Error fetching assignees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignees');
      
      // Fallback to default assignees if API fails
      setAssignees(['Haroon', 'Sameed', 'Bilal', 'Abubakar', 'Awais']);
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

    // Persist to database
    try {
      const response = await fetch('/api/assignees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });

      if (!response.ok) {
        // If API call fails, revert the local state
        setAssignees(prev => prev.filter(a => a !== trimmed));
        const result = await response.json();
        console.error('Failed to add assignee:', result.error);
      }
    } catch (error) {
      // If API call fails, revert the local state
      setAssignees(prev => prev.filter(a => a !== trimmed));
      console.error('Error adding assignee:', error);
    }
  }, [assignees]);

  const removeAssignee = useCallback(async (assigneeToRemove: string) => {
    console.log('🗑️ Starting removal process for:', assigneeToRemove);
    
    // Immediately update local state for better UX
    setAssignees(prev => prev.filter(a => a !== assigneeToRemove));

    // Persist to database
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
        console.error('❌ Failed to remove assignee:', result.error);
        setAssignees(prev => [...prev, assigneeToRemove].sort((a, b) => 
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        ));
      } else {
        console.log('✅ Successfully removed assignee from database');
      }
    } catch (error) {
      // If API call fails, revert the local state
      console.error('❌ Error removing assignee:', error);
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