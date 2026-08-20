'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Task, TaskInput } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClients, Client } from '@/contexts/ClientContext';
import TaskList from '@/components/TaskList';
import AddTask from '@/components/AddTask';
import ClientsList from '@/components/ClientsList';
import ClientTab from '@/components/ClientTab';
import Logo from '@/components/Logo';
import UserManagement from '@/components/UserManagement';
import HostingManagement from '@/components/HostingManagement';
import MonthlyExpenses from '@/components/MonthlyExpenses';
import CompanyDataManagement from '@/components/CompanyDataManagement';

export default function TaskApp() {
  const { user, logout } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Only fetch tasks if user has permission - use empty array if no permission
  const shouldFetchTasks = user?.permissions?.canViewTasks ?? false;
  const { tasks: fetchedTasks, loading, error, createTask, updateTask, deleteTask } = useTasks(selectedYear);
  const tasks = shouldFetchTasks ? fetchedTasks : [];
  
  const { refreshAssignees } = useAssignees();
  const { clients, refreshClients } = useClients();
  const [autoEditTaskId, setAutoEditTaskId] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addProjectDefaultClient, setAddProjectDefaultClient] = useState<string | undefined>(undefined);
  const [selectedGroup] = useState<string>('all');
  const [showYearEarnings, setShowYearEarnings] = useState(false);
  const [showProjectValue, setShowProjectValue] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'clients' | 'hosting' | 'expenses' | 'users' | 'company-data'>('tasks');
  const [openClientTabs, setOpenClientTabs] = useState<string[]>([]);
  const [activeClientTab, setActiveClientTab] = useState<string | null>(null);
  const hasSetInitialTab = useRef(false);

  // Debug clients changes in TaskApp
  useEffect(() => {
    console.log('🏢 TaskApp: Clients data changed, count:', clients.length, 'clients:', clients.map(c => c.name));
  }, [clients]);

  // Set default tab based on user permissions (only once on mount)
  useEffect(() => {
    if (user?.permissions && !hasSetInitialTab.current) {
      console.log('🔍 Setting initial tab based on permissions:', {
        user: user?.username,
        role: user?.role,
        canViewTasks: user.permissions.canViewTasks,
        canViewClients: user.permissions.canViewClients,
      });
      
      // If user can't view tasks but can view clients, default to clients
      if (!user.permissions.canViewTasks && user.permissions.canViewClients) {
        setActiveTab('clients');
      }
      // If user can't view clients but can view tasks, default to tasks
      else if (user.permissions.canViewTasks && !user.permissions.canViewClients) {
        setActiveTab('tasks');
      }
      // If user can view both, default to tasks
      else if (user.permissions.canViewTasks && user.permissions.canViewClients) {
        setActiveTab('tasks');
      }
      
      hasSetInitialTab.current = true;
    }
  }, [user?.permissions]);

  const handleLogout = async () => {
    await logout();
  };

  const handleAddTask = async (payload: TaskInput): Promise<boolean> => {
    const created = await createTask(payload);
    if (!created) return false;

    setAutoEditTaskId(created.id);
    refreshAssignees();
    // Switch to tasks tab after creating a task
    setActiveTab('tasks');
    setActiveClientTab(null);
    // Make sure the year selector matches the new task's due date so it isn't
    // filtered out server-side on the next refetch.
    if (created.dueDate) {
      const createdYear = created.dueDate.getFullYear();
      if (createdYear !== selectedYear) setSelectedYear(createdYear);
    }
    setShowAddTaskModal(false);
    setAddProjectDefaultClient(undefined);
    return true;
  };

  const openAddProjectModal = (defaultClient?: string) => {
    setAddProjectDefaultClient(defaultClient);
    setShowAddTaskModal(true);
  };

  const handleOpenClientTab = (clientName: string) => {
    if (!openClientTabs.includes(clientName)) {
      setOpenClientTabs(prev => [...prev, clientName]);
    }
    setActiveClientTab(clientName);
  };

  const handleClientCreated = async (newClient: Client) => {
    // Force a refresh of the clients data to ensure sidebar updates
    console.log('🔄 TaskApp: New client created, refreshing clients data:', newClient.name);
    await refreshClients();
    // Also trigger a small state update to force re-render
    setActiveTab(prev => prev);
  };

  const handleCloseClientTab = (clientName: string) => {
    setOpenClientTabs(prev => prev.filter(name => name !== clientName));
    if (activeClientTab === clientName) {
      const remainingTabs = openClientTabs.filter(name => name !== clientName);
      setActiveClientTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null);
      if (remainingTabs.length === 0) {
        setActiveTab('clients');
      }
    }
  };

  const handleDeleteTask = useCallback(async (id: string) => {
    await deleteTask(id);
  }, [deleteTask]);

  const handleEditTask = useCallback(async (id: string, updates: Partial<Task>) => {
    // Remove fields that shouldn't be sent to the API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: taskId, createdAt, updatedAt, ...apiUpdates } = updates;
    await updateTask(id, apiUpdates);
    // Refresh assignees in case assignee was updated
    if (updates.assignees !== undefined) {
      refreshAssignees();
    }
  }, [updateTask, refreshAssignees]);

  // Group tasks and calculate counts
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    
    // Initialize with all groups
    ['all'].forEach(key => groups[key] = []);
    
    tasks.forEach(task => {
      groups['all'].push(task);
      
      // Group by clientGroup
      const clientGroup = task.clientGroup?.trim() || 'Unassigned';
      if (!groups[clientGroup]) groups[clientGroup] = [];
      groups[clientGroup].push(task);
    });
    
    return groups;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return groupedTasks[selectedGroup] || [];
  }, [groupedTasks, selectedGroup]);

  const yearTotalEarnings = useMemo(() => {
    return tasks.reduce((sum, t) =>
      (t.dueDate instanceof Date && t.dueDate.getFullYear() === selectedYear)
        ? sum + (t.totalPrice || 0)
        : sum
    , 0);
  }, [tasks, selectedYear]);

  const projectStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((task) => task.status === 'Completed').length;
    const inProgress = filteredTasks.filter((task) => task.status === 'InProcess').length;
    const waitingForQuote = filteredTasks.filter((task) => task.status === 'Waiting for Quote').length;
    const totalValue = filteredTasks.reduce((sum, task) => sum + (task.totalPrice || 0), 0);

    return {
      total,
      completed,
      inProgress,
      waitingForQuote,
      totalValue,
    };
  }, [filteredTasks]);

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-screen sticky top-0">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <Logo />
          </div>

          {/* Primary Navigation */}
          <div className="px-3 py-4 border-b border-gray-200 space-y-1">
            {user?.permissions?.canViewTasks && (
              <Link href="/tasks" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                <span className="flex-1 text-left">Team Tasks</span>
              </Link>
            )}
            {user?.permissions?.canViewTasks && (
              <button
                onClick={() => {
                  setActiveTab('tasks');
                  setActiveClientTab(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'tasks' && !activeClientTab
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="flex-1 text-left">All Projects</span>
                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">{filteredTasks.length}</span>
              </button>
            )}

            {user?.permissions?.canViewClients && (
              <button
                onClick={async () => {
                  setActiveTab('clients');
                  setActiveClientTab(null);
                  await refreshClients();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'clients' && !activeClientTab
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="flex-1 text-left">Clients</span>
                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">{clients.length}</span>
              </button>
            )}

            {user?.permissions?.canViewClients && (
              <button
                onClick={() => {
                  setActiveTab('hosting');
                  setActiveClientTab(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'hosting'
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="flex-1 text-left">Hosting</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('expenses');
                  setActiveClientTab(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'expenses'
                    ? 'bg-amber-50 text-amber-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1 text-left">Monthly Exp</span>
              </button>
            )}

            {(user?.role === 'admin' || user?.permissions?.canManageUsers) && (
              <button
                onClick={() => {
                  setActiveTab('users');
                  setActiveClientTab(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span className="flex-1 text-left">Team</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('company-data');
                  setActiveClientTab(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'company-data'
                    ? 'bg-rose-50 text-rose-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="flex-1 text-left">Company Data</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <Link
                href="/invoices"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1 text-left">Invoices</span>
              </Link>
            )}
          </div>

          {/* Open client tabs */}
          {user?.permissions?.canViewClients && openClientTabs.length > 0 && (
            <div className="px-3 py-3 border-b border-gray-200">
              <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Open</h2>
              <div className="space-y-1">
                {openClientTabs.map((clientName) => (
                  <div
                    key={clientName}
                    onClick={() => setActiveClientTab(clientName)}
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                      activeClientTab === clientName
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="flex-1 truncate">{clientName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseClientTab(clientName);
                      }}
                      className="w-4 h-4 rounded-full hover:bg-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Close tab"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: current user + logout */}
          <div className="mt-auto p-4 border-t border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-medium">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight truncate">{user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize leading-tight">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors shrink-0"
                title="Sign Out"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Tab Content */}
          {activeClientTab && user?.permissions?.canViewClients ? (
            /* Individual Client Tab */
            <div className="flex-1">
              <ClientTab
                clientName={activeClientTab}
                tasks={tasks}
                onClose={() => handleCloseClientTab(activeClientTab)}
                onOpenProject={(taskId) => {
                  setAutoEditTaskId(taskId);
                  setActiveTab('tasks');
                  setActiveClientTab(null);
                }}
                onAddProject={() => openAddProjectModal(activeClientTab)}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          ) : activeTab === 'tasks' && user?.permissions?.canViewTasks ? (
            <>
              <div className="border-b border-slate-200 bg-white px-4 py-4 text-slate-900 sm:px-5 sm:py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      Project workspace
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                      {selectedGroup === 'all' ? 'All Projects' : selectedGroup}
                      <span className="ml-2 text-base font-normal text-slate-500">• {selectedYear}</span>
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                      Keep milestones and client activity visible in one place.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.1em 1.1em',
                        paddingRight: '2.5rem',
                      }}
                      title="Select year to view projects"
                    >
                      {Array.from({ length: 6 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                    {user?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => setShowYearEarnings(!showYearEarnings)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          title={showYearEarnings ? 'Hide yearly earnings' : 'Show yearly earnings'}
                        >
                          £{showYearEarnings ? yearTotalEarnings.toFixed(2) : '••••'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openAddProjectModal()}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={!user?.permissions?.canEditTasks}
                      title={!user?.permissions?.canEditTasks ? "You don&apos;t have permission to create projects" : "Create a new project"}
                    >
                      + Add Project
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Projects</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{projectStats.total}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">In progress</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{projectStats.inProgress}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Completed</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{projectStats.completed}</p>
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setShowProjectValue(!showProjectValue)}
                      className="rounded-lg bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100"
                      title={showProjectValue ? 'Click to hide project value' : 'Click to show project value'}
                    >
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Project value</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {showProjectValue ? `£${projectStats.totalValue.toFixed(2)}` : '••••'}
                      </p>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-slate-50 p-2 sm:p-3">
                {error ? (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                ) : null}

                {filteredTasks.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No projects found</h3>
                    <p className="mt-2 max-w-md text-sm text-slate-500">
                      {selectedYear !== new Date().getFullYear()
                        ? `No projects found for ${selectedYear}. Try selecting a different year or create a new project.`
                        : 'Get started by creating your first project.'}
                    </p>
                    <button
                      onClick={() => openAddProjectModal()}
                      className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={!user?.permissions?.canEditTasks}
                      title={!user?.permissions?.canEditTasks ? "You don&apos;t have permission to create projects" : "Create your first project"}
                    >
                      Create First Project
                    </button>
                  </div>
                ) : (
                  <TaskList
                    tasks={filteredTasks}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    selectedGroup={selectedGroup === 'all' ? undefined : selectedGroup}
                    autoEditTaskId={autoEditTaskId || undefined}
                  />
                )}
              </div>
            </>
          ) : activeTab === 'clients' && user?.permissions?.canViewClients ? (
            /* Clients Content */
            <div className="flex-1 bg-gray-50">
              <ClientsList
                tasks={tasks}
                onOpenClientTab={handleOpenClientTab}
                onClientCreated={handleClientCreated}
              />
            </div>
          ) : activeTab === 'hosting' && user?.permissions?.canViewClients ? (
            /* Hosting Content */
            <div className="flex-1 bg-gray-50">
              <HostingManagement />
            </div>
          ) : activeTab === 'expenses' && user?.role === 'admin' ? (
            /* Monthly Expenses Content */
            <div className="flex-1 bg-gray-50">
              <MonthlyExpenses tasks={tasks} />
            </div>
          ) : activeTab === 'users' && (user?.role === 'admin' || user?.permissions?.canManageUsers) ? (
            /* Users Content */
            <div className="flex-1 bg-gray-50">
              <UserManagement />
            </div>
          ) : activeTab === 'company-data' && user?.role === 'admin' ? (
            /* Company Data Content */
            <div className="flex-1 bg-gray-50">
              <CompanyDataManagement />
            </div>
          ) : (
            /* No Permission Message */
            <div className="flex-1 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-500">
                  You don&apos;t have permission to access this section. Please contact your administrator.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddTask
        isVisible={showAddTaskModal}
        onClose={() => {
          setShowAddTaskModal(false);
          setAddProjectDefaultClient(undefined);
        }}
        onAddTask={handleAddTask}
        defaultClientName={addProjectDefaultClient}
      />
    </div>
  );
}
