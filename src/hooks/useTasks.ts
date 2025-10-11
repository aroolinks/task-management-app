import { useState, useEffect, useRef } from 'react';
import { Task, TaskInput } from '@/types/task';

interface MongoTask extends Omit<Task, 'id'> {
  _id: string;
}

interface TaskApiResponse {
  success: boolean;
  data?: MongoTask | MongoTask[];
  error?: string;
  message?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedMigration = useRef(false);

  // Attempt one-time migration from localStorage to server
  const migrateLocalToServer = async (): Promise<{ imported: number; skipped: number }> => {
    if (typeof window === 'undefined') return { imported: 0, skipped: 0 };

    const raw = window.localStorage.getItem('tasks');
    if (!raw) return { imported: 0, skipped: 0 };

    let arr: unknown;
    try {
      arr = JSON.parse(raw);
    } catch {
      return { imported: 0, skipped: 0 };
    }
    if (!Array.isArray(arr) || arr.length === 0) return { imported: 0, skipped: 0 };

    const isPriority = (v: any): v is Task['priority'] => ['Low','Medium','High','Urgent'].includes(v);
    const isStatus = (v: any): v is Task['status'] => ['Completed','InProcess','Waiting for Quote'].includes(v);

    let imported = 0;
    let skipped = 0;

    for (const item of arr as any[]) {
      try {
        const clientName = (item.clientName || item.name || '').toString().trim() || 'Unnamed Client';
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const completed = Boolean(item.completed);
        const priority = isPriority(item.priority) ? item.priority : 'Low';
        const status = isStatus(item.status) ? item.status : (completed ? 'Completed' : 'InProcess');
        const cms = item.cms ?? null;
        const webUrl = (item.webUrl || '').toString();
        const figmaUrl = (item.figmaUrl || '').toString();
        const assetUrl = (item.assetUrl || '').toString();
        const totalPrice = Number.isFinite(item.totalPrice) ? Number(item.totalPrice) : null;
        const deposit = Number.isFinite(item.deposit) ? Number(item.deposit) : null;

        const payload = {
          clientName,
          dueDate,
          completed,
          priority,
          status,
          cms,
          webUrl,
          figmaUrl,
          assetUrl,
          totalPrice,
          deposit,
        } as const;

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          skipped++;
          continue;
        }
        imported++;
      } catch {
        skipped++;
      }
    }

    // Clear after successful import attempt to avoid duplicates
    try { window.localStorage.removeItem('tasks'); } catch {}

    return { imported, skipped };
  };

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/tasks', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: TaskApiResponse = await response.json();
      console.log('API Response:', result); // Debug log
      
      if (result.success && Array.isArray(result.data)) {
        // Transform MongoDB _id to id and normalize date fields
        const transformedTasks = (result.data as MongoTask[]).map((task) => ({
          ...task,
          id: task._id,
          createdAt: new Date(task.createdAt as unknown as string),
          updatedAt: new Date(task.updatedAt as unknown as string),
          dueDate: task.dueDate ? new Date(task.dueDate as unknown as string) : null,
        }));
        setTasks(transformedTasks as unknown as Task[]);
        console.log('Tasks loaded:', transformedTasks.length); // Debug log

        // One-time migration: if server has no tasks but localStorage does, import them
        if (!hasAttemptedMigration.current && transformedTasks.length === 0) {
          hasAttemptedMigration.current = true;
          try {
            const { imported } = await migrateLocalToServer();
            if (imported > 0) {
              // Refetch to load newly imported tasks
              await fetchTasks();
              return;
            }
          } catch {
            // ignore migration errors
          }
        }
      } else {
        const errorDetails = result as { details?: string; error?: string };
        const errorMessage = errorDetails.details || errorDetails.error || 'Failed to fetch tasks';
        setError(errorMessage);
        console.error('API returned error:', result.error);
        console.error('Error details:', errorDetails.details);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please check your connection');
      } else {
        setError('Network error occurred');
      }
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
        const mongoTask = result.data as MongoTask;
        const newTask: Task = {
          ...(mongoTask as unknown as Omit<Task, 'id'>),
          id: mongoTask._id,
          createdAt: new Date((mongoTask as unknown as { createdAt: string }).createdAt),
          updatedAt: new Date((mongoTask as unknown as { updatedAt: string }).updatedAt),
          dueDate: (mongoTask as unknown as { dueDate?: string | null }).dueDate ? new Date((mongoTask as unknown as { dueDate: string }).dueDate) : null,
        } as Task;
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
        const mongoTask = result.data as MongoTask;
        const updatedTask: Task = {
          ...(mongoTask as unknown as Omit<Task, 'id'>),
          id: mongoTask._id,
          createdAt: new Date((mongoTask as unknown as { createdAt: string }).createdAt),
          updatedAt: new Date((mongoTask as unknown as { updatedAt: string }).updatedAt),
          dueDate: (mongoTask as unknown as { dueDate?: string | null }).dueDate ? new Date((mongoTask as unknown as { dueDate: string }).dueDate) : null,
        } as Task;
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