'use client';

import { useState, useCallback } from 'react';
import { Task, TaskInput } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import Logo from '@/components/Logo';
import AddTask from '@/components/AddTask';

export default function Home() {
  const { tasks, loading, error, createTask, updateTask, deleteTask, toggleComplete } = useTasks();
  const [isAddTaskVisible, setIsAddTaskVisible] = useState(false);

  const handleAddTask = async (taskInput: TaskInput) => {
    const success = await createTask(taskInput);
    if (success) {
      setIsAddTaskVisible(false);
    }
  };

  const handleToggleComplete = useCallback(async (id: string) => {
    await toggleComplete(id);
  }, [toggleComplete]);

  const handleDeleteTask = useCallback(async (id: string) => {
    await deleteTask(id);
  }, [deleteTask]);

  const handleEditTask = useCallback(async (id: string, updates: Partial<Task>) => {
    // Remove fields that shouldn't be sent to the API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: taskId, createdAt, updatedAt, ...apiUpdates } = updates;
    await updateTask(id, apiUpdates);
  }, [updateTask]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4 text-xl">❌ Error loading tasks</div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completedByStatus = tasks.filter(t => t.status === 'Completed').length;
  const inProcessByStatus = tasks.filter(t => t.status === 'InProcess').length;
  const totalByStatus = completedByStatus + inProcessByStatus;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-full mx-auto px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <Logo size="lg" />
              <div className="bg-slate-700 text-slate-100 px-3 py-1 rounded-full text-sm font-medium">
                {totalByStatus} {totalByStatus === 1 ? 'Project' : 'Projects'}
              </div>
            </div>
            <button
              onClick={() => setIsAddTaskVisible(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Project
            </button>
          </div>
          <p className="text-slate-300 mb-3">
            Stay organized and track your tasks efficiently
          </p>
        </header>
        
        <TaskList 
          tasks={tasks}
          onToggleComplete={handleToggleComplete}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
        />
        
        <AddTask 
          onAddTask={handleAddTask}
          isVisible={isAddTaskVisible}
          onClose={() => setIsAddTaskVisible(false)}
        />
      </div>
    </div>
  );
}
