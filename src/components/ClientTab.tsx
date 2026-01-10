'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/task';
import { useClients, ClientNote } from '@/hooks/useClients';

interface ClientTabProps {
  clientName: string;
  tasks: Task[];
  onEditTask: (id: string, updates: Partial<Task>) => void;
  onClose: () => void;
}

export default function ClientTab({ clientName, tasks, onEditTask, onClose }: ClientTabProps) {
  const { clients, addNote, updateNote, deleteNote } = useClients();
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Find the client in the manual client system
  const client = useMemo(() => {
    return clients.find(c => c.name === clientName);
  }, [clients, clientName]);

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
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!client) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(client.id, noteId);
    }
  };

  const handleEditTaskNote = (taskId: string, currentNotes: string) => {
    // For task notes, we'll use a simple prompt for now
    const newNotes = prompt('Edit task note:', currentNotes);
    if (newNotes !== null) {
      onEditTask(taskId, { notes: newNotes });
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
        {/* Add/Edit Note Form */}
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
                <div key={note.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">{note.title}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(note.updatedAt)}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <pre className="text-sm text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </pre>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-sm"
                        title="Edit note"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-sm"
                        title="Delete note"
                      >
                        Delete
                      </button>
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