'use client';

import { useMemo, useState } from 'react';
import { Task } from '@/types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
}

export default function TaskList({ tasks, onDeleteTask, onEditTask }: TaskListProps) {
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

  // Define available groups
  const availableGroups = ['Casey', 'Jack', 'Upwork', 'Personal'];
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Group tasks by clientGroup
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    visibleTasks.forEach(task => {
      const groupName = task.clientGroup || 'Ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(task);
    });
    return groups;
  }, [visibleTasks]);

  // Filter tasks by selected group
  const filteredTasks = useMemo(() => {
    if (selectedGroup === 'all') return visibleTasks;
    return visibleTasks.filter(task => {
      const taskGroup = task.clientGroup || 'Ungrouped';
      return taskGroup === selectedGroup;
    });
  }, [visibleTasks, selectedGroup]);

  const totalEarnings = useMemo(() => {
    return visibleTasks.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
  }, [visibleTasks]);

  const completedMonth = useMemo(() => visibleTasks.filter(t => t.status === 'Completed').length, [visibleTasks]);
  const inProcessMonth = useMemo(() => visibleTasks.filter(t => t.status === 'InProcess').length, [visibleTasks]);
  const totalMonth = completedMonth + inProcessMonth;

  // Early return after all hooks are called
  if (tasks.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-slate-100 text-lg font-medium mb-2">No projects yet</h3>
        <p className="text-slate-300">Get started by adding your first project above!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Month tabs and summary */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            className={`px-2 py-1 rounded text-[11px] ${selectedMonth === 'all' ? 'bg-slate-700 text-slate-100' : 'hover:bg-slate-700/50 text-slate-300'}`}
            onClick={() => setSelectedMonth('all')}
          >
            All
          </button>
          {months.map(m => (
            <button
              key={m.value}
              className={`px-2 py-1 rounded text-[11px] ${selectedMonth === m.value ? 'bg-slate-700 text-slate-100' : 'hover:bg-slate-700/50 text-slate-300'}`}
              onClick={() => setSelectedMonth(m.value)}
              title={`${m.label} ${m.year}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium text-slate-300 flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">All: {totalMonth}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">Completed: {completedMonth}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">In progress: {inProcessMonth}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">Earnings: £{totalEarnings.toFixed(2)}</span>
        </div>
      </div>

      {/* Group tabs */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-750 border-b border-slate-700 overflow-x-auto">
        <button
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedGroup === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          onClick={() => setSelectedGroup('all')}
        >
          All Groups
        </button>
        {availableGroups.map(group => {
          const groupTasks = groupedTasks[group] || [];
          return (
            <button
              key={group}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedGroup === group ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              onClick={() => setSelectedGroup(group)}
            >
              {group} {groupTasks.length > 0 && `(${groupTasks.length})`}
            </button>
          );
        })}
        {groupedTasks['Ungrouped'] && (
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedGroup === 'Ungrouped' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            onClick={() => setSelectedGroup('Ungrouped')}
          >
            Ungrouped ({groupedTasks['Ungrouped'].length})
          </button>
        )}
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[180px_100px_80px_100px_80px_80px_80px_140px_80px_80px_80px_100px_120px] items-center gap-0 px-3 py-1.5 text-[11px] font-semibold text-slate-300 tracking-wide bg-slate-900 border-b border-slate-700 divide-x divide-slate-700">
        <div className="text-left px-2 py-1 overflow-hidden truncate">Name</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Group</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Web</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Job Desc</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Figma</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Asset</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Due</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Status</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Priority</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Cost</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Deposit</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Assignee</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Actions</div>
      </div>

      {/* Filtered Data rows */}
      <div className="divide-y divide-slate-700">
        {filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
            />
        ))}
      </div>
    </div>
  );
}
