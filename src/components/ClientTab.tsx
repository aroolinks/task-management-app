'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task } from '@/types/task';
import { useClients, ClientTask } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeamMembers, onTeamMembersUpdated } from '@/utils/teamMembersSync';

interface ClientTabProps {
  clientName: string;
  tasks: Task[];
  onClose: () => void;
  onOpenProject?: (taskId: string) => void;
  onAddProject?: () => void;
}

const statusBadgeStyles: Record<string, string> = {
  Completed: 'bg-green-100 text-green-800',
  InProcess: 'bg-blue-100 text-blue-800',
  'Waiting for Quote': 'bg-gray-100 text-gray-800',
};

const priorityBadgeStyles: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

export default function ClientTab({ clientName, tasks, onClose, onOpenProject, onAddProject }: ClientTabProps) {
  const { user } = useAuth();
  const { clients, addTask, updateTask, deleteTask, refreshClients } = useClients();
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'logins'>('projects');
  const [teamMembers, setTeamMembers] = useState<string[]>([]); // Dynamic from API
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    if (typeof window === 'undefined') return 'card';
    return window.localStorage.getItem('clientTabViewMode') === 'list' ? 'list' : 'card';
  });

  // Login details state - back to separate fields
  const [showAddLoginForm, setShowAddLoginForm] = useState(false);
  const [editingLoginId, setEditingLoginId] = useState<string | null>(null);
  const [loginWebsite, setLoginWebsite] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFormError, setLoginFormError] = useState<string | null>(null);

  const handleSetViewMode = (mode: 'list' | 'card') => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('clientTabViewMode', mode);
    } catch {}
  };

  // Find the client in the manual client system
  const client = useMemo(() => {
    return clients.find(c => c.name === clientName);
  }, [clients, clientName]);

  // Logins are stored as client.tasks entries with a structured login format
  const loginTasks = useMemo(() => {
    if (!client || !Array.isArray(client.tasks)) return [];
    return client.tasks.filter(task =>
      task.content.includes('URL: ') && task.content.includes('Username: ') && task.content.includes('Password: ')
    );
  }, [client]);

  // Real Projects (from the main Projects list) linked to this client
  const clientProjects = useMemo(() => {
    return tasks
      .filter(task => task.clientGroup === clientName)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }, [tasks, clientName]);

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
              {client?.type === 'agency' && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold">
                  Agency
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 px-2">
                {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} available
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
            onClick={() => setActiveSubTab('projects')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'projects'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Projects
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {clientProjects.length}
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
              {activeSubTab === 'projects' ? "Client's Projects" : 'Login Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {activeSubTab === 'projects'
                ? 'Projects linked to this client'
                : 'Website logins, admin credentials, and access information'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0">
              <button
                onClick={() => handleSetViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => handleSetViewMode('card')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Card view"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v7H4v-7zm9 0h7v7h-7v-7z" />
                </svg>
              </button>
            </div>
            {activeSubTab === 'projects' ? (
              <button
                onClick={() => onAddProject?.()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                + Add Project
              </button>
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

        {/* Projects Tab Content */}
        {activeSubTab === 'projects' && (
          <>
            {clientProjects.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-4">
                  Projects created for {clientName} will show up here.
                </p>
                <button
                  onClick={() => onAddProject?.()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  + Add Project
                </button>
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onOpenProject?.(project.id)}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all text-left group relative overflow-hidden"
                  >
                    {/* Header with Status and Priority */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs rounded-lg font-semibold ${statusBadgeStyles[project.status] || 'bg-gray-100 text-gray-800'}`}>
                          {project.status}
                        </span>
                        <span className={`px-2.5 py-1 text-xs rounded-lg font-semibold ${priorityBadgeStyles[project.priority] || 'bg-gray-100 text-gray-700'}`}>
                          {project.priority}
                        </span>
                      </div>
                      <svg className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    {/* Project Name */}
                    <h4 className="text-base font-bold text-gray-900 mb-3 line-clamp-2">
                      {project.clientName || 'Untitled Project'}
                    </h4>

                    {/* Assignees */}
                    {project.assignees && project.assignees.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {project.assignees.map(a => (
                          <span key={a} className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg font-medium border border-purple-100">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom Info - Due Date and Price */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium">
                          {project.dueDate ? formatDate(project.dueDate) : 'No due date'}
                        </span>
                      </div>
                      {project.totalPrice && (
                        <span className="text-sm font-bold text-gray-900">
                          £{project.totalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Resource Links */}
                    {(project.webUrl || project.figmaUrl) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        {project.webUrl && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            <span>Website</span>
                          </div>
                        )}
                        {project.figmaUrl && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            <span>Figma</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {clientProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onOpenProject?.(project.id)}
                      className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 text-xs rounded-lg font-semibold shrink-0 ${statusBadgeStyles[project.status] || 'bg-gray-100 text-gray-800'}`}>
                          {project.status}
                        </span>

                        {/* Project Name */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{project.clientName || 'Untitled Project'}</h4>
                        </div>

                        {/* Assignees */}
                        {project.assignees && project.assignees.length > 0 && (
                          <div className="flex gap-1.5 shrink-0">
                            {project.assignees.slice(0, 3).map(a => (
                              <span key={a} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-md font-medium border border-purple-100">
                                {a}
                              </span>
                            ))}
                            {project.assignees.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md font-medium">
                                +{project.assignees.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 text-xs rounded-md font-semibold shrink-0 ${priorityBadgeStyles[project.priority] || 'bg-gray-100 text-gray-700'}`}>
                          {project.priority}
                        </span>

                        {/* Resource Links */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {project.webUrl && (
                            <div className="w-6 h-6 flex items-center justify-center bg-blue-50 text-blue-600 rounded" title="Website">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                          )}
                          {project.figmaUrl && (
                            <div className="w-6 h-6 flex items-center justify-center bg-purple-50 text-purple-600 rounded" title="Figma">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Due Date */}
                        <div className="flex items-center gap-1.5 text-gray-500 shrink-0 min-w-[120px]">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-medium">
                            {project.dueDate ? formatDate(project.dueDate) : 'No date'}
                          </span>
                        </div>

                        {/* Price */}
                        {project.totalPrice && (
                          <span className="text-sm font-bold text-gray-900 shrink-0 min-w-[70px] text-right">
                            £{project.totalPrice.toFixed(2)}
                          </span>
                        )}

                        {/* Arrow */}
                        <svg className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Logins Tab Content */}
        {activeSubTab === 'logins' && (
          <>
            {loginTasks.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
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
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loginTasks.map((task) => (
                  <div key={`${task.id}-${task.updatedAt.getTime()}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditLoginDetail(task)}
                          className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Edit login"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteLoginDetail(task.id)}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete login"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                      {task.content.split('\n').map((line, index) => {
                        if (line.startsWith('URL: ')) {
                          const url = line.replace('URL: ', '');
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-14 shrink-0">URL:</span>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 underline flex-1 truncate font-mono"
                                title={url}
                              >
                                {url}
                              </a>
                              <button
                                onClick={() => copyToClipboard(url, 'URL')}
                                className="px-2 py-1 text-[10px] bg-white hover:bg-gray-100 text-gray-600 rounded transition-colors shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          );
                        } else if (line.startsWith('Username: ')) {
                          const username = line.replace('Username: ', '');
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-14 shrink-0">User:</span>
                              <span className="text-xs text-gray-900 font-mono flex-1 truncate" title={username}>{username}</span>
                              <button
                                onClick={() => copyToClipboard(username, 'Username')}
                                className="px-2 py-1 text-[10px] bg-white hover:bg-gray-100 text-gray-600 rounded transition-colors shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          );
                        } else if (line.startsWith('Password: ')) {
                          const password = line.replace('Password: ', '');
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-14 shrink-0">Pass:</span>
                              <span className="text-xs text-gray-900 font-mono flex-1">••••••••</span>
                              <button
                                onClick={() => copyToClipboard(password, 'Password')}
                                className="px-2 py-1 text-[10px] bg-white hover:bg-gray-100 text-gray-600 rounded transition-colors shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      {task.createdBy && <span>By {task.createdBy}</span>}
                      <span>•</span>
                      <span>{formatDate(task.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {loginTasks.map((task) => (
                    <div key={`${task.id}-${task.updatedAt.getTime()}`} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {task.content.split('\n').map((line, index) => {
                              if (line.startsWith('Username: ')) {
                                const username = line.replace('Username: ', '');
                                return <span key={index} className="font-mono">{username}</span>;
                              }
                              return null;
                            })}
                            <span>•</span>
                            <span>{formatDate(task.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.content.split('\n').map((line, index) => {
                            if (line.startsWith('URL: ')) {
                              const url = line.replace('URL: ', '');
                              return (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                  title="Open URL"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              );
                            }
                            return null;
                          })}
                          <button
                            onClick={() => handleEditLoginDetail(task)}
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                            title="Edit login"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteLoginDetail(task.id)}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Delete login"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
