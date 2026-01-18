'use client';

import { useState } from 'react';
import { TaskInput, Priority, Status, CMS } from '@/types/task';
import { useAssignees } from '@/contexts/AssigneeContext';
import { useGroups } from '@/contexts/GroupContext';

interface AddTaskProps {
  onAddTask: (task: TaskInput) => void;
  isVisible: boolean;
  onClose: () => void;
}

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const statuses: Status[] = ['InProcess', 'Completed'];
const cmsOptions: CMS[] = ['Wordpress', 'Shopify', 'Designing' , 'SEO' , 'Marketing'];
const todayStr = new Date().toISOString().split('T')[0];

export default function AddTask({ onAddTask, isVisible, onClose }: AddTaskProps) {
  const { assignees, loading: assigneesLoading, addAssignee } = useAssignees();
  const { groups, loading: groupsLoading } = useGroups();
  
  const [dueDate, setDueDate] = useState(todayStr);
  const [priority, setPriority] = useState<Priority>('Low');
  
  // New field states
  const [status, setStatus] = useState<Status>('InProcess');
  const [clientName, setClientName] = useState('');
  const [clientGroup, setClientGroup] = useState('');
  const [cms, setCms] = useState<CMS | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [customAssignee, setCustomAssignee] = useState('');
  const [showCustomAssignee, setShowCustomAssignee] = useState(false);
  const [showAssigneesModal, setShowAssigneesModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName.trim() && clientGroup) { // Check both required fields
      const finalAssignees: string[] = [...selectedAssignees];
      const custom = customAssignee.trim();
      if (showCustomAssignee && custom) {
        finalAssignees.push(custom);
        addAssignee(custom);
      }
      
      onAddTask({
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        completed: false,
        // New fields
        status,
        clientName: clientName.trim(),
        clientGroup: clientGroup,
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
      setDueDate(todayStr);
      setPriority('Low');
      // Reset new fields
      setStatus('InProcess');
      setClientName('');
      setClientGroup('');
      setCms(null);
      setWebUrl('');
      setFigmaUrl('');
      setAssetUrl('');
      setTotalPrice('');
      setDeposit('');
      setSelectedAssignees([]);
      setCustomAssignee('');
      setShowCustomAssignee(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setDueDate(todayStr);
    setPriority('Low');
    // Reset new fields
    setStatus('InProcess');
    setClientName('');
    setClientGroup('');
    setCms(null);
    setWebUrl('');
    setFigmaUrl('');
    setAssetUrl('');
    setTotalPrice('');
    setDeposit('');
    setSelectedAssignees([]);
    setCustomAssignee('');
    setShowCustomAssignee(false);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 shadow p-6 w-full max-w-2xl mx-4 my-8">
        <h2 className="text-xl font-semibold mb-4 text-slate-100">Add New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-slate-300 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="Enter client name..."
                required
              />
            </div>
            
            <div>
              <label htmlFor="clientGroup" className="block text-sm font-medium text-slate-300 mb-1">
                Client Group *
              </label>
              <select
                id="clientGroup"
                value={clientGroup}
                onChange={(e) => setClientGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                required
                disabled={groupsLoading}
              >
                <option value="">{groupsLoading ? 'Loading groups...' : 'Select a group...'}</option>
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-3 text-base bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
<label htmlFor="cms" className="block text-sm font-medium text-slate-300 mb-1">
                Job Desc
              </label>
              <select
                id="cms"
                value={cms || ''}
                onChange={(e) => setCms(e.target.value ? e.target.value as CMS : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                {cmsOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="webUrl" className="block text-sm font-medium text-slate-300 mb-1">
                Web URL
              </label>
              <input
                type="url"
                id="webUrl"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="figmaUrl" className="block text-sm font-medium text-slate-300 mb-1">
                Figma URL
              </label>
              <input
                type="url"
                id="figmaUrl"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="https://figma.com/..."
              />
            </div>
            
            <div>
              <label htmlFor="assetUrl" className="block text-sm font-medium text-slate-300 mb-1">
                Asset URL
              </label>
              <input
                type="url"
                id="assetUrl"
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalPrice" className="block text-sm font-medium text-slate-300 mb-1">
                Total Price ($)
              </label>
              <input
                type="number"
                id="totalPrice"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            
            <div>
              <label htmlFor="deposit" className="block text-sm font-medium text-slate-300 mb-1">
                Deposit ($)
              </label>
              <input
                type="number"
                id="deposit"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Assignees
            </label>
            <div className="space-y-2 relative">
              <button
                type="button"
                onClick={() => setShowAssigneesModal(!showAssigneesModal)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
                disabled={assigneesLoading}
              >
                <span>
                  {assigneesLoading 
                    ? 'Loading assignees...' 
                    : selectedAssignees.length === 0 
                      ? 'Select users...' 
                      : `${selectedAssignees.length} user${selectedAssignees.length !== 1 ? 's' : ''} selected`
                  }
                </span>
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${showAssigneesModal ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown List */}
              {showAssigneesModal && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {assignees.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">
                      No users available. Add them in the User Management tab first.
                    </div>
                  ) : (
                    <>
                      {/* Quick Actions */}
                      <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-750">
                        <span className="text-xs text-slate-400 font-medium">Select Users</span>
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
                      
                      {/* Assignee List */}
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
                              <div className="text-xs text-slate-500">User</div>
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
                      
                      {/* Done Button */}
                      <div className="p-2 border-t border-slate-700 bg-slate-750">
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
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
                  autoFocus
                />
              )}
              
              <button
                type="button"
                onClick={() => setShowCustomAssignee(!showCustomAssignee)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showCustomAssignee ? 'Cancel' : '+ Add New User'}
              </button>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}