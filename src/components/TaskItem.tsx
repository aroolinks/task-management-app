'use client';

import { useState } from 'react';
import { Task, Priority, Status, CMS } from '@/types/task';

interface TaskItemProps {
  task: Task;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  autoEdit?: boolean;
}

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const statuses: Status[] = ['InProcess', 'Waiting for Quote', 'Completed'];
const cmsOptions: CMS[] = ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'];

const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case 'Low': return 'bg-blue-700 text-blue-100 border-blue-600';
    case 'Medium': return 'bg-yellow-700 text-yellow-100 border-yellow-600';
    case 'High': return 'bg-orange-700 text-orange-100 border-orange-600';
    case 'Urgent': return 'bg-red-700 text-red-100 border-red-600';
    default: return 'bg-slate-700 text-slate-200 border-slate-600';
  }
};

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Completed': return 'bg-green-700 text-green-100 border-green-600';
    case 'InProcess': return 'bg-amber-700 text-amber-100 border-amber-600';
    case 'Waiting for Quote': return 'bg-slate-700 text-slate-200 border-slate-600';
    default: return 'bg-slate-700 text-slate-200 border-slate-600';
  }
};

export default function TaskItem({ task, onDeleteTask, onEditTask, autoEdit = false }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [editingField, setEditingField] = useState<string | null>(null);
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
    deposit: task.deposit?.toString() || ''
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
      deposit: editData.deposit ? parseFloat(editData.deposit) : null,
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
      case 'deposit':
        updates.deposit = value ? parseFloat(String(value)) : null;
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
        deposit: task.deposit?.toString() || ''
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      handleInlineEdit(field, editData[field as keyof typeof editData]);
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
            className="bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500"
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
          onBlur={() => handleInlineEdit(field, editData[field as keyof typeof editData])}
          onKeyPress={(e) => handleKeyPress(e, field)}
          className={`bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 ${type === 'date' ? 'py-1.5 text-sm' : 'py-1 text-xs'} focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-0 w-full`}
          autoFocus
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
        />
      );
    }
    
    if (type === 'url') {
      return (
        <span 
          className="inline-flex items-center gap-1 cursor-pointer hover:bg-slate-700/40 px-1.5 py-0.5 rounded transition-colors text-blue-300 max-w-[160px] truncate"
          onClick={() => handleFieldClick(field)}
          title="Click to edit"
        >
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1-1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 015.656 5.656l-1 1" />
          </svg>
          <span className="truncate">{String(displayValue)}</span>
        </span>
      );
    }

    return (
      <span 
        className="cursor-pointer hover:bg-slate-700/40 px-2 py-1 rounded transition-colors text-slate-100"
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
      deposit: task.deposit?.toString() || ''
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
    <div className={`grid grid-cols-[1fr_0.8fr_1fr_1fr_1fr_1fr_0.6fr_1fr_1fr_0.6fr_0.6fr_auto] items-center gap-0 px-3 py-1.5 text-[11px] text-slate-100 divide-x divide-slate-700 ${getRowBgColor()}`}>

      {/* Client Name */}
      <div className="min-w-0 px-2 py-1 text-left">
        {editingField === 'clientName' ? (
          <input
            type="text"
            value={editData.clientName}
            onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
            onBlur={() => handleInlineEdit('clientName', editData.clientName)}
            onKeyPress={(e) => handleKeyPress(e, 'clientName')}
            className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
            autoFocus
          />
        ) : (
          <span
            className={`truncate block cursor-pointer hover:bg-slate-700/40 px-2 py-1 rounded transition-colors ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-100'}`}
            onClick={() => handleFieldClick('clientName')}
            title="Click to edit client name"
          >
            {task.clientName || 'Unnamed Client'}
          </span>
        )}
      </div>

      {/* Client Group */}
      <div className="min-w-0 px-2 py-1 text-left">
        {editingField === 'clientGroup' ? (
          <input
            type="text"
            value={editData.clientGroup}
            onChange={(e) => setEditData({ ...editData, clientGroup: e.target.value })}
            onBlur={() => handleInlineEdit('clientGroup', editData.clientGroup)}
            onKeyPress={(e) => handleKeyPress(e, 'clientGroup')}
            className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Enter group name"
            autoFocus
          />
        ) : (
          <span
            className="flex items-center gap-1 cursor-pointer hover:bg-slate-700/40 px-2 py-1 rounded transition-colors text-slate-200"
            onClick={() => handleFieldClick('clientGroup')}
            title="Click to change group (will move task to different section)"
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
      <div className="min-w-0 flex items-center gap-2 px-2 py-1 text-left">
        {renderEditableField('webUrl', 'Web URL', task.webUrl, 'url')}
        {task.webUrl && editingField !== 'webUrl' && (
          <a href={task.webUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-slate-200 text-xs shrink-0">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* CMS */}
      <div className="min-w-0 px-2 py-1 text-left">
        {renderEditableField('cms', 'Job Desc', task.cms, 'select', cmsOptions)}
      </div>

      {/* Figma */}
      <div className="min-w-0 flex items-center gap-2 px-2 py-1 text-left">
        {renderEditableField('figmaUrl', 'Figma URL', task.figmaUrl, 'url')}
        {task.figmaUrl && editingField !== 'figmaUrl' && (
          <a href={task.figmaUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-slate-200 text-xs shrink-0">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Asset */}
      <div className="min-w-0 flex items-center gap-2 px-2 py-1 text-left">
        {renderEditableField('assetUrl', 'Asset URL', task.assetUrl, 'url')}
        {task.assetUrl && editingField !== 'assetUrl' && (
          <a href={task.assetUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-slate-200 text-xs shrink-0">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Due */}
      <div className="min-w-0 border border-slate-700 rounded-sm px-2 py-1 text-left">
        {renderEditableField('dueDate', 'Due Date', task.dueDate instanceof Date ? task.dueDate.toISOString().split('T')[0] : '', 'date')}
      </div>

      {/* Status */}
      <div className="min-w-[150px] px-2 py-1 text-left">
        {editingField === 'status' ? (
          <select
            value={editData.status}
            onChange={(e) => handleInlineEdit('status', e.target.value)}
            onBlur={() => setEditingField(null)}
            className="px-2 py-1 text-xs font-medium rounded-full border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
            autoFocus
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <span 
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:ring-2 hover:ring-slate-500 transition-all border ${getStatusColor(task.status)}`}
            onClick={() => handleFieldClick('status')}
            title="Click to change status"
          >
            {task.status}
          </span>
        )}
      </div>

      {/* Priority */}
      <div className="min-w-0 px-2 py-1 text-left">
        {editingField === 'priority' ? (
          <select
            value={editData.priority}
            onChange={(e) => handleInlineEdit('priority', e.target.value)}
            onBlur={() => setEditingField(null)}
            className="px-2 py-1 text-xs font-medium rounded-full border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
            autoFocus
          >
            {priorities.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        ) : (
          <span 
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:ring-2 hover:ring-slate-500 transition-all border ${getPriorityColor(task.priority)}`}
            onClick={() => handleFieldClick('priority')}
            title="Click to change priority"
          >
            {task.priority}
          </span>
        )}
      </div>

      {/* Total Cost */}
      <div className="min-w-0 px-2 py-1 text-left">
        {editingField === 'totalPrice' ? (
          renderEditableField('totalPrice', 'Total Price', task.totalPrice?.toString() || '', 'number')
        ) : (
          <span 
            className="cursor-pointer hover:bg-slate-700/40 px-2 py-1 rounded transition-colors"
            onClick={() => handleFieldClick('totalPrice')}
            title="Click to edit"
          >
            {task.totalPrice ? `£${task.totalPrice.toFixed(2)}` : 'N/A'}
          </span>
        )}
      </div>

      {/* Deposit */}
      <div className="min-w-0 px-2 py-1 text-left">
        {editingField === 'deposit' ? (
          renderEditableField('deposit', 'Deposit', task.deposit?.toString() || '', 'number')
        ) : (
          <span 
            className="cursor-pointer hover:bg-slate-700/40 px-2 py-1 rounded transition-colors"
            onClick={() => handleFieldClick('deposit')}
            title="Click to edit"
          >
            {task.deposit ? `£${task.deposit.toFixed(2)}` : 'N/A'}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-start gap-2 px-2 py-1">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="text-green-400 hover:text-green-300 transition-colors duration-200"
              aria-label="Save changes"
            >
<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="text-slate-300 hover:text-slate-200 transition-colors duration-200"
              aria-label="Cancel editing"
            >
<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
