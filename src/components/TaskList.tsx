'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Task } from '@/types/task';
import TaskItem from './TaskItem';
import { generateGroupInvoice, generateAllTasksInvoice } from '@/utils/invoiceGenerator';
import { useAuth } from '@/contexts/AuthContext';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  selectedGroup?: string; // externally controlled group (from sidebar)
  autoEditTaskId?: string;
}

export default function TaskList({ tasks, onDeleteTask, onEditTask, selectedGroup: selectedGroupProp, autoEditTaskId }: TaskListProps) {
  const { user } = useAuth();
  const effectiveSelectedGroup = selectedGroupProp ?? 'all';
  const [showEarnings, setShowEarnings] = useState<boolean>(false);
  const [showCost, setShowCost] = useState<boolean>(false);
  const [statusTab, setStatusTab] = useState<'all' | 'inprocess' | 'completed'>('inprocess');
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    if (typeof window === 'undefined') return 'list';
    return window.localStorage.getItem('projectsViewMode') === 'card' ? 'card' : 'list';
  });

  const handleSetViewMode = (mode: 'list' | 'card') => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('projectsViewMode', mode);
    } catch {}
  };
  
  // Get current year and create month tabs
  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    const value = d.toLocaleDateString('en-US', { month: 'long' });
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    return { value, label };
  });
  
  // Find months that have tasks
  const monthsWithTasks = useMemo(() => {
    const monthSet = new Set<string>();
    tasks.forEach(task => {
      if (task.dueDate) {
        const monthName = task.dueDate.toLocaleDateString('en-US', { month: 'long' });
        monthSet.add(monthName);
      }
    });
    return Array.from(monthSet);
  }, [tasks]);
  
  // Set initial selected month to first month with tasks or current month
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
  const initialMonth = monthsWithTasks.includes(currentMonth) ? currentMonth : monthsWithTasks[0] || currentMonth;
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);

  // Update selected month if current selection has no tasks
  useEffect(() => {
    if (monthsWithTasks.length > 0 && !monthsWithTasks.includes(selectedMonth)) {
      setSelectedMonth(monthsWithTasks[0]);
    }
  }, [monthsWithTasks, selectedMonth]);

  // When a task is freshly created (autoEditTaskId changes), jump the view to
  // that task's month/status tab so it doesn't silently disappear off-screen.
  const lastJumpedTaskId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!autoEditTaskId || autoEditTaskId === lastJumpedTaskId.current) return;
    const task = tasks.find(t => t.id === autoEditTaskId);
    if (!task) return; // wait for it to show up in the tasks prop
    lastJumpedTaskId.current = autoEditTaskId;
    const monthKey = task.dueDate
      ? task.dueDate.toLocaleDateString('en-US', { month: 'long' })
      : 'No Due Date';
    setSelectedMonth(monthKey);
    setStatusTab(task.status === 'Completed' ? 'completed' : 'inprocess');
  }, [autoEditTaskId, tasks]);

  // Group tasks by month
  const tasksByMonth = useMemo(() => {
    const months: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      if (task.dueDate) {
        const monthKey = task.dueDate.toLocaleDateString('en-US', { 
          month: 'long' 
        });
        if (!months[monthKey]) {
          months[monthKey] = [];
        }
        months[monthKey].push(task);
      } else {
        // Tasks without due dates go to "No Due Date"
        const noDateKey = 'No Due Date';
        if (!months[noDateKey]) {
          months[noDateKey] = [];
        }
        months[noDateKey].push(task);
      }
    });
    
    // Sort tasks within each month by due date
    Object.keys(months).forEach(monthKey => {
      months[monthKey].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    });
    
    return months;
  }, [tasks]);

  // Get tasks for selected month
  const selectedMonthTasks = useMemo(() => {
    let monthTasks = tasksByMonth[selectedMonth] || [];
    
    // Filter by group
    if (effectiveSelectedGroup !== 'all') {
      monthTasks = monthTasks.filter(task => {
        const taskGroup = task.clientGroup || 'Ungrouped';
        return taskGroup === effectiveSelectedGroup;
      });
    }
    
    // Apply status tab filter
    if (statusTab !== 'all') {
      monthTasks = monthTasks.filter(t =>
        statusTab === 'completed' ? t.status === 'Completed' : t.status !== 'Completed'
      );
    }
    
    return monthTasks;
  }, [tasksByMonth, selectedMonth, effectiveSelectedGroup, statusTab]);

  const handleGenerateInvoice = () => {
    try {
      if (effectiveSelectedGroup === 'all') {
        generateAllTasksInvoice(tasks);
      } else {
        generateGroupInvoice(tasks, effectiveSelectedGroup);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    }
  };

  const totalEarnings = useMemo(() => {
    return selectedMonthTasks.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
  }, [selectedMonthTasks]);

  const totalTasks = selectedMonthTasks.length;

  // Early return after all hooks are called
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <h3 className="text-gray-900 text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-gray-600 mb-4 max-w-sm mx-auto text-sm">Get started by creating your first project. Click the &quot;Add Project&quot; button above to begin organizing your work.</p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Ready to boost your productivity</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Month tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {months.map(month => {
            const hasTasksInMonth = tasksByMonth[month.value] && tasksByMonth[month.value].length > 0;
            return (
              <button
                key={month.value}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedMonth === month.value 
                    ? 'bg-gray-900 text-white' 
                    : hasTasksInMonth
                      ? 'hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                      : 'text-gray-400 cursor-not-allowed bg-gray-100'
                }`}
                onClick={() => hasTasksInMonth && setSelectedMonth(month.value)}
                disabled={!hasTasksInMonth}
                title={hasTasksInMonth ? `${month.value} - ${tasksByMonth[month.value]?.length || 0} projects` : `No projects in ${month.value}`}
              >
                {month.label}
                {hasTasksInMonth ? (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                    {
                    tasksByMonth[month.value]?.length || 0}
                  </span>
                ) : (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-300 text-gray-500 rounded text-xs">
                    0
                  </span>
                )}
              </button>
            );
          })}
          {/* No Due Date tab - only show if there are tasks without due dates */}
          {tasksByMonth['No Due Date'] && tasksByMonth['No Due Date'].length > 0 && (
            <button
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                selectedMonth === 'No Due Date' 
                  ? 'bg-gray-900 text-white' 
                  : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setSelectedMonth('No Due Date')}
              title={`No Due Date - ${tasksByMonth['No Due Date']?.length || 0} projects`}
            >
              No Date
              <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                {tasksByMonth['No Due Date']?.length || 0}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Status tabs and summary for selected month */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            <button
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                statusTab === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setStatusTab('all')}
              title="Show all projects"
            >
              All
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                statusTab === 'inprocess'
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setStatusTab('inprocess')}
              title="Show in-process projects"
            >
              <svg 
                className="h-3 w-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke={statusTab === 'inprocess' ? 'white' : '#6b7280'}
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill={statusTab === 'inprocess' ? 'white' : '#6b7280'} />
              </svg>
              In Process
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                statusTab === 'completed' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setStatusTab('completed')}
              title="Show completed projects"
            >
              <svg 
                className="h-3 w-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke={statusTab === 'completed' ? 'white' : '#6b7280'}
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </button>
          </div>
          <div className="text-sm text-gray-900 font-medium">
            {selectedMonth} - {statusTab === 'completed' ? 'Completed' : statusTab === 'inprocess' ? 'In Process' : 'All'} Projects
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => handleSetViewMode('list')}
              className={`rounded-md p-2 transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List view"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => handleSetViewMode('card')}
              className={`rounded-md p-2 transition-all ${
                viewMode === 'card' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Card view"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v7H4v-7zm9 0h7v7h-7v-7z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
              {totalTasks} projects
            </span>
          </div>
          {user?.role === 'admin' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowEarnings(!showEarnings)}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title={showEarnings ? 'Hide earnings' : 'Show earnings'}
              >
                £{showEarnings ? totalEarnings.toFixed(0) : '••••'}
              </button>
              <button
                onClick={handleGenerateInvoice}
                className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                title="Generate PDF Invoice"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Show message if no tasks for selected month and status */}
      {selectedMonthTasks.length === 0 ? (
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-medium mb-1">No projects found</h3>
          <p className="text-gray-500 text-sm">
            No {statusTab === 'completed' ? 'completed' : statusTab === 'inprocess' ? 'in-process' : ''} projects in {selectedMonth}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {selectedMonthTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onDeleteTask={onDeleteTask}
                onEditTask={onEditTask}
                showCost={showCost}
                viewMode="card"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="w-10 px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Project Name</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Links</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedMonthTasks.map((task, i) => (
                <TaskItem
                  key={task.id}
                  index={i + 1}
                  task={task}
                  onDeleteTask={onDeleteTask}
                  onEditTask={onEditTask}
                  showCost={showCost}
                  showCostColumn={false}
                  viewMode="list"
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
