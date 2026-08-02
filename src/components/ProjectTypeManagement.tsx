'use client';

import { useState } from 'react';
import { useProjectTypes } from '@/contexts/ProjectTypeContext';

export default function ProjectTypeManagement() {
  const { projectTypes, loading, error, addProjectType, renameProjectType, removeProjectType } = useProjectTypes();
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const success = await addProjectType(trimmed);
    setSubmitting(false);
    if (success) setNewName('');
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const commitRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    await renameProjectType(id, trimmed);
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete project type "${name}"? Existing projects using it will keep the value, but it won't be selectable anymore.`)) {
      await removeProjectType(id);
    }
  };

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Project Types</h3>
        <p className="text-sm text-gray-600 mt-1">Manage the options available in a project&apos;s &quot;Project Type&quot; field.</p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Video Editing"
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
          >
            Add
          </button>
        </form>

        {loading ? (
          <div className="text-sm text-gray-500">Loading project types...</div>
        ) : projectTypes.length === 0 ? (
          <div className="text-sm text-gray-500">No project types yet. Add one above.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projectTypes.map(pt => (
              <div key={pt.id} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                {editingId === pt.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(pt.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(pt.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-32 px-1.5 py-0.5 border border-blue-500 rounded text-sm text-gray-900 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(pt.id, pt.name)}
                    className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                    title="Click to rename"
                  >
                    {pt.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(pt.id, pt.name)}
                  className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title={`Delete ${pt.name}`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
