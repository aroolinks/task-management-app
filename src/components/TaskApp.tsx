'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Task, TaskInput } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClients, Client } from '@/hooks/useClients';
import TaskList from '@/components/TaskList';
import ClientsList from '@/components/ClientsList';
import ClientTab from '@/components/ClientTab';
import Logo from '@/components/Logo';

// Default sidebar groups
const DEFAULT_GROUPS: readonly string[] = ['Casey', 'Jack', 'Upwork', 'Personal'] as const;

// UI group type (id optional when not yet persisted)
interface UiGroup { id?: string; name: string }

export default function TaskApp() {
  const { user, logout } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks(selectedYear);
  const { assignees, addAssignee, refreshAssignees } = useAssignees();
  const { groups: contextGroups, addGroup } = useGroups();
  const { clients } = useClients();
  const [autoEditTaskId, setAutoEditTaskId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [showYearEarnings, setShowYearEarnings] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'clients'>('tasks');
  const [openClientTabs, setOpenClientTabs] = useState<string[]>([]);
  const [activeClientTab, setActiveClientTab] = useState<string | null>(null);

  // Sidebar project groups (server-persisted with local fallback)
  const [groups, setGroups] = useState<UiGroup[]>(Array.from(DEFAULT_GROUPS).map(name => ({ name })));
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  // Assignee management states
  const [showAssigneeForm, setShowAssigneeForm] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const assigneeFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load from server first; fall back to localStorage
    const load = async () => {
      try {
        const res = await fetch('/api/groups', { cache: 'no-store' });
        if (res.ok) {
          const json: { success: boolean; data?: { _id: string; name: string }[] } = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setGroups(json.data.map(g => ({ id: g._id, name: g.name })));
            return;
          }
        }
      } catch {}
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('projectGroups') : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every(g => typeof g === 'string')) {
            setGroups(parsed.map((name: string) => ({ name })));
          }
        }
      } catch {}
    };
    load();
  }, []);

  // Merge any groups found on tasks into the sidebar list (without duplicates)
  useEffect(() => {
    const taskGroups = Array.from(
      new Set(tasks.map(t => (t.clientGroup || '').trim()).filter(Boolean))
    );
    setGroups(prev => {
      const names = new Set(prev.map(g => g.name.toLowerCase()));
      const additions = taskGroups.filter(n => !names.has(n.toLowerCase())).map(name => ({ name } as UiGroup));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [tasks]);

  // Handle click outside for assignee form
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeFormRef.current && !assigneeFormRef.current.contains(event.target as Node)) {
        setShowAssigneeForm(false);
        setNewAssigneeName('');
      }
    }

    if (showAssigneeForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAssigneeForm]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('projectGroups', JSON.stringify(groups.map(g => g.name)));
      }
    } catch {}
  }, [groups]);

  const handleLogout = async () => {
    await logout();
  };

  const handleAddAssignee = async () => {
    const name = newAssigneeName.trim();
    if (!name) {
      return;
    }
    const exists = assignees.some(a => a.toLowerCase() === name.toLowerCase());
    if (exists) {
      return;
    }
    if (name.length > 50) {
      return;
    }

    // Add to local list immediately for better UX
    addAssignee(name);
    setNewAssigneeName('');
    setShowAssigneeForm(false);
  };

  const handleAddProjectGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      setGroupError('Please enter a group name');
      return;
    }
    const exists = groups.some(g => g.name.toLowerCase() === name.toLowerCase()) || 
                  contextGroups.some(g => g.toLowerCase() === name.toLowerCase());
    if (exists) {
      setGroupError('This group already exists');
      return;
    }
    if (name.length > 40) {
      setGroupError('Group name is too long');
      return;
    }

    // Try server first
    let created: UiGroup | null = null;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const json: { success: boolean; data?: { _id: string; name: string } } = await res.json();
        if (json.success && json.data) {
          created = { id: json.data._id, name: json.data.name };
        }
      } else if (res.status === 409) {
        setGroupError('This group already exists');
        return;
      }
    } catch {
      // Ignore network errors; still add locally for UX
    }

    const toAdd = created ?? ({ name } as UiGroup);
    setGroups(prev => [...prev, toAdd]);
    
    // Also add to global context for dropdowns
    addGroup(name);
    
    setSelectedGroup(name);
    setNewGroupName('');
    setGroupError(null);
    setShowGroupForm(false);
  };

  const handleAddInlineTask = async (clientName?: string) => {
    const payload: TaskInput = {
      clientName: clientName || 'New Task',
      clientGroup: selectedGroup !== 'all' ? selectedGroup : 'Personal',
      completed: false,
      priority: 'Low',
      status: 'InProcess',
      cms: null,
      webUrl: '',
      figmaUrl: '',
      assetUrl: '',
      totalPrice: null,
      deposit: null,
      dueDate: new Date(),
      invoiced: false,
      paid: false,
      assignees: [],
      notes: '',
    };
    const created = await createTask(payload);
    if (created) {
      setAutoEditTaskId(created.id);
      refreshAssignees();
      // Switch to tasks tab after creating a task
      setActiveTab('tasks');
      setActiveClientTab(null);
      // Force a re-render to update sidebar task counts
      console.log('Task created for client:', created.clientName);
    }
  };

  const handleOpenClientTab = (clientName: string) => {
    if (!openClientTabs.includes(clientName)) {
      setOpenClientTabs(prev => [...prev, clientName]);
    }
    setActiveClientTab(clientName);
  };

  const handleClientCreated = (newClient: Client) => {
    // Force a refresh of the clients data to ensure sidebar updates
    console.log('New client created:', newClient.name);
    // The client should already be in the state, but let's ensure the component re-renders
    // by triggering a small state update
    setActiveTab(prev => prev); // This will trigger a re-render
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

  // Calculate counts for each group
  const groupCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    Object.keys(groupedTasks).forEach(group => {
      counts[group] = groupedTasks[group].length;
    });
    return counts;
  }, [groupedTasks]);

  // Get assignees with their assigned tasks
  const assigneesWithTasks = useMemo(() => {
    const assigneeMap: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      if (task.assignees && task.assignees.length) {
        task.assignees.forEach(name => {
          if (!assigneeMap[name]) assigneeMap[name] = [];
          assigneeMap[name].push(task);
        });
      }
    });
    return assigneeMap;
  }, [tasks]);

  // Filter tasks by both group and assignee
  const filteredTasks = useMemo(() => {
    let tasks = groupedTasks[selectedGroup] || [];
    
    // Filter by assignee if not 'all'
    if (selectedAssignee !== 'all') {
      tasks = tasks.filter(task => (task.assignees || []).includes(selectedAssignee));
    }
    
    return tasks;
  }, [groupedTasks, selectedGroup, selectedAssignee]);

  const yearTotalEarnings = useMemo(() => {
    return tasks.reduce((sum, t) =>
      (t.dueDate instanceof Date && t.dueDate.getFullYear() === selectedYear)
        ? sum + (t.totalPrice || 0)
        : sum
    , 0);
  }, [tasks, selectedYear]);

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col min-h-screen">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <Logo />
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
          </div>

          {/* Groups/Clients Section */}
          <div className="flex-1 p-6">
            {/* Show Clients when in clients tab or client tabs */}
            {(activeTab === 'clients' || activeClientTab) ? (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Clients</h2>
                  <button
                    onClick={() => {
                      setActiveTab('clients');
                      setActiveClientTab(null);
                    }}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                    title="View all clients"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* All Clients */}
                <button
                  key={`all-clients-${clients.length}-${clients.map(c => c.notes.length).join('-')}`}
                  onClick={() => {
                    setActiveTab('clients');
                    setActiveClientTab(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                    activeTab === 'clients' && !activeClientTab
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Clients</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      {clients.length}
                    </span>
                  </div>
                </button>

                {/* Individual Clients */}
                <div className="space-y-1" key={`clients-${clients.length}-${clients.map(c => c.notes.length).join('-')}`}>
                  {clients.map((client) => {
                    const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;
                    const notesIndicator = noteCount > 0 ? '📝' : '';
                    
                    return (
                      <button
                        key={`${client.id}-${noteCount}`}
                        onClick={() => handleOpenClientTab(client.name)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          activeClientTab === client.name
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{client.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              {noteCount}
                            </span>
                            {notesIndicator && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-700 rounded" title={`${noteCount} notes`}>
                                {notesIndicator}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Show Projects when in tasks tab */
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Projects</h2>
                  <button
                    onClick={() => setShowGroupForm(true)}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                    title="Add new group"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* All Tasks */}
                <button
                  onClick={() => {
                    setSelectedGroup('all');
                    setSelectedAssignee('all');
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                    selectedGroup === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Tasks</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      {groupCounts['all'] || 0}
                    </span>
                  </div>
                </button>

                {/* Project Groups */}
                <div className="space-y-1">
                  {groups.map(group => (
                    <button
                      key={group.id || group.name}
                      onClick={() => {
                        setSelectedGroup(group.name);
                        setSelectedAssignee('all');
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedGroup === group.name
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{group.name}</span>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                          {groupCounts[group.name] || 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Add Group Form */}
                {showGroupForm && (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 bg-white"
                      autoFocus
                    />
                    {groupError && (
                      <p className="text-red-600 text-xs mt-1">{groupError}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleAddProjectGroup}
                        className="flex-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded text-sm transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowGroupForm(false);
                          setNewGroupName('');
                          setGroupError(null);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Section - Only show in tasks tab */}
            {activeTab === 'tasks' && !activeClientTab && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Team</h2>
                  <button
                    onClick={() => setShowAssigneeForm(true)}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                    title="Add team member"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* All Team */}
                <button
                  onClick={() => {
                    setSelectedGroup('all');
                    setSelectedAssignee('all');
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                    selectedAssignee === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Team</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      {assignees.length}
                    </span>
                  </div>
                </button>

                {/* Individual Team Members */}
                <div className="space-y-1">
                  {assignees.map((assignee) => {
                    const assigneeTasks = assigneesWithTasks[assignee] || [];
                    return (
                      <button
                        key={assignee}
                        onClick={() => {
                          setSelectedGroup('all');
                          setSelectedAssignee(assignee);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedAssignee === assignee
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{assignee}</span>
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                            {assigneeTasks.length}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add Team Member Form */}
                {showAssigneeForm && (
                  <div ref={assigneeFormRef} className="mt-3 p-3 bg-white border border-gray-200 rounded">
                    <input
                      type="text"
                      value={newAssigneeName}
                      onChange={(e) => setNewAssigneeName(e.target.value)}
                      placeholder="Team member name"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleAddAssignee}
                        className="flex-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded text-sm transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAssigneeForm(false);
                          setNewAssigneeName('');
                        }}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab('tasks');
                  setActiveClientTab(null);
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'tasks' && !activeClientTab
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Tasks
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {filteredTasks.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('clients');
                  setActiveClientTab(null);
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'clients' && !activeClientTab
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Clients
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {clients.length}
                  </span>
                </div>
              </button>
              
              {/* Client Tabs */}
              {openClientTabs.map((clientName) => (
                <button
                  key={clientName}
                  onClick={() => setActiveClientTab(clientName)}
                  className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap group ${
                    activeClientTab === clientName
                      ? 'border-green-500 text-green-600 bg-green-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="max-w-[120px] truncate">{clientName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseClientTab(clientName);
                      }}
                      className="w-4 h-4 rounded-full hover:bg-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Close tab"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeClientTab ? (
            /* Individual Client Tab */
            <div className="flex-1">
              <ClientTab
                clientName={activeClientTab}
                tasks={tasks}
                onEditTask={handleEditTask}
                onClose={() => handleCloseClientTab(activeClientTab)}
              />
            </div>
          ) : activeTab === 'tasks' ? (
            <>
              {/* Tasks Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {selectedGroup === 'all' ? 'All Tasks' : selectedGroup}
                      <span className="text-base font-normal text-gray-500 ml-3">• {selectedYear}</span>
                    </h1>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {filteredTasks.length} tasks
                      </span>
                      <button
                        onClick={() => setShowYearEarnings(!showYearEarnings)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded transition-colors"
                        title={showYearEarnings ? 'Hide yearly earnings' : 'Show yearly earnings'}
                      >
                        £{showYearEarnings ? yearTotalEarnings.toFixed(2) : '••••'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Year Selector */}
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white text-gray-900 cursor-pointer appearance-none"
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                      title="Select year to view tasks"
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
                    <button
                      onClick={() => handleAddInlineTask()}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded text-sm transition-colors"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks Content */}
              <div className="flex-1 p-6 bg-gray-50">
                {error ? (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                ) : null}

                {/* Task List */}
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                    <p className="text-gray-500 mb-6">
                      {selectedYear !== new Date().getFullYear() 
                        ? `No tasks found for ${selectedYear}. Try selecting a different year or create a new task.`
                        : 'Get started by creating your first task.'
                      }
                    </p>
                    <button
                      onClick={() => handleAddInlineTask()}
                      className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded transition-colors"
                    >
                      Create First Task
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
          ) : (
            /* Clients Content */
            <div className="flex-1 bg-gray-50">
              <ClientsList
                tasks={tasks}
                onOpenClientTab={handleOpenClientTab}
                onClientCreated={handleClientCreated}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}