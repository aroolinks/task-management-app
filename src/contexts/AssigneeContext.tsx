'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AssigneeContextType {
  assignees: string[];
  loading: boolean;
  error: string | null;
  addAssignee: (assignee: string) => void;
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

  const addAssignee = useCallback((newAssignee: string) => {
    const trimmed = newAssignee.trim();
    if (trimmed && !assignees.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      // Immediately update local state for better UX
      setAssignees(prev => [...prev, trimmed].sort((a, b) => 
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ));
    }
  }, [assignees]);

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