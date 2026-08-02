'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Task, Priority, Status } from '@/types/task';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useClients } from '@/contexts/ClientContext';
import { useProjectTypes } from '@/contexts/ProjectTypeContext';
import { useAuth } from '@/contexts/AuthContext';
import AssigneesModal from './AssigneesModal';

interface TaskItemProps {
  task: Task;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  showCost?: boolean;
  viewMode?: 'list' | 'card';
  index?: number;
}

const statusPillStyles: Record<string, string> = {
  Completed: 'bg-emerald-500 text-white',
  InProcess: 'bg-amber-500 text-white',
  'Waiting for Quote': 'bg-blue-500 text-white',
};

const statusPillLabels: Record<string, string> = {
  Completed: 'Completed',
  InProcess: 'In Progress',
  'Waiting for Quote': 'Waiting',
};

export default function TaskItem({ task, onDeleteTask, onEditTask, showCost = false, viewMode = 'list', index }: TaskItemProps) {
  const { user } = useAuth();
  const { assignees } = useAssignees();
  const { clients } = useClients();
  const { projectTypeNames } = useProjectTypes();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState({
    dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString().split('T')[0] : '',
    priority: task.priority,
    status: task.status,
    clientName: task.clientName,
    clientGroup: task.clientGroup,
    cms: task.cms,
    webUrl: task.webUrl,
    figmaUrl: task.figmaUrl,
    assetUrl: task.assetUrl,
    totalPrice: task.totalPrice?.toString() || '',
    assignees: task.assignees || [] as string[],
    notes: task.notes || ''
  });

  const handleAutoSave = (field: string, value: string | number | null) => {
    const updates: Partial<Task> = { updatedAt: new Date() };

    switch (field) {
      case 'clientName':
        if (!value || String(value).trim() === '') return; // Don't save empty names
        updates.clientName = String(value).trim();
        break;
      case 'clientGroup':
        updates.clientGroup = value ? String(value).trim() : '';
        break;
      case 'dueDate':
        updates.dueDate = value ? new Date(String(value)) : null;
        break;
      case 'priority':
        updates.priority = value as Priority;
        break;
      case 'status':
        updates.status = value as Status;
        break;
      case 'cms':
        updates.cms = value ? String(value) : null;
        break;
      case 'webUrl':
        updates.webUrl = value ? String(value).trim() : '';
        break;
      case 'figmaUrl':
        updates.figmaUrl = value ? String(value).trim() : '';
        break;
      case 'assetUrl':
        updates.assetUrl = value ? String(value).trim() : '';
        break;
      case 'totalPrice':
        updates.totalPrice = value ? parseFloat(String(value)) : null;
        break;
      case 'notes':
        updates.notes = value ? String(value) : '';
        break;
    }

    onEditTask(task.id, updates);
    setEditingField(null);
    setHasUnsavedChanges(false);
  };

  const handleInlineEdit = (field: string, value: string | number | null) => {
    handleAutoSave(field, value);
  };

  const handleFieldClick = (field: string) => {
    setEditingField(field);
    // Update editData to current task values when starting inline edit
    setEditData({
      dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString().split('T')[0] : '',
      priority: task.priority,
      status: task.status,
      clientName: task.clientName,
      clientGroup: task.clientGroup,
      cms: task.cms,
      webUrl: task.webUrl,
      figmaUrl: task.figmaUrl,
      assetUrl: task.assetUrl,
      totalPrice: task.totalPrice?.toString() || '',
      assignees: task.assignees || [],
      notes: task.notes || ''
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      const raw = editData[field as keyof typeof editData] as unknown;
      const value: string | number | null = Array.isArray(raw) ? null : (raw as string | number | null);
      handleInlineEdit(field, value);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const getUrlLabel = (url: string): string => {
    try {
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      const u = new URL(normalized);
      const host = u.hostname.replace(/^www\./, '');
      return host.length > 14 ? `${host.slice(0, 12)}…` : host;
    } catch {
      // Fallback: short slice of the raw string
      return url.length > 14 ? `${url.slice(0, 12)}…` : url;
    }
  };

  const renderEditableField = (field: string, label: string, value: string | number | null, type: 'text' | 'date' | 'select' | 'number' | 'url' = 'text', options?: string[]) => {
    const isCurrentlyEditing = editingField === field;
    let displayValue = value || 'N/A';

    // Special handling for date fields
    if (field === 'dueDate' && value) {
      displayValue = formatDate(task.dueDate);
    }
    // Compact labels for URLs
    if (type === 'url' && value) {
      displayValue = getUrlLabel(String(value));
    }

    if (isCurrentlyEditing) {
      if (type === 'select' && options) {
        return (
          <select
            value={editData[field as keyof typeof editData] as string || ''}
            onChange={(e) => handleInlineEdit(field, e.target.value || null)}
            onBlur={() => setEditingField(null)}
            className="bg-white border border-blue-500 text-gray-900 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all w-full"
            autoFocus
          >
            <option value="">Select {label}...</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      }

      return (
        <input
          type={type}
          value={editData[field as keyof typeof editData] as string || ''}
          onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
          onBlur={() => {
            const raw = editData[field as keyof typeof editData] as unknown;
            const v: string | number | null = Array.isArray(raw) ? null : (raw as string | number | null);
            handleInlineEdit(field, v);
          }}
          onKeyPress={(e) => handleKeyPress(e, field)}
          className="bg-white border border-blue-500 text-gray-900 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all min-w-0 w-full"
          autoFocus
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
        />
      );
    }

    if (type === 'url') {
      return (
        <span
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-50 ${task.status === 'Completed' ? 'text-blue-400' : 'text-blue-600'} truncate`}
          onClick={() => handleFieldClick(field)}
          title="Click to edit"
        >
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1-1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 015.656 5.656l-1 1" />
          </svg>
          <span className="truncate text-xs">{String(displayValue)}</span>
        </span>
      );
    }

    return (
      <span
        className={`cursor-pointer rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-50 ${task.status === 'Completed' ? 'text-gray-400' : 'text-gray-900'}`}
        onClick={() => handleFieldClick(field)}
        title="Click to edit"
      >
        {displayValue}
      </span>
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusPillStyles[status] || 'bg-gray-400 text-white'}`}>
      {statusPillLabels[status] || status}
    </span>
  );

  // Detail/edit panel shared by the expanded list row and the card view
  const detailFields = (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 text-xs text-gray-600">
      <div className="rounded-lg bg-gray-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Project Name</div>
        {editingField === 'clientName' ? (
          <input
            type="text"
            value={editData.clientName}
            onChange={(e) => {
              setEditData({ ...editData, clientName: e.target.value });
              setHasUnsavedChanges(true);
            }}
            onBlur={() => handleInlineEdit('clientName', editData.clientName)}
            onKeyPress={(e) => handleKeyPress(e, 'clientName')}
            className="w-full rounded-md border border-blue-500 bg-white px-2 py-1 text-xs text-gray-900 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter client name..."
            autoFocus
          />
        ) : (
          <span
            className={`block cursor-pointer truncate rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-gray-100 ${task.status === 'Completed' ? 'text-gray-400' : (!task.clientName || task.clientName.trim() === '') ? 'text-blue-600 italic' : 'text-gray-900'}`}
            onClick={() => handleFieldClick('clientName')}
            title="Click to edit client name"
          >
            {task.clientName && task.clientName.trim() !== '' ? task.clientName : 'Add name...'}
          </span>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Client Name</div>
        {editingField === 'clientGroup' ? (
          <select
            value={editData.clientGroup || ''}
            onChange={(e) => handleInlineEdit('clientGroup', e.target.value || null)}
            onBlur={() => setEditingField(null)}
            className="w-full rounded-md border border-blue-500 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">No Client</option>
            {clients.map(client => (
              <option key={client.id} value={client.name}>{client.name}</option>
            ))}
          </select>
        ) : (
          <span
            className={`flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-gray-100 ${task.status === 'Completed' ? 'text-gray-400' : 'text-gray-600'}`}
            onClick={() => handleFieldClick('clientGroup')}
            title="Click to change client"
          >
            <svg className="h-2.5 w-2.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="truncate">{task.clientGroup || 'None'}</span>
          </span>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Due date</div>
        {renderEditableField('dueDate', 'Due Date', task.dueDate instanceof Date ? task.dueDate.toISOString().split('T')[0] : '', 'date')}
      </div>

      <div className="rounded-lg bg-gray-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Website</div>
        <div className="flex items-center gap-1.5">
          {renderEditableField('webUrl', 'Web URL', task.webUrl, 'url')}
          {task.webUrl && editingField !== 'webUrl' && (
            <a href={task.webUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-gray-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Project Type</div>
        {renderEditableField('cms', 'Project Type', task.cms, 'select', projectTypeNames)}
      </div>

      <div className="rounded-lg bg-gray-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Assets</div>
        <div className="flex items-center gap-1.5">
          {renderEditableField('assetUrl', 'Asset URL', task.assetUrl, 'url')}
          {task.assetUrl && editingField !== 'assetUrl' && (
            <a href={task.assetUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-gray-600" title="Open Asset">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  // Shared status control: a clickable badge that expands into a small radio
  // group. Used wherever the status badge is shown, so it's always the one
  // place status can be edited (avoids showing a second, duplicate control).
  const statusControl = editingField === 'status' ? (
    <div role="radiogroup" className="flex flex-col gap-0.5 rounded-md border border-blue-500 bg-white px-1.5 py-1 w-max" onClick={(e) => e.stopPropagation()}>
      <label className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editData.status === 'InProcess' ? 'border border-amber-100 bg-amber-50 text-amber-700' : 'border border-transparent text-gray-600 hover:bg-gray-50'}`}>
        <input type="radio" name={`status-${task.id}`} className="sr-only" checked={editData.status === 'InProcess'} onChange={() => handleInlineEdit('status', 'InProcess')} />
        In Progress
      </label>
      <label className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editData.status === 'Waiting for Quote' ? 'border border-blue-100 bg-blue-50 text-blue-700' : 'border border-transparent text-gray-600 hover:bg-gray-50'}`}>
        <input type="radio" name={`status-${task.id}`} className="sr-only" checked={editData.status === 'Waiting for Quote'} onChange={() => handleInlineEdit('status', 'Waiting for Quote')} />
        Waiting
      </label>
      <label className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editData.status === 'Completed' ? 'border border-green-100 bg-green-50 text-green-700' : 'border border-transparent text-gray-600 hover:bg-gray-50'}`}>
        <input type="radio" name={`status-${task.id}`} className="sr-only" checked={editData.status === 'Completed'} onChange={() => handleInlineEdit('status', 'Completed')} />
        Completed
      </label>
    </div>
  ) : (
    <button type="button" className="rounded-md transition-colors hover:opacity-80" onClick={(e) => { e.stopPropagation(); handleFieldClick('status'); }} title="Click to change status">
      {getStatusBadge(task.status)}
    </button>
  );

  const detailActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => setShowAssignModal(true)} className="flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900" title="Assign team members">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20v-2a4 4 0 013-3.87M15 11a4 4 0 10-8 0 4 4 0 008 0z" />
        </svg>
        Assign
      </button>

      {hasUnsavedChanges ? (
        <span className="flex h-7 items-center gap-1 text-xs font-medium text-amber-600" title="Auto-saving changes...">
          <svg className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 4" />
          </svg>
          Saving...
        </span>
      ) : null}

      <button onClick={() => onDeleteTask(task.id)} className="flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label="Delete project" title="Delete project">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>

      {user?.role === 'admin' && (
        <>
          <span className="h-5 w-px bg-gray-200" />

          {editingField === 'totalPrice' ? (
            <div className="w-24">{renderEditableField('totalPrice', 'Total Price', task.totalPrice?.toString() || '', 'number')}</div>
          ) : (
            <button type="button" className={`flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium transition-colors hover:bg-gray-100 ${task.status === 'Completed' ? 'text-gray-400' : 'text-gray-700'}`} onClick={() => handleFieldClick('totalPrice')} title="Click to edit cost">
              {showCost ? (task.totalPrice ? `£${task.totalPrice.toFixed(2)}` : 'No cost') : '••••'}
            </button>
          )}

          <button type="button" className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${task.invoiced ? 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`} onClick={() => onEditTask(task.id, { invoiced: !task.invoiced, updatedAt: new Date() })} title={task.invoiced ? 'Mark as not invoiced' : 'Mark as invoiced'}>
            {task.invoiced ? 'Invoiced' : 'Invoice'}
          </button>
          <button type="button" className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${task.paid ? 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`} onClick={() => { const newPaidStatus = !task.paid; const updates: Partial<Task> = { paid: newPaidStatus, updatedAt: new Date() }; if (newPaidStatus) updates.status = 'Completed'; onEditTask(task.id, updates); }} title={task.paid ? 'Mark as unpaid' : 'Mark as paid (will complete task)'}>
            {task.paid ? 'Paid' : 'Payment'}
          </button>
        </>
      )}
    </div>
  );

  // Rendered via a portal so this fixed-position modal never ends up nested
  // inside a <table>, which would be invalid DOM and break SSR hydration.
  const assigneesModal = typeof document !== 'undefined' ? createPortal(
    <AssigneesModal
      open={showAssignModal}
      options={assignees}
      initial={task.assignees || []}
      onClose={() => setShowAssignModal(false)}
      onSave={(vals) => { onEditTask(task.id, { assignees: vals, updatedAt: new Date() }); setShowAssignModal(false); }}
    />,
    document.body
  ) : null;

  if (viewMode === 'card') {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-3 text-xs transition-colors ${task.status === 'Completed' ? 'text-gray-400 bg-gray-50/70' : 'text-gray-900 hover:bg-gray-50'}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-gray-900">{task.clientName || 'Untitled project'}</span>
          {statusControl}
        </div>
        <div className="mb-3">{detailFields}</div>
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {detailActions}
        </div>

        {assigneesModal}
      </div>
    );
  }

  return (
    <>
      <tr
        className={`cursor-pointer text-sm transition-colors ${task.status === 'Completed' ? 'text-gray-400' : 'text-gray-900'} ${isExpanded ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}`}
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <td className="w-10 px-3 py-3 text-gray-400">{index}</td>
        <td className="px-3 py-3">
          <div className="max-w-[220px] truncate font-semibold text-gray-900">{task.clientName || 'Untitled project'}</div>
        </td>
        <td className="px-3 py-3">
          {task.cms ? (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{task.cms}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="px-3 py-3">
          {task.webUrl || task.figmaUrl || task.assetUrl ? (
            <div className="flex items-center gap-1.5">
              {task.webUrl && (
                <a href={task.webUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100" title="Website">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </a>
              )}
              {task.figmaUrl && (
                <a href={task.figmaUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex h-6 w-6 items-center justify-center rounded bg-purple-50 text-purple-600 hover:bg-purple-100" title="Figma">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </a>
              )}
              {task.assetUrl && (
                <a href={task.assetUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200" title="Assets">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </a>
              )}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatDate(task.dueDate)}</td>
        <td className="px-3 py-3">{statusControl}</td>
        <td className="px-3 py-3 text-right">
          <svg className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50/60">
          <td colSpan={7} className="border-t border-gray-100 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3">
              {detailFields}
              <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                {detailActions}
              </div>
            </div>
          </td>
        </tr>
      )}

      {assigneesModal}
    </>
  );
}
