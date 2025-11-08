'use client';

import { useState } from 'react';
import { Task, Priority, Status, CMS } from '@/types/task';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';
import AssigneesModal from './AssigneesModal';

interface TaskItemProps {
  task: Task;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  showCost?: boolean;
  autoEdit?: boolean;
}

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const statuses: Status[] = ['InProcess', 'Completed'];
const cmsOptions: CMS[] = ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'];


export default function TaskItem({ task, onDeleteTask, onEditTask, showCost = false, autoEdit = false }: TaskItemProps) {
  const { assignees } = useAssignees();
  const { groups } = useGroups();
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
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
    assignees: task.assignees || [] as string[]
  });

  const handleSave = () => {
    const updates: Partial<Task> = {
      dueDate: editData.dueDate ? new Date(editData.dueDate) : null,
      priority: editData.priority,
      status: editData.status,
      clientName: editData.clientName.trim(),
      clientGroup: editData.clientGroup.trim(),
      cms: editData.cms,
      webUrl: editData.webUrl.trim(),
      figmaUrl: editData.figmaUrl.trim(),
      assetUrl: editData.assetUrl.trim(),
      totalPrice: editData.totalPrice ? parseFloat(editData.totalPrice) : null,
      assignees: Array.isArray(editData.assignees) ? editData.assignees : [],
      updatedAt: new Date()
    };
    
    onEditTask(task.id, updates);
    setIsEditing(false);
  };

  const handleInlineEdit = (field: string, value: string | number | null) => {
    const updates: Partial<Task> = { updatedAt: new Date() };
    
    switch (field) {
      case 'clientName':
        updates.clientName = value ? String(value).trim() : '';
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
        updates.cms = value ? (String(value) as CMS) : null;
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
    }
    
    onEditTask(task.id, updates);
    setEditingField(null);
  };

  const handleFieldClick = (field: string) => {
    if (!isEditing) {
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
        assignees: task.assignees || []
      });
    }
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
    
    if (isCurrentlyEditing && !isEditing) {
      if (type === 'select' && options) {
        return (
          <select
            value={editData[field as keyof typeof editData] as string || ''}
            onChange={(e) => handleInlineEdit(field, e.target.value || null)}
            onBlur={() => setEditingField(null)}
            className="bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-slate-500"
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
          className={`bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 ${type === 'date' ? 'py-1.5 text-sm' : 'py-1.5 text-sm'} focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-0 w-full`}
          autoFocus
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
        />
      );
    }
    
    if (type === 'url') {
      return (
        <span 
        className={`inline-flex items-center gap-1 cursor-pointer hover:bg-slate-700/40 px-2 py-1 rounded transition-colors ${task.status === 'Completed' ? 'text-blue-400' : 'text-blue-300'} max-w-[160px] truncate`}
          onClick={() => handleFieldClick(field)}
          title="Click to edit"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1-1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 015.656 5.656l-1 1" />
          </svg>
          <span className="truncate">{String(displayValue)}</span>
        </span>
      );
    }

    return (
      <span 
        className={`cursor-pointer hover:bg-slate-700/40 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'}`}
        onClick={() => handleFieldClick(field)}
        title="Click to edit"
      >
        {displayValue}
      </span>
    );
  };

  const handleCancel = () => {
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
      assignees: task.assignees || []
    });
    setIsEditing(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString();
  };

  // Get row background color based on status
  const getRowBgColor = () => {
    switch (task.status) {
      case 'Completed': return 'bg-green-900/20 hover:bg-green-900/30 border-green-800/30';
      case 'InProcess': return 'bg-amber-900/20 hover:bg-amber-900/30 border-amber-800/30';
      case 'Waiting for Quote': return 'bg-transparent hover:bg-slate-700/40';
      default: return 'bg-transparent hover:bg-slate-700/40';
    }
  };

  return (
    <div className={`grid grid-cols-[180px_100px_100px_100px_100px_120px_130px_80px_120px_100px_120px] items-center gap-0 px-3 text-[11px] h-[50px] ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'} divide-x divide-slate-700 ${getRowBgColor()}`}>

      {/* Client Name */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        {editingField === 'clientName' ? (
          <input
            type="text"
            value={editData.clientName}
            onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
            onBlur={() => handleInlineEdit('clientName', editData.clientName)}
            onKeyPress={(e) => handleKeyPress(e, 'clientName')}
            className="w-full px-2 py-1.5 text-[12px] bg-slate-800 border border-slate-600 text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
            autoFocus
          />
        ) : (
          <span
            className={`truncate block cursor-pointer hover:bg-slate-700/40 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'}`}
            onClick={() => handleFieldClick('clientName')}
            title="Click to edit client name"
          >
            {task.clientName || 'Unnamed Client'}
          </span>
        )}
      </div>

      {/* Client Group */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        {editingField === 'clientGroup' ? (
          <select
            value={editData.clientGroup || ''}
            onChange={(e) => handleInlineEdit('clientGroup', e.target.value || null)}
            onBlur={() => setEditingField(null)}
            className="w-full px-2 py-1.5 text-[12px] bg-slate-800 border border-slate-600 text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
            autoFocus
          >
            <option value="">No Group</option>
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        ) : (
          <span
            className={`flex items-center gap-1 cursor-pointer hover:bg-slate-700/40 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-200'}`}
            onClick={() => handleFieldClick('clientGroup')}
            title="Click to change group (will move task to different tab)"
          >
            <svg className="h-3 w-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="truncate">
              {task.clientGroup || 'No Group'}
            </span>
          </span>
        )}
      </div>

      {/* Web */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-left overflow-hidden">
        {renderEditableField('webUrl', 'Web URL', task.webUrl, 'url')}
        {task.webUrl && editingField !== 'webUrl' && (
          <a href={task.webUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-slate-200 text-sm shrink-0">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* CMS */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        {renderEditableField('cms', 'Job Desc', task.cms, 'select', cmsOptions)}
      </div>


      {/* Assets (Figma + Asset) stacked */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {renderEditableField('figmaUrl', 'Figma URL', task.figmaUrl, 'url')}
            {task.figmaUrl && editingField !== 'figmaUrl' && (
              <a href={task.figmaUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-slate-200 text-sm shrink-0" title="Open Figma">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {renderEditableField('assetUrl', 'Asset URL', task.assetUrl, 'url')}
            {task.assetUrl && editingField !== 'assetUrl' && (
              <a href={task.assetUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-slate-200 text-sm shrink-0" title="Open Asset">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Due */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        {renderEditableField('dueDate', 'Due Date', task.dueDate instanceof Date ? task.dueDate.toISOString().split('T')[0] : '', 'date')}
      </div>

      {/* Status */}
      <div className="px-2 py-2 text-left overflow-hidden">
        {editingField === 'status' ? (
          <div role="radiogroup" className="flex flex-col gap-1 bg-slate-800 px-1.5 py-1 rounded-md border border-slate-600 w-max">
            <label className={`px-1.5 py-0.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer rounded ${editData.status === 'InProcess' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <input
                type="radio"
                name={`status-${task.id}`}
                className="sr-only"
                checked={editData.status === 'InProcess'}
                onChange={() => handleInlineEdit('status', 'InProcess')}
              />
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l3 3" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4a8 8 0 110 16 8 8 0 010-16z" />
              </svg>
              In process
            </label>
            <label className={`px-1.5 py-0.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer rounded ${editData.status === 'Completed' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <input
                type="radio"
                name={`status-${task.id}`}
                className="sr-only"
                checked={editData.status === 'Completed'}
                onChange={() => handleInlineEdit('status', 'Completed')}
              />
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </label>
          </div>
        ) : (
          <span 
            className={`inline-flex px-3 py-2 text-sm cursor-pointer hover:bg-slate-700/40 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'}`}
            onClick={() => handleFieldClick('status')}
            title="Click to change status"
          >
            {task.status}
          </span>
        )}
      </div>


      {/* Total Cost */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        {editingField === 'totalPrice' ? (
          renderEditableField('totalPrice', 'Total Price', task.totalPrice?.toString() || '', 'number')
        ) : (
          <span 
            className={`cursor-pointer hover:bg-slate-700/40 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'}`}
            onClick={() => handleFieldClick('totalPrice')}
            title="Click to edit"
          >
            {showCost ? (task.totalPrice ? `£${task.totalPrice.toFixed(2)}` : 'N/A') : '••••'}
          </span>
        )}
      </div>

      {/* Billing: Invoice + Paid */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        <div className="flex flex-col items-start gap-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(task.invoiced)}
              onChange={(e) => onEditTask(task.id, { invoiced: e.target.checked, updatedAt: new Date() })}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-slate-300 text-[11px]">Inv</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(task.paid)}
              onChange={(e) => onEditTask(task.id, { paid: e.target.checked, updatedAt: new Date() })}
              className="h-4 w-4 accent-green-600"
            />
            <span className="text-slate-300 text-[11px]">Paid</span>
          </label>
        </div>
      </div>

      {/* Assignees */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
        {editingField === 'assignees' ? (
          <select
            multiple
            value={editData.assignees as string[]}
            onChange={(e) => {
              const values = Array.from(e.currentTarget.selectedOptions).map(o => o.value);
              onEditTask(task.id, { assignees: values, updatedAt: new Date() });
              setEditingField(null);
            }}
            onBlur={() => setEditingField(null)}
            className="w-full px-2 py-1.5 text-[12px] bg-slate-800 border border-slate-600 text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
            size={Math.min(assignees.length || 1, 4)}
            autoFocus
          >
            {assignees.map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
        ) : (
          <span
            className={`cursor-pointer hover:bg-slate-700/40 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'}`}
            onClick={() => handleFieldClick('assignees')}
            title="Click to edit assignees"
          >
            {(task.assignees && task.assignees.length) ? task.assignees.join(', ') : 'Unassigned'}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-start gap-2 px-2 py-1.5 overflow-hidden">
        <button
          onClick={() => setShowAssignModal(true)}
          className="text-slate-300 hover:text-slate-100 transition-colors duration-200"
          aria-label="Assign team members"
          title="Assign team members"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20v-2a4 4 0 013-3.87M15 11a4 4 0 10-8 0 4 4 0 008 0z" />
          </svg>
        </button>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="text-green-400 hover:text-green-300 transition-colors duration-200"
              aria-label="Save changes"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="text-slate-300 hover:text-slate-200 transition-colors duration-200"
              aria-label="Cancel editing"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="text-red-400 hover:text-red-300 transition-colors duration-200"
              aria-label="Delete task"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>

      <AssigneesModal
        open={showAssignModal}
        options={assignees}
        initial={task.assignees || []}
        onClose={() => setShowAssignModal(false)}
        onSave={(vals) => { onEditTask(task.id, { assignees: vals, updatedAt: new Date() }); setShowAssignModal(false); }}
      />
    </div>
  );
}
