'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface GroupContextType {
  groups: string[];
  loading: boolean;
  error: string | null;
  addGroup: (group: string) => void;
  refreshGroups: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups', { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        // Extract group names from the API response
        const groupNames = result.data.map((g: { name: string }) => g.name);
        setGroups(groupNames.sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch groups');
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      
      // Fallback to default groups if API fails
      setGroups(['Casey', 'Jack', 'Upwork', 'Personal']);
    } finally {
      setLoading(false);
    }
  }, []);

  const addGroup = useCallback((newGroup: string) => {
    const trimmed = newGroup.trim();
    if (trimmed && !groups.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
      // Immediately update local state for better UX
      setGroups(prev => [...prev, trimmed].sort((a: string, b: string) => 
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ));
    }
  }, [groups]);

  const refreshGroups = useCallback(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const value = {
    groups,
    loading,
    error,
    addGroup,
    refreshGroups
  };

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroups must be used within a GroupProvider');
  }
  return context;
}