import { useState, useEffect } from 'react';
import { Task, TaskInput } from '@/types/task';

interface TaskApiResponse {
  success: boolean;
  data?: Task | Task[];
  error?: string;
  message?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tasks');
      const result: TaskApiResponse = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        // Transform MongoDB _id to id for frontend compatibility
        const transformedTasks = result.data.map(task => ({
          ...task,
          id: task._id,
        }));
        setTasks(transformedTasks);
      } else {
        setError(result.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new task
  const createTask = async (taskInput: TaskInput): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskInput),
      });

      const result: TaskApiResponse = await response.json();
      
      if (result.success && result.data) {
        const newTask = {
          ...result.data,
          id: result.data._id,
        };
        setTasks(prev => [...prev, newTask]);
        return true;
      } else {
        setError(result.error || 'Failed to create task');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error creating task:', err);
      return false;
    }
  };

  // Update a task
  const updateTask = async (id: string, updates: Partial<TaskInput>): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result: TaskApiResponse = await response.json();
      
      if (result.success && result.data) {
        const updatedTask = {
          ...result.data,
          id: result.data._id,
        };
        setTasks(prev => 
          prev.map(task => 
            task.id === id ? updatedTask : task
          )
        );
        return true;
      } else {
        setError(result.error || 'Failed to update task');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating task:', err);
      return false;
    }
  };

  // Delete a task
  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      const result: TaskApiResponse = await response.json();
      
      if (result.success) {
        setTasks(prev => prev.filter(task => task.id !== id));
        return true;
      } else {
        setError(result.error || 'Failed to delete task');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting task:', err);
      return false;
    }
  };

  // Toggle task completion
  const toggleComplete = async (id: string): Promise<boolean> => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const newCompleted = !task.completed;
    const updates = {
      completed: newCompleted,
      status: newCompleted ? 'Completed' as const : 'InProcess' as const,
    };

    return await updateTask(id, updates);
  };

  // Load tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    refetch: fetchTasks,
  };
}