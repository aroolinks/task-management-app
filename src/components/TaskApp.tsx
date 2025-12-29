'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Task, TaskInput } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import TaskList from '@/components/TaskList';
import Logo from '@/components/Logo';

// Default sidebar groups
const DEFAULT_GROUPS: readonly string[] = ['Casey', 'Jack', 'Upwork', 'Personal'] as const;

// UI group type (id optional when not yet persisted)
interface UiGroup { id?: string; name: string }

export default function TaskApp() {
  const { user, logout } = useAuth();
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks();
  const { assignees, addAssignee, removeAssignee, refreshAssignees } = useAssignees();
  const { groups: contextGroups, addGroup } = useGroups();
  const [autoEditTaskId, setAutoEditTaskId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const year = new Date().getFullYear();
  const [showYearEarnings, setShowYearEarnings] = useState(false);

  // Sidebar project groups (server-persisted with local fallback)
  const [groups, setGroups] = useState<UiGroup[]>(Array.from(DEFAULT_GROUPS).map(name => ({ name })));
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  // Assignee management states
  const [showAssigneeForm, setShowAssigneeForm] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
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
        setAssigneeError(null);
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
      setAssigneeError('Please enter an assignee name');
      return;
    }
    const exists = assignees.some(a => a.toLowerCase() === name.toLowerCase());
    if (exists) {
      setAssigneeError('This assignee already exists');
      return;
    }
    if (name.length > 50) {
      setAssigneeError('Assignee name is too long');
      return;
    }

    // Add to local list immediately for better UX
    addAssignee(name);
    setNewAssigneeName('');
    setAssigneeError(null);
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

  const handleAddInlineTask = async () => {
    const payload: TaskInput = {
      clientName: '',
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
    };
    const created = await createTask(payload);
    if (created) {
      setAutoEditTaskId(created.id);
      refreshAssignees();
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
      (t.dueDate instanceof Date && t.dueDate.getFullYear() === year)
        ? sum + (t.totalPrice || 0)
        : sum
    , 0);
  }, [tasks, year]);

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      <div className="flex relative">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col min-h-screen">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50">
            <Logo />
            <div className="mt-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200">Welcome back</p>
                <p className="text-xs text-slate-400">{user?.username}</p>
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2-2 2M5 13l-2-2 2-2m8 8v-8a4 4 0 00-8 0v8a4 4 0 008 0z" />
                  </svg>
                  Project Groups
                </h2>
                <button
                  onClick={() => setShowGroupForm(true)}
                  className="w-6 h-6 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-300 transition-all duration-200 btn-hover"
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
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-all duration-200 group ${
                  selectedGroup === 'all'
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-slate-100 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedGroup === 'all' ? 'bg-blue-400' : 'bg-slate-500'}`}></div>
                    <span className="text-sm font-medium">All Tasks</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedGroup === 'all' 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-slate-600/50 text-slate-400'
                  }`}>
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
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group ${
                      selectedGroup === group.name
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-slate-100 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedGroup === group.name ? 'bg-blue-400' : 'bg-slate-500'}`}></div>
                        <span className="text-sm font-medium truncate">{group.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedGroup === group.name 
                          ? 'bg-blue-500/20 text-blue-300' 
                          : 'bg-slate-600/50 text-slate-400'
                      }`}>
                        {groupCounts[group.name] || 0}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Add Group Form */}
              {showGroupForm && (
                <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full px-2 py-1.5 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    autoFocus
                  />
                  {groupError && (
                    <p className="text-red-400 text-xs mt-1">{groupError}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAddProjectGroup}
                      className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-all duration-200 btn-hover"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowGroupForm(false);
                        setNewGroupName('');
                        setGroupError(null);
                      }}
                      className="flex-1 px-2 py-1.5 bg-slate-600/50 hover:bg-slate-500/50 text-slate-300 rounded text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assignees with Tasks */}
            <div className="p-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Team Assignments
                </h2>
                <button
                  onClick={() => setShowAssigneeForm(true)}
                  className="w-6 h-6 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-300 transition-all duration-200 btn-hover"
                  title="Add new assignee"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* All Assignees Button */}
              <button
                onClick={() => setSelectedAssignee('all')}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-all duration-200 ${
                  selectedAssignee === 'all'
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-slate-100 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedAssignee === 'all' ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
                    <span className="text-sm font-medium">All Assignees</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedAssignee === 'all' 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : 'bg-slate-600/50 text-slate-400'
                  }`}>
                    {tasks.length}
                  </span>
                </div>
              </button>

              {/* Individual Assignees */}
              <div className="space-y-1">
                {assignees.map(assignee => {
                  const assignedTasks = assigneesWithTasks[assignee] || [];
                  const taskCount = assignedTasks.length;
                  return (
                    <div
                      key={assignee}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${
                        selectedAssignee === assignee
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-slate-100 border border-emerald-500/30'
                          : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedAssignee(assignee)}
                        className="flex items-center gap-2 flex-1"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedAssignee === assignee ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
                        <span className="text-sm font-medium truncate">{assignee}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedAssignee === assignee 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : taskCount > 0 
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-600/50 text-slate-500'
                        }`}>
                          {taskCount}
                        </span>
                      </button>
                      
                      {/* Delete Assignee Button */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove "${assignee}" from the team?${taskCount > 0 ? ` This will unassign them from ${taskCount} task(s).` : ''}`)) {
                            removeAssignee(assignee);
                            if (selectedAssignee === assignee) {
                              setSelectedAssignee('all');
                            }
                          }
                        }}
                        className="w-5 h-5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title={`Remove ${assignee} from team`}
                      >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {assignees.length === 0 && (
                  <div className="text-slate-500 text-xs text-center py-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <svg className="h-6 w-6 mx-auto mb-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    No team members yet
                  </div>
                )}
              </div>

              {/* Add Assignee Form */}
              {showAssigneeForm && (
                <div ref={assigneeFormRef} className="mt-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm shadow-lg">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Add New Team Member</h4>
                    <p className="text-xs text-slate-400">Enter the name of the new team member</p>
                  </div>
                  <input
                    type="text"
                    value={newAssigneeName}
                    onChange={(e) => setNewAssigneeName(e.target.value)}
                    placeholder="Team member name..."
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddAssignee();
                      } else if (e.key === 'Escape') {
                        setShowAssigneeForm(false);
                        setNewAssigneeName('');
                        setAssigneeError(null);
                      }
                    }}
                  />
                  {assigneeError && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {assigneeError}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddAssignee}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium transition-all duration-200 btn-hover shadow-lg"
                    >
                      Add Member
                    </button>
                    <button
                      onClick={() => {
                        setShowAssigneeForm(false);
                        setNewAssigneeName('');
                        setAssigneeError(null);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-600/50 hover:bg-slate-500/50 text-slate-300 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">
                  {selectedGroup === 'all' ? 'All Tasks' : selectedGroup}
                  {selectedAssignee !== 'all' && (
                    <span className="text-lg font-normal text-blue-400 ml-2">→ {selectedAssignee}</span>
                  )}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium bg-slate-700/50 text-slate-300 rounded-full border border-slate-600/50">
                    {filteredTasks.length} tasks
                  </span>
                  <button
                    onClick={() => setShowYearEarnings(!showYearEarnings)}
                    className="px-2 py-1 text-xs font-medium bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-slate-200 rounded-full border border-slate-600/50 transition-all duration-200"
                    title={showYearEarnings ? 'Hide yearly earnings' : 'Show yearly earnings'}
                  >
                    {year}: {showYearEarnings ? `£${yearTotalEarnings.toFixed(2)}` : '••••'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-slate-400 hover:text-slate-300 border border-slate-600/50 hover:border-slate-500/50 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
                <button
                  onClick={handleAddInlineTask}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 btn-hover flex items-center gap-1 shadow-lg text-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Task
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {error ? (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-red-300 text-sm font-medium">Error: {error}</p>
                </div>
              </div>
            ) : null}

            <TaskList
              tasks={filteredTasks}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
              selectedGroup={selectedGroup === 'all' ? undefined : selectedGroup}
              autoEditTaskId={autoEditTaskId || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}