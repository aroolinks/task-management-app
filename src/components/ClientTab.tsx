'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task } from '@/types/task';
import { useClients, ClientNote } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';

interface ClientTabProps {
  clientName: string;
  tasks: Task[];
  onEditTask: (id: string, updates: Partial<Task>) => void;
  onClose: () => void;
}

export default function ClientTab({ clientName, tasks, onEditTask, onClose }: ClientTabProps) {
  const { user } = useAuth();
  const { clients, addNote, updateNote, deleteNote, refreshClients } = useClients();
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  // Debug: Log when client data changes
  useEffect(() => {
    console.log('🔍 ClientTab - client data changed:', client);
  }, [client]);

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

  const handleAddNote = () => {
    setNoteTitle('');
    setNoteContent('');
    setEditingNoteId(null);
    setShowAddNoteForm(true);
    setFormError(null);
  };

  const handleEditNote = (note: ClientNote) => {
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setEditingNoteId(note.id);
    setShowAddNoteForm(true);
    setFormError(null);
  };

  const handleSaveNote = async () => {
    if (!client) return;

    const title = noteTitle.trim();
    const content = noteContent.trim();

    if (!title) {
      setFormError('Please enter a note title');
      return;
    }

    if (!content) {
      setFormError('Please enter note content');
      return;
    }

    setFormError(null);

    let success = false;
    if (editingNoteId) {
      // Update existing note
      success = await updateNote(client.id, editingNoteId, { title, content });
    } else {
      // Add new note
      const newNote = await addNote(client.id, { title, content });
      success = newNote !== null;
    }

    if (success) {
      setShowAddNoteForm(false);
      setNoteTitle('');
      setNoteContent('');
      setEditingNoteId(null);
      // Force refresh to ensure UI updates
      console.log('🔄 Refreshing clients after note operation');
      await refreshClients();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!client) return;
    
    console.log('🗑️ Attempting to delete note:', { clientId: client.id, noteId });
    
    if (!noteId || noteId === '' || noteId === 'undefined') {
      console.error('❌ Invalid note ID:', noteId);
      alert('Cannot delete note: Invalid note ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      const success = await deleteNote(client.id, noteId);
      if (success) {
        console.log('🔄 Refreshing clients after note deletion');
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

  // Login Detail Functions - back to structured format but saving as notes
  const handleAddLoginDetail = async () => {
    if (!client) {
      console.error('No client found');
      return;
    }
    
    console.log('Adding login detail for client:', client.id);
    
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
      
      // Use the addNote function to save as a note
      const success = await addNote(client.id, { title, content });
      
      if (success) {
        console.log('Login detail added successfully as note');
        // Reset form and close modal
        setLoginWebsite('');
        setLoginUrl('');
        setLoginUsername('');
        setLoginPassword('');
        setShowAddLoginForm(false);
        setLoginFormError(null);
        await refreshClients();
      } else {
        console.error('Failed to add login detail');
        setLoginFormError('Failed to add login detail. Please try again.');
      }
    } catch (error) {
      console.error('Error adding login detail:', error);
      setLoginFormError('An error occurred. Please try again.');
    }
  };

  const handleEditLoginDetail = (note: ClientNote) => {
    // Parse the note content back to individual fields
    const lines = note.content.split('\n');
    const urlLine = lines.find(line => line.startsWith('URL: '));
    const usernameLine = lines.find(line => line.startsWith('Username: '));
    const passwordLine = lines.find(line => line.startsWith('Password: '));
    
    setLoginWebsite(note.title);
    setLoginUrl(urlLine ? urlLine.replace('URL: ', '') : '');
    setLoginUsername(usernameLine ? usernameLine.replace('Username: ', '') : '');
    setLoginPassword(passwordLine ? passwordLine.replace('Password: ', '') : '');
    setEditingLoginId(note.id);
    setShowAddLoginForm(true);
    // Make sure note form is not shown
    setShowAddNoteForm(false);
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
      
      // Use the updateNote function to update the note
      const success = await updateNote(client.id, editingLoginId, { title, content });
      
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

  const handleDeleteLoginDetail = async (noteId: string) => {
    if (!client) return;
    
    if (!noteId || noteId === '' || noteId === 'undefined') {
      console.error('❌ Invalid note ID:', noteId);
      alert('Cannot delete login detail: Invalid note ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this login detail?')) {
      const success = await deleteNote(client.id, noteId);
      if (success) {
        await refreshClients();
      }
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log(`${type} copied to clipboard`);
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
        console.log(`${type} copied to clipboard (fallback)`);
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">{clientName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Add Note
            </button>
            {user?.permissions?.canEditClients && (
              <button
                onClick={() => setShowAddLoginForm(true)}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
              >
                Add Login
              </button>
            )}
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

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Add/Edit Note Form - Inline style */}
        {showAddNoteForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingNoteId ? 'Edit Note' : 'Add New Note'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g., Login Credentials, Server Details, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add detailed information, passwords, URLs, or any important notes..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              {formError && (
                <p className="text-red-600 text-sm">{formError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  {editingNoteId ? 'Update Note' : 'Add Note'}
                </button>
                <button
                  onClick={() => {
                    setShowAddNoteForm(false);
                    setNoteTitle('');
                    setNoteContent('');
                    setEditingNoteId(null);
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

        {/* Client Notes Section */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Client Notes</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {(client && Array.isArray(client.notes) ? client.notes.length : 0)} note{((client && Array.isArray(client.notes) ? client.notes.length : 0) !== 1) ? 's' : ''}
                </span>
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {!(client && Array.isArray(client.notes) && client.notes.length > 0) ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
                <p className="text-gray-500 mb-4">
                  Start adding important client information, login credentials, or project notes.
                </p>
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Add First Note
                </button>
              </div>
            ) : (
              client.notes.map((note) => (
                <div key={`${note.id}-${note.updatedAt.getTime()}`} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">{note.title}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(note.updatedAt)}
                        </span>
                      </div>
                      
                      {/* Edit information */}
                      <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
                        {note.createdBy && (
                          <span>Created by: <span className="font-medium">{note.createdBy}</span></span>
                        )}
                        {note.editedBy && note.editedBy !== note.createdBy && (
                          <span>Last edited by: <span className="font-medium">{note.editedBy}</span></span>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {/* Check if this is a structured login detail */}
                            {note.content.includes('URL: ') && note.content.includes('Username: ') && note.content.includes('Password: ') ? (
                              <div className="space-y-2">
                                {note.content.split('\n').map((line, index) => {
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
                            ) : (
                              <pre className="text-sm text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
                                {note.content}
                              </pre>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(note.content, 'Note content')}
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
                        onClick={() => {
                          // Check if this is a login detail (structured format)
                          if (note.content.includes('URL: ') && note.content.includes('Username: ') && note.content.includes('Password: ')) {
                            handleEditLoginDetail(note);
                          } else {
                            handleEditNote(note);
                          }
                        }}
                        className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-sm"
                        title="Edit note"
                      >
                        Edit
                      </button>
                      {/* Only show delete button for admins */}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            console.log('🗑️ Note object:', note);
                            console.log('🗑️ Note ID:', note.id);
                            handleDeleteNote(note.id);
                          }}
                          className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-sm"
                          title="Delete note (Admin only)"
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
      </div>
    </div>
  );
}