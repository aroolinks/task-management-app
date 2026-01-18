import { useState, useEffect, useCallback } from 'react';

export function useAssignees() {
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

  const addAssignee = useCallback((newAssignee: string) => {
    const trimmed = newAssignee.trim();
    if (trimmed && !assignees.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      // Immediately update local state for better UX
      setAssignees(prev => [...prev, trimmed].sort((a, b) => 
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ));
      
      // Also trigger a refresh to get the latest from database
      // This ensures consistency across all components
      setTimeout(() => {
        fetchAssignees();
      }, 500); // Small delay to allow for any pending database operations
    }
  }, [assignees, fetchAssignees]);

  const refreshAssignees = useCallback(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  return {
    assignees,
    loading,
    error,
    addAssignee,
    refreshAssignees
  };
}