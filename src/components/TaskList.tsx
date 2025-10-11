'use client';

import { useMemo, useState } from 'react';
import { Task } from '@/types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  autoEditId?: string;
}

export default function TaskList({ tasks, onToggleComplete, onDeleteTask, onEditTask, autoEditId }: TaskListProps) {
  // Move all hooks to the top before any conditional returns
  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1); // Jan (0) to Dec (11)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString(undefined, { month: 'short' });
    return { value, label, year: d.getFullYear() };
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const visibleTasks = useMemo(() => {
    if (selectedMonth === 'all') return tasks;
    const [y, m] = selectedMonth.split('-').map(Number);
    return tasks.filter(t => t.dueDate instanceof Date && t.dueDate.getFullYear() === y && (t.dueDate.getMonth() + 1) === m);
  }, [tasks, selectedMonth]);

  const totalEarnings = useMemo(() => {
    return visibleTasks.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
  }, [visibleTasks]);

  const completedMonth = useMemo(() => visibleTasks.filter(t => t.status === 'Completed').length, [visibleTasks]);
  const inProcessMonth = useMemo(() => visibleTasks.filter(t => t.status === 'InProcess').length, [visibleTasks]);
  const totalMonth = completedMonth + inProcessMonth;

  // Early return after all hooks are called
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <p className="text-gray-500 text-lg">No tasks yet. Add your first task above!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Month tabs and summary */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            className={`px-2 py-1 rounded text-[11px] ${selectedMonth === 'all' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
            onClick={() => setSelectedMonth('all')}
          >
            All
          </button>
          {months.map(m => (
            <button
              key={m.value}
              className={`px-2 py-1 rounded text-[11px] ${selectedMonth === m.value ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => setSelectedMonth(m.value)}
              title={`${m.label} ${m.year}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium text-gray-700 flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">All: {totalMonth}</span>
          <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">Completed: {completedMonth}</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">In progress: {inProcessMonth}</span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">Earnings: £{totalEarnings.toFixed(2)}</span>
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[24px_2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.4fr_1fr_1fr_1fr_auto] items-center gap-0 px-3 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b divide-x divide-gray-200">
        <div></div>
        <div className="text-left pl-2">Name</div>
        <div className="text-left pl-2">Web</div>
        <div className="text-left pl-2">CMS</div>
        <div className="text-left pl-2">Figma</div>
        <div className="text-left pl-2">Asset</div>
        <div className="text-left pl-2">Due</div>
        <div className="text-left pl-2">Status</div>
        <div className="text-left pl-2">Priority</div>
        <div className="text-left pl-2">Cost</div>
        <div className="text-left pl-2">Deposit</div>
        <div className="text-left pl-2">Actions</div>
      </div>

      {/* Data rows */}
      <div className="divide-y divide-gray-200">
        {visibleTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
            autoEdit={task.id === autoEditId}
          />
        ))}
      </div>
    </div>
  );
}
