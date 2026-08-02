'use client';

import { useEffect, useState } from 'react';
import { TaskInput, Priority, Status } from '@/types/task';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useClients } from '@/contexts/ClientContext';
import { useProjectTypes } from '@/contexts/ProjectTypeContext';

interface AddTaskProps {
  onAddTask: (task: TaskInput) => Promise<boolean>;
  isVisible: boolean;
  onClose: () => void;
  defaultClientName?: string;
}

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const statuses: Status[] = ['InProcess', 'Waiting for Quote', 'Completed'];

const getToday = () => new Date().toISOString().split('T')[0];

const fieldClass =
  'w-full px-3 py-2 bg-slate-900/50 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-colors';
const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

export default function AddTask({ onAddTask, isVisible, onClose, defaultClientName }: AddTaskProps) {
  const { assignees, loading: assigneesLoading, addAssignee } = useAssignees();
  const { clients, loading: clientsLoading } = useClients();
  const { projectTypeNames } = useProjectTypes();

  const [dueDate, setDueDate] = useState(getToday());
  const [priority, setPriority] = useState<Priority>('Low');
  const [status, setStatus] = useState<Status>('InProcess');
  const [clientName, setClientName] = useState('');
  const [cms, setCms] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [customAssignee, setCustomAssignee] = useState('');
  const [showCustomAssignee, setShowCustomAssignee] = useState(false);
  const [showAssigneesModal, setShowAssigneesModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form to sensible fresh defaults every time the modal opens,
  // so the date is always today's date rather than whatever was left over.
  useEffect(() => {
    if (!isVisible) return;
    setDueDate(getToday());
    setPriority('Low');
    setStatus('InProcess');
    setClientName(defaultClientName && defaultClientName !== 'all' ? defaultClientName : '');
    setCms(null);
    setWebUrl('');
    setFigmaUrl('');
    setAssetUrl('');
    setTotalPrice('');
    setDeposit('');
    setSelectedAssignees([]);
    setCustomAssignee('');
    setShowCustomAssignee(false);
    setShowAssigneesModal(false);
    setShowMoreDetails(false);
    setSubmitting(false);
    setFormError(null);
  }, [isVisible, defaultClientName]);

  // Close on Escape
  useEffect(() => {
    if (!isVisible) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setFormError('Please select a client');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    const finalAssignees: string[] = [...selectedAssignees];
    const custom = customAssignee.trim();
    if (showCustomAssignee && custom) {
      finalAssignees.push(custom);
      addAssignee(custom);
    }

    const success = await onAddTask({
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      completed: false,
      status,
      clientName: clientName.trim(),
      clientGroup: clientName.trim(),
      cms,
      webUrl: webUrl.trim(),
      figmaUrl: figmaUrl.trim(),
      assetUrl: assetUrl.trim(),
      totalPrice: totalPrice ? parseFloat(totalPrice) : null,
      deposit: deposit ? parseFloat(deposit) : null,
      invoiced: false,
      paid: false,
      assignees: finalAssignees,
      notes: '',
    });

    setSubmitting(false);

    if (!success) {
      setFormError('Failed to create project. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-100">New Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
            title="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="px-5 py-4 space-y-3 overflow-y-auto min-h-0 flex-1">
            {clients.length === 0 && !clientsLoading ? (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-200 text-xs">
                  No clients yet. Create a client or agency in the Clients tab first, then come back to add a project.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="clientName" className={labelClass}>Client *</label>
                <select
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={fieldClass}
                  required
                  disabled={clientsLoading || clients.length === 0}
                  autoFocus
                >
                  <option value="">{clientsLoading ? 'Loading...' : 'Select...'}</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.name}>
                      {client.name}{client.type === 'agency' ? ' (Agency)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dueDate" className={labelClass}>Due Date</label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="priority" className={labelClass}>Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={fieldClass}
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreDetails(prev => !prev)}
              className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors pt-1"
            >
              <svg className={`h-3 w-3 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {showMoreDetails ? 'Hide details' : 'More details'}
            </button>

            {showMoreDetails && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="status" className={labelClass}>Status</label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className={fieldClass}
                    >
                      {statuses.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cms" className={labelClass}>Project Type</label>
                    <select
                      id="cms"
                      value={cms || ''}
                      onChange={(e) => setCms(e.target.value || null)}
                      className={fieldClass}
                    >
                      <option value="">None</option>
                      {projectTypeNames.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="webUrl" className={labelClass}>Web URL</label>
                  <input
                    type="url"
                    id="webUrl"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    className={fieldClass}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="figmaUrl" className={labelClass}>Figma URL</label>
                    <input
                      type="url"
                      id="figmaUrl"
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      className={fieldClass}
                      placeholder="https://figma.com/..."
                    />
                  </div>

                  <div>
                    <label htmlFor="assetUrl" className={labelClass}>Asset URL</label>
                    <input
                      type="url"
                      id="assetUrl"
                      value={assetUrl}
                      onChange={(e) => setAssetUrl(e.target.value)}
                      className={fieldClass}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="totalPrice" className={labelClass}>Total Price (£)</label>
                    <input
                      type="number"
                      id="totalPrice"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      className={fieldClass}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="deposit" className={labelClass}>Deposit (£)</label>
                    <input
                      type="number"
                      id="deposit"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      className={fieldClass}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Assignees</label>
                  <div className="space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowAssigneesModal(!showAssigneesModal)}
                      className={`${fieldClass} text-left flex items-center justify-between hover:bg-slate-800`}
                      disabled={assigneesLoading}
                    >
                      <span>
                        {assigneesLoading
                          ? 'Loading assignees...'
                          : selectedAssignees.length === 0
                            ? 'Select team members...'
                            : `${selectedAssignees.length} team member${selectedAssignees.length !== 1 ? 's' : ''} selected`
                        }
                      </span>
                      <svg className={`h-4 w-4 text-slate-400 transition-transform ${showAssigneesModal ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showAssigneesModal && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {assignees.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-sm">
                            No team members available. Add them in the Team Management tab first.
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between p-2 border-b border-slate-700">
                              <span className="text-xs text-slate-400 font-medium">Select Team Members</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssignees([])}
                                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssignees([...assignees])}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  All
                                </button>
                              </div>
                            </div>

                            {assignees.map(assignee => {
                              const isSelected = selectedAssignees.includes(assignee);
                              const initials = assignee.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
                              const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                              const colorClass = colors[assignee.length % colors.length];

                              return (
                                <div
                                  key={assignee}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedAssignees(prev => prev.filter(a => a !== assignee));
                                    } else {
                                      setSelectedAssignees(prev => [...prev, assignee]);
                                    }
                                  }}
                                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'hover:bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                                    {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{assignee}</div>
                                  </div>
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'border-slate-500'
                                  }`}>
                                    {isSelected && (
                                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            <div className="p-2 border-t border-slate-700">
                              <button
                                type="button"
                                onClick={() => setShowAssigneesModal(false)}
                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                              >
                                Done ({selectedAssignees.length} selected)
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {selectedAssignees.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedAssignees.map(assignee => (
                          <span
                            key={assignee}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-xs"
                          >
                            {assignee}
                            <button
                              type="button"
                              onClick={() => setSelectedAssignees(prev => prev.filter(a => a !== assignee))}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {showCustomAssignee && (
                      <input
                        type="text"
                        value={customAssignee}
                        onChange={(e) => setCustomAssignee(e.target.value)}
                        placeholder="Enter new assignee name..."
                        className={`${fieldClass} text-sm`}
                        autoFocus
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setShowCustomAssignee(!showCustomAssignee)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {showCustomAssignee ? 'Cancel' : '+ Add New Team Member'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {formError && (
              <p className="text-red-400 text-xs">{formError}</p>
            )}
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || clients.length === 0}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
