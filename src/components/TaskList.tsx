'use client';

import { useMemo, useState, useEffect } from 'react';
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
  const effectiveSelectedGroup = selectedGroupProp ?? 'all';
  const [showEarnings, setShowEarnings] = useState<boolean>(false);
  const [showCost, setShowCost] = useState<boolean>(false);
  const [statusTab, setStatusTab] = useState<'inprocess' | 'completed'>('inprocess');
  
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
    monthTasks = monthTasks.filter(t => 
      statusTab === 'completed' ? t.status === 'Completed' : t.status !== 'Completed'
    );
    
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

  const completedTasks = useMemo(() => selectedMonthTasks.filter(t => t.status === 'Completed').length, [selectedMonthTasks]);
  const inProcessTasks = useMemo(() => selectedMonthTasks.filter(t => t.status !== 'Completed').length, [selectedMonthTasks]);
  const totalTasks = selectedMonthTasks.length;

  // Early return after all hooks are called
  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <h3 className="text-gray-900 text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-gray-600 mb-4 max-w-sm mx-auto text-sm">Get started by creating your first project. Click the "Add Task" button above to begin organizing your work.</p>
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Month tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
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
                title={hasTasksInMonth ? `${month.value} - ${tasksByMonth[month.value]?.length || 0} tasks` : `No tasks in ${month.value}`}
              >
                {month.label}
                {hasTasksInMonth ? (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                    {tasksByMonth[month.value]?.length || 0}
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
              title={`No Due Date - ${tasksByMonth['No Due Date']?.length || 0} tasks`}
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
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded border border-gray-300 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                statusTab === 'inprocess' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                statusTab === 'completed' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
          <div className="text-sm text-gray-900 font-medium">
            {selectedMonth} - {statusTab === 'completed' ? 'Completed' : 'In Process'} Tasks
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 border border-gray-300 font-medium">
              {totalTasks} tasks
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEarnings(!showEarnings)}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border border-gray-300 transition-colors font-medium text-xs"
              title={showEarnings ? 'Hide earnings' : 'Show earnings'}
            >
              £{showEarnings ? totalEarnings.toFixed(0) : '••••'}
            </button>
            <button
              onClick={handleGenerateInvoice}
              className="px-3 py-1 rounded bg-gray-900 hover:bg-gray-800 text-white transition-colors flex items-center gap-1.5 font-medium text-xs"
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

      {/* Show message if no tasks for selected month and status */}
      {selectedMonthTasks.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-medium mb-1">No tasks found</h3>
          <p className="text-gray-500 text-sm">
            No {statusTab === 'completed' ? 'completed' : 'in-process'} tasks in {selectedMonth}
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[160px_90px_120px_90px_120px_100px_110px_90px_120px_120px] items-center gap-0 px-4 py-2.5 text-xs font-bold text-gray-600 tracking-wider bg-gray-50 border-b border-gray-200">
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
                className="text-gray-500 hover:text-gray-700 transition-colors"
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
            <div className="text-left px-2 py-1 overflow-hidden truncate">ACTIONS</div>
          </div>

          {/* Tasks for selected month */}
          <div className="divide-y divide-gray-200">
            {selectedMonthTasks.map(task => (
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
        </>
      )}
    </div>
  );
}
