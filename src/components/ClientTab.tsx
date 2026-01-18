'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task } from '@/types/task';
import { useClients, ClientTask } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeamMembers, onTeamMembersUpdated } from '@/utils/teamMembersSync';

interface ClientTabProps {
  clientName: string;
  tasks: Task[];
  onEditTask: (id: string, updates: Partial<Task>) => void;
  onClose: () => void;
}

export default function ClientTab({ clientName, tasks, onEditTask, onClose }: ClientTabProps) {
  const { user } = useAuth();
  const { clients, addTask, updateTask, deleteTask, toggleTaskCompletion, refreshClients } = useClients();
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'logins'>('tasks');
  const [taskFilter, setTaskFilter] = useState<'all' | 'assigned' | 'completed' | 'in-progress'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]); // Dynamic from API

  // Login details state - back to separate fields
  const [showAddLoginForm, setShowAddLoginForm] = useState(false);
  const [editingLoginId, setEditingLoginId] = useState<string | null>(null);
  const [loginWebsite, setLoginWebsite] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFormError, setLoginFormError] = useState<string | null>(null);

  // Find the client in the manual client system
  const client = useMemo(() => {
    return clients.find(c => c.name === clientName);
  }, [clients, clientName]);

  // Separate tasks and logins with filtering
  const { regularTasks, loginTasks, filteredRegularTasks } = useMemo(() => {
    if (!client || !Array.isArray(client.tasks)) {
      return { regularTasks: [], loginTasks: [], filteredRegularTasks: [] };
    }

    const regular: ClientTask[] = [];
    const logins: ClientTask[] = [];

    client.tasks.forEach(task => {
      // Check if this is a login task (has structured login format)
      if (task.content.includes('URL: ') && task.content.includes('Username: ') && task.content.includes('Password: ')) {
        logins.push(task);
      } else {
        regular.push(task);
      }
    });

    // Filter regular tasks based on current filters
    let filtered = regular;
    
    // Filter by status
    if (taskFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    } else if (taskFilter === 'in-progress') {
      filtered = filtered.filter(task => !task.completed);
    } else if (taskFilter === 'assigned') {
      filtered = filtered.filter(task => task.assignedTo);
    }
    
    // Filter by assignee
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(task => task.assignedTo === assigneeFilter);
    }

    return { regularTasks: regular, loginTasks: logins, filteredRegularTasks: filtered };
  }, [client, taskFilter, assigneeFilter]);

  // Debug: Log when client data changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ClientTab - client data changed:', client);
    }
  }, [client]);

  // Force refresh client data when component mounts
  useEffect(() => {
    const forceRefresh = async () => {
      console.log('🔄 ClientTab mounted - refreshing client data');
      await refreshClients();
    };
    forceRefresh();
  }, [clientName, refreshClients]);

  // Fetch users from users API
  useEffect(() => {
    const loadTeamMembers = async () => {
      const members = await fetchTeamMembers();
      setTeamMembers(members.length > 0 ? members : ['Admin']); // Fallback to Admin if no users
    };
    
    // Load initially
    loadTeamMembers();
    
    // Listen for updates when users are added/removed
    const cleanup = onTeamMembersUpdated(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Refreshing users due to user changes');
      }
      loadTeamMembers();
    });
    
    return cleanup;
  }, []);

  // Handle escape key to close login modal only
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddLoginForm) {
        setShowAddLoginForm(false);
        setEditingLoginId(null);
        setLoginWebsite('');
        setLoginUrl('');
        setLoginUsername('');
        setLoginPassword('');
        setLoginFormError(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddLoginForm]);

  // Get all notes for this client (from tasks - legacy support)
  const taskNotes = useMemo(() => {
    const notes: Array<{ id: string; content: string; lastUpdated: Date; taskId: string }> = [];
    
    tasks
      .filter(task => task.clientName === clientName)
      .forEach(task => {
        if (task.notes && task.notes.trim()) {
          notes.push({
            id: task.id,
            content: task.notes,
            lastUpdated: task.updatedAt || task.createdAt,
            taskId: task.id
          });
        }
      });

    return notes.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }, [tasks, clientName]);

  const handleAddTask = () => {
    setTaskTitle('');
    setTaskContent('');
    setTaskAssignedTo('');
    setTaskCompleted(false);
    setEditingTaskId(null);
    setShowAddTaskForm(true);
    setFormError(null);
  };

  const handleEditTask = (task: ClientTask) => {
    setTaskTitle(task.title);
    setTaskContent(task.content);
    setTaskAssignedTo(task.assignedTo || '');
    setTaskCompleted(task.completed || false);
    setEditingTaskId(task.id);
    setShowAddTaskForm(true);
    setFormError(null);
  };

  const handleSaveTask = async () => {
    if (!client) {
      console.error('No client found');
      return;
    }

    const title = taskTitle.trim();
    const content = taskContent.trim();
    const assignedTo = taskAssignedTo.trim() || undefined;
    const completed = taskCompleted;

    if (!title) {
      setFormError('Please enter a task title');
      return;
    }

    if (!content) {
      setFormError('Please enter task content');
      return;
    }

    console.log('Saving task:', { title, assignedTo, completed, clientId: client.id });

    setFormError(null);

    try {
      let success = false;
      
      if (editingTaskId) {
        success = await updateTask(client.id, editingTaskId, { title, content, assignedTo, completed });
      } else {
        const newTask = await addTask(client.id, { title, content, assignedTo, completed });
        success = newTask !== null;
        console.log('Task created:', newTask);
      }

      if (success) {
        setShowAddTaskForm(false);
        setTaskTitle('');
        setTaskContent('');
        setTaskAssignedTo('');
        setTaskCompleted(false);
        setEditingTaskId(null);
        await refreshClients();
        console.log('Task saved and clients refreshed');
      } else {
        setFormError('Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      setFormError('An error occurred while saving the task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!client) return;
    
    if (!taskId || taskId === '' || taskId === 'undefined') {
      alert('Cannot delete task: Invalid task ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      const success = await deleteTask(client.id, taskId);
      if (success) {
        await refreshClients();
      }
    }
  };

  const handleEditTaskNote = (taskId: string, currentNotes: string) => {
    // For task notes, we'll use a simple prompt for now
    const newNotes = prompt('Edit task note:', currentNotes);
    if (newNotes !== null) {
      onEditTask(taskId, { notes: newNotes });
    }
  };

  // Login Detail Functions - back to structured format but saving as tasks
  const handleAddLoginDetail = async () => {
    if (!client) {
      return;
    }
    
    const website = loginWebsite.trim();
    const url = loginUrl.trim();
    const username = loginUsername.trim();
    const password = loginPassword.trim();
    
    if (!website || !url || !username || !password) {
      setLoginFormError('All fields are required');
      return;
    }
    
    setLoginFormError(null);
    
    try {
      // Format the login details as structured text
      const title = website;
      const content = `URL: ${url}\nUsername: ${username}\nPassword: ${password}`;
      
      // Use the addTask function to save as a task
      const success = await addTask(client.id, { title, content });
      
      if (success) {
        // Reset form and close modal
        setLoginWebsite('');
        setLoginUrl('');
        setLoginUsername('');
        setLoginPassword('');
        setShowAddLoginForm(false);
        setLoginFormError(null);
        await refreshClients();
      } else {
        setLoginFormError('Failed to add login detail. Please try again.');
      }
    } catch (error) {
      console.error('Error adding login detail:', error);
      setLoginFormError('An error occurred. Please try again.');
    }
  };

  const handleEditLoginDetail = (task: ClientTask) => {
    // Parse the task content back to individual fields
    const lines = task.content.split('\n');
    const urlLine = lines.find(line => line.startsWith('URL: '));
    const usernameLine = lines.find(line => line.startsWith('Username: '));
    const passwordLine = lines.find(line => line.startsWith('Password: '));
    
    setLoginWebsite(task.title);
    setLoginUrl(urlLine ? urlLine.replace('URL: ', '') : '');
    setLoginUsername(usernameLine ? usernameLine.replace('Username: ', '') : '');
    setLoginPassword(passwordLine ? passwordLine.replace('Password: ', '') : '');
    setEditingLoginId(task.id);
    setShowAddLoginForm(true);
    // Make sure task form is not shown
    setShowAddTaskForm(false);
  };

  const handleUpdateLoginDetail = async () => {
    if (!client || !editingLoginId) return;
    
    const website = loginWebsite.trim();
    const url = loginUrl.trim();
    const username = loginUsername.trim();
    const password = loginPassword.trim();
    
    if (!website || !url || !username || !password) {
      setLoginFormError('All fields are required');
      return;
    }
    
    setLoginFormError(null);
    
    try {
      // Format the login details as structured text
      const title = website;
      const content = `URL: ${url}\nUsername: ${username}\nPassword: ${password}`;
      
      // Use the updateTask function to update the task
      const success = await updateTask(client.id, editingLoginId, { title, content });
      
      if (success) {
        // Reset form and close modal
        setLoginWebsite('');
        setLoginUrl('');
        setLoginUsername('');
        setLoginPassword('');
        setEditingLoginId(null);
        setShowAddLoginForm(false);
        setLoginFormError(null);
        await refreshClients();
      } else {
        setLoginFormError('Failed to update login detail. Please try again.');
      }
    } catch (error) {
      console.error('Error updating login detail:', error);
      setLoginFormError('An error occurred. Please try again.');
    }
  };

  const handleDeleteLoginDetail = async (taskId: string) => {
    if (!client) return;
    
    if (!taskId || taskId === '' || taskId === 'undefined') {
      console.error('❌ Invalid task ID:', taskId);
      alert('Cannot delete login detail: Invalid task ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this login detail?')) {
      const success = await deleteTask(client.id, taskId);
      if (success) {
        await refreshClients();
      }
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        // You could add a toast notification here
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(`Failed to copy ${type.toLowerCase()}. Please copy manually.`);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{clientName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 px-2">
                {teamMembers.length} user{teamMembers.length !== 1 ? 's' : ''} available
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                title="Close tab"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'tasks'
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
                {regularTasks.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('logins')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'logins'
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6c-3 0-5.197-1.756-6-4M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Logins
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {loginTasks.length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Tab-specific header with actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {activeSubTab === 'notes' ? 'Client Tasks' : 'Login Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {activeSubTab === 'notes' 
                ? 'Manage tasks, project information, and client work items'
                : 'Website logins, admin credentials, and access information'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeSubTab === 'tasks' ? (
              <>
                <button
                  onClick={async () => {
                    await refreshClients();
                    console.log('🔄 Clients data refreshed');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                  title="Refresh data"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Add Task
                </button>
              </>
            ) : (
              user?.permissions?.canEditClients && (
                <button
                  onClick={() => setShowAddLoginForm(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Add Login
                </button>
              )
            )}
          </div>
        </div>

        {/* Task Filter Controls */}
        {activeSubTab === 'tasks' && regularTasks.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value as 'all' | 'in-progress' | 'completed' | 'assigned')}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="all">All Tasks ({regularTasks.length})</option>
                  <option value="in-progress">In Progress ({regularTasks.filter(t => !t.completed).length})</option>
                  <option value="completed">Completed ({regularTasks.filter(t => t.completed).length})</option>
                  <option value="assigned">Assigned ({regularTasks.filter(t => t.assignedTo).length})</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Assignee:</label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="all">All Users</option>
                  {user?.username && (
                    <option value={user.username}>
                      My Tasks ({regularTasks.filter(t => t.assignedTo === user.username).length})
                    </option>
                  )}
                  {teamMembers.map((member) => {
                    const assignedCount = regularTasks.filter(t => t.assignedTo === member).length;
                    if (member === user?.username) return null; // Skip current user as it's already shown above
                    return (
                      <option key={member} value={member}>
                        {member} ({assignedCount})
                      </option>
                    );
                  })}
                  <option value="">Unassigned ({regularTasks.filter(t => !t.assignedTo).length})</option>
                </select>
              </div>
              
              {(taskFilter !== 'all' || assigneeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setTaskFilter('all');
                    setAssigneeFilter('all');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  Clear Filters
                </button>
              )}
              
              <div className="text-sm text-gray-500">
                Showing {filteredRegularTasks.length} of {regularTasks.length} tasks
              </div>
            </div>
          </div>
        )}
        {/* Add/Edit Task Form - Inline style */}
        {showAddTaskForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTaskId ? 'Edit Task' : 'Add New Task'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Website Updates, Content Review, Bug Fixes, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">-- Not Assigned --</option>
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <option key={member} value={member}>
                          {member}
                        </option>
                      ))
                    ) : (
                      <option disabled>No users available</option>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="taskStatus"
                        checked={!taskCompleted}
                        onChange={() => setTaskCompleted(false)}
                        className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 focus:ring-yellow-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        In Progress
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="taskStatus"
                        checked={taskCompleted}
                        onChange={() => setTaskCompleted(true)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Completed
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  value={taskContent}
                  onChange={(e) => setTaskContent(e.target.value)}
                  placeholder="Add detailed information, requirements, or any important details..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              
              {taskAssignedTo && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>{taskAssignedTo}</strong> will be notified about this {taskCompleted ? 'completed' : 'new'} task assignment.
                  </p>
                </div>
              )}
              {formError && (
                <p className="text-red-600 text-sm">{formError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveTask}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
                <button
                  onClick={() => {
                    setShowAddTaskForm(false);
                    setTaskTitle('');
                    setTaskContent('');
                    setTaskAssignedTo('');
                    setTaskCompleted(false);
                    setEditingTaskId(null);
                    setFormError(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Login Details Modal - Back to structured form */}
        {showAddLoginForm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddLoginForm(false);
                setEditingLoginId(null);
                setLoginWebsite('');
                setLoginUrl('');
                setLoginUsername('');
                setLoginPassword('');
                setLoginFormError(null);
              }
            }}
          >
            <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingLoginId ? 'Edit Login Detail' : 'Add New Login Detail'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website Name *
                  </label>
                  <input
                    type="text"
                    value={loginWebsite}
                    onChange={(e) => setLoginWebsite(e.target.value)}
                    placeholder="e.g., WordPress Admin"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL *
                  </label>
                  <input
                    type="url"
                    value={loginUrl}
                    onChange={(e) => setLoginUrl(e.target.value)}
                    placeholder="https://example.com/wp-admin"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  />
                </div>
                {loginFormError && (
                  <p className="text-red-600 text-sm">{loginFormError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={editingLoginId ? handleUpdateLoginDetail : handleAddLoginDetail}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    {editingLoginId ? 'Update Login' : 'Add Login'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLoginForm(false);
                      setEditingLoginId(null);
                      setLoginWebsite('');
                      setLoginUrl('');
                      setLoginUsername('');
                      setLoginPassword('');
                      setLoginFormError(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab Content */}
        {activeSubTab === 'tasks' && (
          <>
            {/* Client Tasks Section */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="divide-y divide-gray-200">
                {filteredRegularTasks.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {regularTasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {regularTasks.length === 0 
                        ? 'Start adding important client information, project tasks, or work items.'
                        : 'Try adjusting your filters or create a new task.'
                      }
                    </p>
                    <button
                      onClick={handleAddTask}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      {regularTasks.length === 0 ? 'Add First Task' : 'Add New Task'}
                    </button>
                  </div>
                ) : (
                  filteredRegularTasks.map((task) => (
                    <div key={`${task.id}-${task.updatedAt.getTime()}`} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-semibold text-gray-900">{task.title}</h4>
                            <span className="text-xs text-gray-500">
                              {formatDate(task.updatedAt)}
                            </span>
                          </div>
                          
                          {/* Assignment and Status - Clear Layout */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Assigned To */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">Assigned to:</span>
                              {task.assignedTo && task.assignedTo.trim() ? (
                                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                  task.assignedTo === user?.username
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {task.assignedTo === user?.username ? `You (${task.assignedTo})` : task.assignedTo}
                                </span>
                              ) : (
                                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">Status:</span>
                              {task.completed ? (
                                <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full font-medium flex items-center gap-1">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Completed
                                </span>
                              ) : (
                                <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full font-medium flex items-center gap-1">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  In Progress
                                </span>
                              )}
                              {/* Quick toggle button */}
                              <button
                                onClick={() => client && toggleTaskCompletion(client.id, task.id)}
                                className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                                  task.completed
                                    ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                                title={task.completed ? 'Mark as in progress' : 'Mark as completed'}
                              >
                                {task.completed ? 'Mark In Progress' : 'Mark Complete'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Completion Details */}
                          {task.completed && task.completedBy && (
                            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                              <div className="flex items-center gap-2 text-sm text-green-800">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>
                                  Completed by <strong>{task.completedBy}</strong>
                                  {task.completedAt && (
                                    <span> on {formatDate(task.completedAt)}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Created/Edited Info */}
                          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                            {task.createdBy && (
                              <span>Created by: <span className="font-medium">{task.createdBy}</span></span>
                            )}
                            {task.editedBy && task.editedBy !== task.createdBy && (
                              <span>Last edited by: <span className="font-medium">{task.editedBy}</span></span>
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-700 mb-2">Content:</div>
                                <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                  {task.content}
                                </div>
                              </div>
                              <button
                                onClick={() => copyToClipboard(task.content, 'Task content')}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors flex-shrink-0"
                                title="Copy all content"
                              >
                                Copy All
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-sm"
                            title="Edit task"
                          >
                            Edit
                          </button>
                          {/* Only show delete button for admins */}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => {
                                handleDeleteTask(task.id);
                              }}
                              className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-sm"
                              title="Delete task (Admin only)"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Task Notes Section (Legacy Support) */}
            {taskNotes.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Task Notes</h2>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      {taskNotes.length} note{taskNotes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {taskNotes.map((note) => (
                    <div key={note.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <pre className="text-sm text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </pre>
                          </div>
                          <p className="text-gray-500 text-xs mt-2">
                            Task note - Last updated: {formatDate(note.lastUpdated)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEditTaskNote(note.taskId, note.content)}
                          className="ml-4 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-sm"
                          title="Edit task note"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Logins Tab Content */}
        {activeSubTab === 'logins' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="divide-y divide-gray-200">
              {loginTasks.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6c-3 0-5.197-1.756-6-4M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No login details yet</h3>
                  <p className="text-gray-500 mb-4">
                    Add website logins, admin credentials, and access information for this client.
                  </p>
                  {user?.permissions?.canEditClients && (
                    <button
                      onClick={() => setShowAddLoginForm(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      Add First Login
                    </button>
                  )}
                </div>
              ) : (
                loginTasks.map((task) => (
                  <div key={`${task.id}-${task.updatedAt.getTime()}`} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                          <span className="text-xs text-gray-500">
                            {formatDate(task.updatedAt)}
                          </span>
                        </div>
                        
                        {/* Edit information */}
                        <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
                          {task.createdBy && (
                            <span>Created by: <span className="font-medium">{task.createdBy}</span></span>
                          )}
                          {task.editedBy && task.editedBy !== task.createdBy && (
                            <span>Last edited by: <span className="font-medium">{task.editedBy}</span></span>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="space-y-2">
                            {task.content.split('\n').map((line, index) => {
                              if (line.startsWith('URL: ')) {
                                const url = line.replace('URL: ', '');
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-600 w-16">URL:</span>
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-700 underline flex-1 truncate font-mono"
                                    >
                                      {url}
                                    </a>
                                    <button
                                      onClick={() => copyToClipboard(url, 'URL')}
                                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                                      title="Copy URL"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                );
                              } else if (line.startsWith('Username: ')) {
                                const username = line.replace('Username: ', '');
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-600 w-16">Username:</span>
                                    <span className="text-xs text-gray-900 font-mono flex-1">{username}</span>
                                    <button
                                      onClick={() => copyToClipboard(username, 'Username')}
                                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                                      title="Copy Username"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                );
                              } else if (line.startsWith('Password: ')) {
                                const password = line.replace('Password: ', '');
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-600 w-16">Password:</span>
                                    <span className="text-xs text-gray-900 font-mono flex-1">••••••••</span>
                                    <button
                                      onClick={() => copyToClipboard(password, 'Password')}
                                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                                      title="Copy Password"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={() => handleEditLoginDetail(task)}
                          className="px-3 py-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors text-sm"
                          title="Edit login"
                        >
                          Edit
                        </button>
                        {/* Only show delete button for admins */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              handleDeleteLoginDetail(task.id);
                            }}
                            className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-sm"
                            title="Delete login (Admin only)"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}