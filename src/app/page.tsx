'use client';

import { useState, useCallback } from 'react';
import { Task } from '@/types/task';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import TaskList from '@/components/TaskList';
import Logo from '@/components/Logo';

// Simple UUID generator function
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Home() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [autoEditId, setAutoEditId] = useState<string | undefined>(undefined);

  const handleAddTask = () => {
    const newTask: Task = {
      id: generateUUID(),
      dueDate: null,
      priority: 'Medium',
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'InProcess',
      clientName: '',
      cms: null,
      webUrl: '',
      figmaUrl: '',
      assetUrl: '',
      totalPrice: null,
      deposit: null,
    };
    setTasks(prev => [...prev, newTask]);
    setAutoEditId(newTask.id);
  };

  const toggleComplete = useCallback((id: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id !== id) return task;
        const newCompleted = !task.completed;
        return {
          ...task,
          completed: newCompleted,
          status: newCompleted ? 'Completed' : 'InProcess',
          updatedAt: new Date(),
        };
      })
    );
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  }, [setTasks]);

  const editTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === id 
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      )
    );
  }, [setTasks]);

  const completedByStatus = tasks.filter(t => t.status === 'Completed').length;
  const inProcessByStatus = tasks.filter(t => t.status === 'InProcess').length;
  const totalByStatus = completedByStatus + inProcessByStatus;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <Logo size="lg" />
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {totalByStatus} {totalByStatus === 1 ? 'Project' : 'Projects'}
              </div>
            </div>
            <button
              onClick={handleAddTask}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Project
            </button>
          </div>
          <p className="text-gray-600 mb-3">
            Stay organized and track your tasks efficiently
          </p>
        </header>
        
        <TaskList 
          tasks={tasks}
          onToggleComplete={toggleComplete}
          onDeleteTask={deleteTask}
          onEditTask={editTask}
          autoEditId={autoEditId}
        />
      </div>
    </div>
  );
}
