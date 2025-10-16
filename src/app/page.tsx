'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Task, TaskInput } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';
import TaskList from '@/components/TaskList';
import Logo from '@/components/Logo';
import AddTask from '@/components/AddTask';

// Default sidebar groups
const DEFAULT_GROUPS: readonly string[] = ['Casey', 'Jack', 'Upwork', 'Personal'] as const;

// UI group type (id optional when not yet persisted)
interface UiGroup { id?: string; name: string }

export default function Home() {
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks();
  const { assignees, addAssignee, refreshAssignees } = useAssignees();
  const { groups: contextGroups, addGroup, refreshGroups } = useGroups();
  const [isAddTaskVisible, setIsAddTaskVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Sidebar project groups (server-persisted with local fallback)
  const [groups, setGroups] = useState<UiGroup[]>(Array.from(DEFAULT_GROUPS).map(name => ({ name })));
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null); // id or name
  const [editingName, setEditingName] = useState('');

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

  const handleAddTask = async (taskInput: TaskInput) => {
    const success = await createTask(taskInput);
    if (success) {
      setIsAddTaskVisible(false);
      // Refresh assignees list in case a new assignee was added
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
    if (updates.assignee !== undefined) {
      refreshAssignees();
    }
  }, [updateTask, refreshAssignees]);

  // Group tasks and calculate counts
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      const groupName = task.clientGroup || 'Ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(task);
    });
    return groups;
  }, [tasks]);

  const totalTasks = tasks.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4 text-xl">❌ Error loading tasks</div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo and Header */}
        <div className="p-6 border-b border-slate-700">
          <Logo size="md" />
          <div className="mt-4 bg-slate-700 text-slate-100 px-3 py-1 rounded text-sm font-medium inline-block">
            {totalTasks} {totalTasks === 1 ? 'Project' : 'Projects'}
          </div>
        </div>

        {/* Add New Project Button */}
        <div className="p-4">
          <button
            onClick={() => setIsAddTaskVisible(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Project
          </button>
        </div>

        {/* Project Groups */}
        <div className="flex-1 px-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Project Groups
              <button
                className="text-slate-500 hover:text-slate-300"
                onClick={() => {
                  setShowGroupForm(s => !s);
                  setGroupError(null);
                }}
                aria-label="Add project group"
                title="Add project group"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </h3>

            {showGroupForm && (
              <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
                <label className="block text-xs text-slate-400 mb-1">New Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => { setNewGroupName(e.target.value); setGroupError(null); }}
                  placeholder="e.g. Client ABC"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {groupError && <p className="mt-2 text-xs text-red-400">{groupError}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleAddProjectGroup}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowGroupForm(false); setNewGroupName(''); setGroupError(null); }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* All Groups */}
            <button
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors mb-1 ${
                selectedGroup === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => setSelectedGroup('all')}
            >
              <span className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                All Groups
              </span>
              <span className="text-xs bg-slate-600 px-2 py-1 rounded">{totalTasks}</span>
            </button>

            {/* Individual Groups */}
            {groups.map((group, index) => {
              const groupTasks = groupedTasks[group.name] || [];
              const colors = ['bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
              const color = colors[index % colors.length];
              const isEditing = editingKey === (group.id || group.name);

              return (
                <div key={group.id || group.name} className="mb-1">
                  {isEditing ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const newName = editingName.trim();
                            if (!newName) return;
                            if (group.id) {
                              try {
                                const res = await fetch(`/api/groups/${group.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: newName })
                                });
                                if (!res.ok) return;
                              } catch {}
                            }
                            setGroups(prev => prev.map(g => (g.id === group.id && group.id ? { ...g, name: newName } : (g.name === group.name && !g.id ? { ...g, name: newName } : g))));
                            if (selectedGroup === group.name) setSelectedGroup(newName);
                            setEditingKey(null);
                            setEditingName('');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingKey(null); setEditingName(''); }}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-md text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedGroup === group.name ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                    }`}>
                      <button
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => setSelectedGroup(group.name)}
                      >
                        <div className={`w-2 h-2 rounded-full ${color}`}></div>
                        <span className="truncate">{group.name}</span>
                      </button>
                      <span className="text-xs bg-slate-600 px-2 py-1 rounded mr-2">{groupTasks.length}</span>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-slate-400 hover:text-slate-200"
                          title="Edit group"
                          onClick={() => { setEditingKey(group.id || group.name); setEditingName(group.name); }}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.121 2.121 0 10-3-3L5 17v3z"/></svg>
                        </button>
                        <button
                          className="text-red-400 hover:text-red-300"
                          title="Delete group"
                          onClick={async () => {
                            if (!confirm('Delete this group? Tasks will remain with the old name.')) return;
                            if (group.id) {
                              try { await fetch(`/api/groups/${group.id}`, { method: 'DELETE' }); } catch {}
                            }
                            setGroups(prev => prev.filter(g => (g.id ? g.id !== group.id : g.name !== group.name)));
                            if (selectedGroup === group.name) setSelectedGroup('all');
                          }}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Task Management</h1>
              <p className="text-slate-400 text-sm mt-1">Stay organized and track your tasks efficiently</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Add Assignee Section */}
              <div className="relative" ref={assigneeFormRef}>
                <button
                  onClick={() => {
                    setShowAssigneeForm(s => !s);
                    setAssigneeError(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm"
                  title="Add new team member"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add Assignee
                </button>
                
                {/* Assignee Form Dropdown */}
                {showAssigneeForm && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4 z-50">
                    <h4 className="text-sm font-medium text-slate-200 mb-3">Add New Team Member</h4>
                    <input
                      type="text"
                      value={newAssigneeName}
                      onChange={(e) => { setNewAssigneeName(e.target.value); setAssigneeError(null); }}
                      placeholder="Enter assignee name..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAssignee()}
                      autoFocus
                    />
                    {assigneeError && <p className="text-xs text-red-400 mb-3">{assigneeError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddAssignee}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAssigneeForm(false); setNewAssigneeName(''); setAssigneeError(null); }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-md text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>arcolinks@gmail.com</span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  A
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Content */}
        <div className="flex-1 p-6">
          <TaskList 
            tasks={tasks}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            selectedGroup={selectedGroup}
          />
        </div>
      </div>
        
      <AddTask 
        onAddTask={handleAddTask}
        isVisible={isAddTaskVisible}
        onClose={() => setIsAddTaskVisible(false)}
      />
    </div>
  );
}
