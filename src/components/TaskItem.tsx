'use client';

import { useState } from 'react';
import { Task, Priority, Status, CMS } from '@/types/task';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import AssigneesModal from './AssigneesModal';

interface TaskItemProps {
  task: Task;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  showCost?: boolean;
  autoEdit?: boolean;
}

const cmsOptions: CMS[] = ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'];


export default function TaskItem({ task, onDeleteTask, onEditTask, showCost = false, autoEdit = false }: TaskItemProps) {
  const { user } = useAuth();
  const { assignees } = useAssignees();
  const { groups } = useGroups();
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [editingField, setEditingField] = useState<string | null>(autoEdit ? 'clientName' : null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
        assignees: task.assignees || [],
        notes: task.notes || ''
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
            className="bg-white border border-gray-300 text-gray-900 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
          className={`bg-white border border-gray-300 text-gray-900 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-w-0 w-full`}
          autoFocus
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
        />
      );
    }
    
    if (type === 'url') {
      return (
        <span 
        className={`inline-flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors ${task.status === 'Completed' ? 'text-blue-600' : 'text-blue-700'} max-w-[160px] truncate`}
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
        className={`cursor-pointer hover:bg-gray-100 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-gray-500' : 'text-gray-900'}`}
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

  // Get row background color based on status
  const getRowBgColor = () => {
    switch (task.status) {
      case 'Completed': return 'bg-green-50 border-l-4 border-l-green-200';
      case 'InProcess': return 'bg-blue-50 border-l-4 border-l-blue-200';
      case 'Waiting for Quote': return 'bg-gray-50 border-l-4 border-l-gray-200';
      default: return 'bg-white border-l-4 border-l-transparent';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Done
          </span>
        );
      case 'InProcess':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Active
          </span>
        );
      case 'Waiting for Quote':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Wait
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={`grid items-center gap-0 px-4 text-xs min-h-[48px] ${task.status === 'Completed' ? 'text-gray-500' : 'text-gray-900'} ${getRowBgColor()} transition-colors hover:bg-gray-50 ${
      user?.role === 'admin' 
        ? 'grid-cols-[160px_90px_120px_90px_120px_100px_110px_90px_120px_120px]'
        : 'grid-cols-[160px_90px_120px_90px_120px_100px_110px_120px]'
    }`}>

      {/* Client Name */}
      <div className="px-2 py-1.5 text-left overflow-hidden">
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
            className="w-full px-2 py-1.5 text-xs bg-white border border-blue-500 text-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            placeholder="Enter client name..."
            autoFocus
          />
        ) : (
          <span
            className={`truncate block cursor-pointer hover:bg-gray-100 px-2 py-1.5 rounded transition-colors ${
              task.status === 'Completed' ? 'text-gray-500' : 
              (!task.clientName || task.clientName.trim() === '') ? 'text-blue-600 italic' : 'text-gray-900'
            }`}
            onClick={() => handleFieldClick('clientName')}
            title="Click to edit client name"
          >
            {task.clientName && task.clientName.trim() !== '' ? task.clientName : 'Click to add client name...'}
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
            className="w-full px-2 py-1.5 text-[12px] bg-white border border-gray-300 text-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            <option value="">No Group</option>
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        ) : (
          <span
            className={`flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-gray-500' : 'text-gray-900'}`}
            onClick={() => handleFieldClick('clientGroup')}
            title="Click to change group (will move task to different tab)"
          >
            <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <a href={task.webUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 text-sm shrink-0">
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
              <a href={task.figmaUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 text-sm shrink-0" title="Open Figma">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {renderEditableField('assetUrl', 'Asset URL', task.assetUrl, 'url')}
            {task.assetUrl && editingField !== 'assetUrl' && (
              <a href={task.assetUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 text-sm shrink-0" title="Open Asset">
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
          <div role="radiogroup" className="flex flex-col gap-1 bg-white px-2 py-1.5 rounded border border-gray-300 w-max">
            <label className={`px-2 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer rounded transition-colors ${editData.status === 'InProcess' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'}`}
            >
              <input
                type="radio"
                name={`status-${task.id}`}
                className="sr-only"
                checked={editData.status === 'InProcess'}
                onChange={() => handleInlineEdit('status', 'InProcess')}
              />
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Active
            </label>
            <label className={`px-2 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer rounded transition-colors ${editData.status === 'Completed' ? 'bg-green-100 text-green-800 border border-green-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'}`}
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
              Done
            </label>
          </div>
        ) : (
          <div 
            className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors"
            onClick={() => handleFieldClick('status')}
            title="Click to change status"
          >
            {getStatusBadge(task.status)}
          </div>
        )}
      </div>

      {/* Total Cost - Admin Only */}
      {user?.role === 'admin' && (
        <div className="px-2 py-1.5 text-left overflow-hidden">
          {editingField === 'totalPrice' ? (
            renderEditableField('totalPrice', 'Total Price', task.totalPrice?.toString() || '', 'number')
          ) : (
            <span 
              className={`cursor-pointer hover:bg-gray-100 px-2 py-1.5 rounded transition-colors ${task.status === 'Completed' ? 'text-gray-500' : 'text-gray-900'}`}
              onClick={() => handleFieldClick('totalPrice')}
              title="Click to edit"
            >
              {showCost ? (task.totalPrice ? `£${task.totalPrice.toFixed(2)}` : 'N/A') : '••••'}
            </span>
          )}
        </div>
      )}

      {/* Billing: Invoice + Paid - Admin Only */}
      {user?.role === 'admin' && (
        <div className="px-2 py-2 text-left overflow-hidden">
          <div className="flex flex-col gap-1.5">
          {/* Invoice Status */}
          <div 
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
              task.invoiced 
                ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            onClick={() => onEditTask(task.id, { invoiced: !task.invoiced, updatedAt: new Date() })}
            title={task.invoiced ? 'Mark as not invoiced' : 'Mark as invoiced'}
          >
            <div className={`w-3 h-3 rounded border transition-colors flex items-center justify-center ${
              task.invoiced 
                ? 'bg-blue-600 border-blue-600' 
                : 'border-gray-400 hover:border-gray-500'
            }`}>
              {task.invoiced && (
                <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs font-medium">
              {task.invoiced ? 'Invoiced' : 'Invoice'}
            </span>
          </div>

          {/* Payment Status */}
          <div 
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
              task.paid 
                ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            onClick={() => {
              const newPaidStatus = !task.paid;
              const updates: Partial<Task> = { 
                paid: newPaidStatus, 
                updatedAt: new Date() 
              };
              
              // Auto-complete task when payment is marked as paid
              if (newPaidStatus) {
                updates.status = 'Completed';
              }
              
              onEditTask(task.id, updates);
            }}
            title={task.paid ? 'Mark as unpaid' : 'Mark as paid (will complete task)'}
          >
            <div className={`w-3 h-3 rounded border transition-colors flex items-center justify-center ${
              task.paid 
                ? 'bg-green-600 border-green-600' 
                : 'border-gray-400 hover:border-gray-500'
            }`}>
              {task.paid && (
                <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs font-medium">
              {task.paid ? 'Paid' : 'Payment'}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-start gap-2 px-2 py-2 overflow-hidden">
        {/* Assign Button */}
        <button
          onClick={() => setShowAssignModal(true)}
          className="w-7 h-7 bg-blue-100 hover:bg-blue-200 border border-blue-200 hover:border-blue-300 rounded flex items-center justify-center text-blue-700 hover:text-blue-800 transition-colors"
          aria-label="Manage assignments"
          title="Assign users"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20v-2a4 4 0 013-3.87M15 11a4 4 0 10-8 0 4 4 0 008 0z" />
          </svg>
        </button>

        {/* Edit/Status Indicator */}
        {hasUnsavedChanges ? (
          <div className="w-7 h-7 bg-yellow-100 border border-yellow-200 rounded flex items-center justify-center text-yellow-700" title="Auto-saving changes...">
            <svg className="h-3.5 w-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 4" />
            </svg>
          </div>
        ) : editingField ? (
          <div className="w-7 h-7 bg-blue-100 border border-blue-200 rounded flex items-center justify-center text-blue-700" title="Editing mode - changes save automatically">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded flex items-center justify-center text-gray-600 hover:text-gray-700 transition-colors"
            aria-label="Edit task"
            title="Edit task"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Delete Button */}
        <button
          onClick={() => onDeleteTask(task.id)}
          className="w-7 h-7 bg-red-100 hover:bg-red-200 border border-red-200 hover:border-red-300 rounded flex items-center justify-center text-red-700 hover:text-red-800 transition-colors"
          aria-label="Delete task"
          title="Delete task"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
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
