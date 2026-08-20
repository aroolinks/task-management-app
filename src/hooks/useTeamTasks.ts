import { useCallback, useState } from 'react';
import type { TeamMember, TeamTask, TeamTaskInput } from '@/types/team-task';

export function useTeamTasks() {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
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

  return {
    tasks,
    members,
    loading,
    error,
    setError,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
