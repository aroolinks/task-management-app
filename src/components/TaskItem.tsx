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

const cmsOptions: CMS[] = ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'];


export default function TaskItem({ task, onDeleteTask, onEditTask, showCost = false, autoEdit = false }: TaskItemProps) {
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
    setEditingField(null);
    setHasUnsavedChanges(false);
  };

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
            className="bg-slate-800/50 border border-slate-600/50 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm"
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
          className={`bg-slate-800/50 border border-slate-600/50 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 min-w-0 w-full backdrop-blur-sm`}
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
      case 'Completed': return 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500/50';
      case 'InProcess': return 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500/50';
      case 'Waiting for Quote': return 'bg-slate-500/5 hover:bg-slate-500/10 border-l-4 border-l-slate-500/50';
      default: return 'bg-transparent hover:bg-slate-700/20 border-l-4 border-l-transparent';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Done
          </span>
        );
      case 'InProcess':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Active
          </span>
        );
      case 'Waiting for Quote':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Wait
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={`grid grid-cols-[160px_90px_120px_90px_120px_100px_110px_90px_120px_110px_120px] items-center gap-0 px-4 text-xs min-h-[48px] ${task.status === 'Completed' ? 'text-slate-400' : 'text-slate-100'} divide-x divide-slate-700/30 ${getRowBgColor()} transition-all duration-200`}>

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
            className="w-full px-2 py-1.5 text-xs bg-slate-800/50 border border-blue-500/50 text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 backdrop-blur-sm"
            placeholder="Enter client name..."
            autoFocus
          />
        ) : (
          <span
            className={`truncate block cursor-pointer hover:bg-slate-700/40 px-2 py-1.5 rounded transition-colors ${
              task.status === 'Completed' ? 'text-slate-400' : 
              (!task.clientName || task.clientName.trim() === '') ? 'text-blue-400 italic' : 'text-slate-100'
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
          <div role="radiogroup" className="flex flex-col gap-1 bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-600/50 w-max backdrop-blur-sm">
            <label className={`px-2 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer rounded transition-all duration-200 ${editData.status === 'InProcess' ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 border border-transparent'}`}
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
            <label className={`px-2 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer rounded transition-all duration-200 ${editData.status === 'Completed' ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 border border-transparent'}`}
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
            className="cursor-pointer hover:bg-slate-700/30 px-1 py-0.5 rounded transition-all duration-200"
            onClick={() => handleFieldClick('status')}
            title="Click to change status"
          >
            {getStatusBadge(task.status)}
          </div>
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
      <div className="px-2 py-2 text-left overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {/* Invoice Status */}
          <div 
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all duration-200 ${
              task.invoiced 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20' 
                : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:bg-slate-600/30'
            }`}
            onClick={() => onEditTask(task.id, { invoiced: !task.invoiced, updatedAt: new Date() })}
            title={task.invoiced ? 'Mark as not invoiced' : 'Mark as invoiced'}
          >
            <div className={`w-3 h-3 rounded border transition-all duration-200 flex items-center justify-center ${
              task.invoiced 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-slate-500 hover:border-slate-400'
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
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all duration-200 ${
              task.paid 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:bg-slate-600/30'
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
            <div className={`w-3 h-3 rounded border transition-all duration-200 flex items-center justify-center ${
              task.paid 
                ? 'bg-emerald-500 border-emerald-500' 
                : 'border-slate-500 hover:border-slate-400'
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

      {/* Assignees */}
      <div className="px-2 py-2 text-left overflow-hidden">
        <div className="flex items-center gap-1 flex-wrap">
          {task.assignees && task.assignees.length > 0 ? (
            <>
              {task.assignees.slice(0, 3).map((assignee) => (
                <div
                  key={assignee}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-xs font-medium cursor-pointer hover:bg-blue-500/20 transition-all duration-200"
                  onClick={() => setShowAssignModal(true)}
                  title={`Assigned to ${assignee}. Click to manage assignments`}
                >
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {assignee.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[50px]">{assignee}</span>
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-500/20 transition-all duration-200"
                  onClick={() => setShowAssignModal(true)}
                  title={`+${task.assignees.length - 3} more assignees. Click to view all`}
                >
                  <div className="w-4 h-4 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    +{task.assignees.length - 3}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-700/30 hover:bg-slate-600/30 border border-slate-600/30 rounded-lg text-xs text-slate-400 hover:text-slate-300 transition-all duration-200 cursor-pointer"
              title="Click to assign team members"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Unassigned</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-start gap-2 px-2 py-2 overflow-hidden">
        {/* Assign Button */}
        <button
          onClick={() => setShowAssignModal(true)}
          className="w-7 h-7 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:text-blue-300 transition-all duration-200 btn-hover"
          aria-label="Manage assignments"
          title="Assign team members"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20v-2a4 4 0 013-3.87M15 11a4 4 0 10-8 0 4 4 0 008 0z" />
          </svg>
        </button>

        {/* Edit/Status Indicator */}
        {hasUnsavedChanges ? (
          <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-400" title="Auto-saving changes...">
            <svg className="h-3.5 w-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 4" />
            </svg>
          </div>
        ) : editingField ? (
          <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400" title="Editing mode - changes save automatically">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="w-7 h-7 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-300 transition-all duration-200 btn-hover"
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
          className="w-7 h-7 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-200 btn-hover"
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
