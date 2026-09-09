import { useCallback, useState } from 'react';
import type { TeamMember, TeamSection, TeamTask, TeamTaskInput } from '@/types/team-task';

export function useTeamTasks() {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sections, setSections] = useState<TeamSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/team-tasks');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTasks(result.data);
      setMembers(result.members);
      setSections(result.sections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (value: TeamTaskInput): Promise<TeamTask | null> => {
    try {
      const response = await fetch('/api/team-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTasks((old) => [result.data, ...old]);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save task');
      return null;
    }
  }, []);

  const updateTask = useCallback(async (id: string, value: Partial<TeamTaskInput>): Promise<TeamTask | null> => {
    try {
      const response = await fetch(`/api/team-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTasks((old) => old.map((task) => (task.id === id ? result.data : task)));
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update task');
      return null;
    }
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/team-tasks/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTasks((old) => old.filter((task) => task.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete task');
      return false;
    }
  }, []);

  const createSection = useCallback(async (name: string): Promise<TeamSection | null> => {
    try {
      const response = await fetch('/api/team-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSections((old) => [...old, result.data].sort((a, b) => a.order - b.order));
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create section');
      return null;
    }
  }, []);

  const updateSection = useCallback(async (id: string, patch: { name?: string; order?: number }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/team-sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSections((old) => old.map((s) => (s.id === id ? result.data : s)).sort((a, b) => a.order - b.order));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update section');
      return false;
    }
  }, []);

  const deleteSection = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/team-sections/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSections((old) => old.filter((s) => s.id !== id));
      setTasks((old) => old.map((t) => (t.section === id ? { ...t, section: null } : t)));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete section');
      return false;
    }
  }, []);

  return {
    tasks,
    members,
    sections,
    loading,
    error,
    setError,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
  };
}
