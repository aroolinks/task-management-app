'use client';

import { useMemo, useState } from 'react';
import { Task } from '@/types/task';
import TaskItem from './TaskItem';
import { generateGroupInvoice, generateAllTasksInvoice } from '@/utils/invoiceGenerator';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  selectedGroup?: string; // externally controlled group (from sidebar)
  autoEditTaskId?: string;
}

export default function TaskList({ tasks, onDeleteTask, onEditTask, selectedGroup: selectedGroupProp, autoEditTaskId }: TaskListProps) {
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

  
  const effectiveSelectedGroup = selectedGroupProp ?? 'all';
  const [showEarnings, setShowEarnings] = useState<boolean>(false);
  const [showCost, setShowCost] = useState<boolean>(false);


  // Filter tasks by selected group only
  const filteredTasks = useMemo(() => {
    let tasks = visibleTasks;
    
    // Filter by group
    if (effectiveSelectedGroup !== 'all') {
      tasks = tasks.filter(task => {
        const taskGroup = task.clientGroup || 'Ungrouped';
        return taskGroup === effectiveSelectedGroup;
      });
    }
    
    return tasks;
  }, [visibleTasks, effectiveSelectedGroup]);

  const handleGenerateInvoice = () => {
    try {
      if (effectiveSelectedGroup === 'all') {
        generateAllTasksInvoice(visibleTasks);
      } else {
        generateGroupInvoice(visibleTasks, effectiveSelectedGroup);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    }
  };

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
        <div className="flex items-center gap-0 overflow-x-auto divide-x divide-slate-600">
          <button
            className={`px-2 py-1 rounded text-[14px] ${selectedMonth === 'all' ? 'bg-slate-700 text-slate-100' : 'hover:bg-slate-700/50 text-slate-300'}`}
            onClick={() => setSelectedMonth('all')}
          >
            All
          </button>
          {months.map(m => (
            <button
              key={m.value}
              className={`px-2 py-1 rounded text-[14px] ${selectedMonth === m.value ? 'bg-slate-700 text-slate-100' : 'hover:bg-slate-700/50 text-slate-300'}`}
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEarnings(!showEarnings)}
              className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors cursor-pointer"
              title={showEarnings ? 'Hide earnings' : 'Show earnings'}
            >
              Earnings: {showEarnings ? `£${totalEarnings.toFixed(2)}` : '••••'}
            </button>
            <button
              onClick={handleGenerateInvoice}
              className="px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-1"
              title="Generate PDF Invoice"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>


      {/* Header row */}
      <div className="grid grid-cols-[180px_100px_100px_100px_100px_100px_120px_100px_100px_80px_70px_70px_100px_120px] items-center gap-0 px-3 py-1.5 text-[11px] font-semibold text-slate-300 tracking-wide bg-slate-900 border-b border-slate-700 divide-x divide-slate-700">
        <div className="text-left px-2 py-1 overflow-hidden truncate">Name</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Group</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Web</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Job Desc</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Figma</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Asset</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Due</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Status</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Priority</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate flex items-center gap-1">
          <span>Cost</span>
          <button
            onClick={() => setShowCost(!showCost)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title={showCost ? 'Hide cost' : 'Show cost'}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showCost ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              )}
            </svg>
          </button>
        </div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Invoice</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Paid</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">Assignees</div>
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
              showCost={showCost}
              autoEdit={task.id === autoEditTaskId}
            />
        ))}
      </div>
    </div>
  );
}
