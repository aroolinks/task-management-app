'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Task, TaskInput } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import TaskList from '@/components/TaskList';
import Logo from '@/components/Logo';
import AddTask from '@/components/AddTask';

// Default sidebar groups
const DEFAULT_GROUPS: readonly string[] = ['Casey', 'Jack', 'Upwork', 'Personal'] as const;

// UI group type (id optional when not yet persisted)
interface UiGroup { id?: string; name: string }

export default function TaskApp() {
  const { user, logout } = useAuth();
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks();
  const { assignees, addAssignee, refreshAssignees } = useAssignees();
  const { groups: contextGroups, addGroup } = useGroups();
  const [isAddTaskVisible, setIsAddTaskVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

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
      if (task.assignee) {
        if (!assigneeMap[task.assignee]) {
          assigneeMap[task.assignee] = [];
        }
        assigneeMap[task.assignee].push(task);
      }
    });
    return assigneeMap;
  }, [tasks]);

  const filteredTasks = groupedTasks[selectedGroup] || [];

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <Logo />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">Welcome, {user?.username}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-slate-300 underline"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Groups */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-200">Project Groups</h2>
                <button
                  onClick={() => setShowGroupForm(true)}
                  className="text-slate-400 hover:text-slate-300 text-xl"
                  title="Add new group"
                >
                  +
                </button>
              </div>

              {/* All Tasks */}
              <button
                onClick={() => setSelectedGroup('all')}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                  selectedGroup === 'all'
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                }`}
              >
                <span>All Tasks</span>
                <span className="float-right text-xs bg-slate-600 px-2 py-1 rounded">
                  {groupCounts['all'] || 0}
                </span>
              </button>

              {/* Project Groups */}
              {groups.map(group => (
                <button
                  key={group.id || group.name}
                  onClick={() => setSelectedGroup(group.name)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                    selectedGroup === group.name
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  <span>{group.name}</span>
                  <span className="float-right text-xs bg-slate-600 px-2 py-1 rounded">
                    {groupCounts[group.name] || 0}
                  </span>
                </button>
              ))}

              {/* Add Group Form */}
              {showGroupForm && (
                <div className="mt-3 p-3 bg-slate-700 rounded-md">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-600 text-slate-100 rounded-md text-sm"
                    autoFocus
                  />
                  {groupError && (
                    <p className="text-red-400 text-xs mt-1">{groupError}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAddProjectGroup}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowGroupForm(false);
                        setNewGroupName('');
                        setGroupError(null);
                      }}
                      className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assignees with Tasks */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-200">Team Assignments</h2>
                <button
                  onClick={() => setShowAssigneeForm(true)}
                  className="text-slate-400 hover:text-slate-300 text-xl"
                  title="Add new assignee"
                >
                  +
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(assigneesWithTasks).map(([assignee, assignedTasks]) => (
                  <div key={assignee} className="bg-slate-700/50 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate-200 text-sm">{assignee}</h3>
                      <span className="text-xs bg-slate-600 px-2 py-1 rounded text-slate-300">
                        {assignedTasks.length} tasks
                      </span>
                    </div>
                    <div className="space-y-1">
                      {assignedTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="text-xs text-slate-400 truncate">
                          • {task.clientName} ({task.clientGroup})
                        </div>
                      ))}
                      {assignedTasks.length > 3 && (
                        <div className="text-xs text-slate-500">
                          +{assignedTasks.length - 3} more tasks...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(assigneesWithTasks).length === 0 && (
                  <div className="text-slate-500 text-sm text-center py-4">
                    No assignments yet
                  </div>
                )}
              </div>

              {/* Add Assignee Form */}
              {showAssigneeForm && (
                <div ref={assigneeFormRef} className="mt-3 p-3 bg-slate-700 rounded-md">
                  <input
                    type="text"
                    value={newAssigneeName}
                    onChange={(e) => setNewAssigneeName(e.target.value)}
                    placeholder="Assignee name"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-600 text-slate-100 rounded-md text-sm"
                    autoFocus
                  />
                  {assigneeError && (
                    <p className="text-red-400 text-xs mt-1">{assigneeError}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAddAssignee}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAssigneeForm(false);
                        setNewAssigneeName('');
                        setAssigneeError(null);
                      }}
                      className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded-md text-sm"
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
          <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                {selectedGroup === 'all' ? 'All Tasks' : selectedGroup}
                <span className="ml-2 text-lg font-normal text-slate-400">
                  ({filteredTasks.length})
                </span>
              </h1>
              <button
                onClick={() => setIsAddTaskVisible(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {error ? (
              <div className="text-red-400 mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
                Error: {error}
              </div>
            ) : null}

            <TaskList
              tasks={filteredTasks}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
              selectedGroup={selectedGroup === 'all' ? undefined : selectedGroup}
            />
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTask
        isVisible={isAddTaskVisible}
        onClose={() => setIsAddTaskVisible(false)}
        onAddTask={handleAddTask}
      />
    </div>
  );
}