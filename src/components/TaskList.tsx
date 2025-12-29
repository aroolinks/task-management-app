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
  const currentMonthValue = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthValue);

  const visibleTasks = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return tasks.filter(t => t.dueDate instanceof Date && t.dueDate.getFullYear() === y && (t.dueDate.getMonth() + 1) === m);
  }, [tasks, selectedMonth]);

  
  const effectiveSelectedGroup = selectedGroupProp ?? 'all';
  const [showEarnings, setShowEarnings] = useState<boolean>(false);
  const [showCost, setShowCost] = useState<boolean>(false);
  const [statusTab, setStatusTab] = useState<'inprocess' | 'completed'>('inprocess');


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

  // Apply status tab filter (completed vs rest)
  const statusFilteredTasks = useMemo(() => {
    return filteredTasks.filter(t => (statusTab === 'completed' ? t.status === 'Completed' : t.status !== 'Completed'));
  }, [filteredTasks, statusTab]);

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
  const inProcessMonth = useMemo(() => visibleTasks.filter(t => t.status !== 'Completed').length, [visibleTasks]);
  const totalMonth = completedMonth + inProcessMonth;

  // Early return after all hooks are called
  if (tasks.length === 0) {
    return (
      <div className="card-shadow bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-8 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <h3 className="text-slate-100 text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-slate-400 mb-4 max-w-sm mx-auto text-sm">Get started by creating your first project. Click the &quot;Add Task&quot; button above to begin organizing your work.</p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Ready to boost your productivity</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-shadow bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Month tabs and summary */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-1 overflow-x-auto">
          {months.map(m => (
            <button
              key={m.value}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                selectedMonth === m.value 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30' 
                  : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 border border-transparent'
              }`}
              onClick={() => setSelectedMonth(m.value)}
              title={`${m.label} ${m.year}`}
            >
              {m.label}
            </button>
          ))}
          <div className="ml-3 inline-flex rounded-lg overflow-hidden border border-slate-600/50 bg-slate-700/30">
            <button
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                statusTab === 'inprocess' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-r border-amber-500/30' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
              }`}
              onClick={() => setStatusTab('inprocess')}
              title="Show in-process projects"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l3 3" />
              </svg>
              In Process
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                statusTab === 'completed' 
                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
              }`}
              onClick={() => setStatusTab('completed')}
              title="Show completed projects"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/50 font-medium">
              Total: {totalMonth}
            </span>
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Done: {completedMonth}
            </span>
            <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              Active: {inProcessMonth}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEarnings(!showEarnings)}
              className="px-2 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-slate-200 border border-slate-600/50 transition-all duration-200 font-medium text-xs"
              title={showEarnings ? 'Hide earnings' : 'Show earnings'}
            >
              £{showEarnings ? totalEarnings.toFixed(0) : '••••'}
            </button>
            <button
              onClick={handleGenerateInvoice}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 flex items-center gap-1.5 font-medium btn-hover shadow-lg text-xs"
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
      <div className="grid grid-cols-[160px_90px_120px_90px_120px_100px_110px_90px_120px_110px_120px] items-center gap-0 px-4 py-2.5 text-xs font-bold text-slate-400 tracking-wider bg-slate-800/30 border-b border-slate-700/50 divide-x divide-slate-700/30">
        <div className="text-left px-2 py-1 overflow-hidden truncate">CLIENT NAME</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">GROUP</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">WEBSITE</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">JOB TYPE</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">ASSETS</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">DUE DATE</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">STATUS</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate flex items-center gap-1">
          <span>COST</span>
          <button
            onClick={() => setShowCost(!showCost)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title={showCost ? 'Hide cost' : 'Show cost'}
          >
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showCost ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              )}
            </svg>
          </button>
        </div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">BILLING</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">ASSIGNEES</div>
        <div className="text-left px-2 py-1 overflow-hidden truncate">ACTIONS</div>
      </div>

      {/* Filtered Data rows */}
      <div className="divide-y divide-slate-700/30">
        {statusFilteredTasks.map(task => (
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
