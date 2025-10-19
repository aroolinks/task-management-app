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
            <label htmlFor="assignees" className="block text-sm font-medium text-slate-300 mb-1">
              Assignees (Cmd/Ctrl+Click to select multiple)
            </label>
            <div className="space-y-2">
              <select
                id="assignees"
                multiple
                value={selectedAssignees}
                onChange={(e) => {
                  const values = Array.from(e.currentTarget.selectedOptions).map(o => o.value);
                  const hasCustom = values.includes('custom');
                  setShowCustomAssignee(hasCustom);
                  setSelectedAssignees(hasCustom ? values.filter(v => v !== 'custom') : values);
                  if (!hasCustom) setCustomAssignee('');
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-[12px]"
                disabled={assigneesLoading}
                size={Math.min(assignees.length + 1, 6)}
              >
                {assignees.map(person => (
                  <option key={person} value={person}>{person}</option>
                ))}
                <option value="custom">+ Add New Assignee</option>
              </select>
              {showCustomAssignee && (
                <input
                  type="text"
                  value={customAssignee}
                  onChange={(e) => setCustomAssignee(e.target.value)}
                  placeholder="Enter new assignee name..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-[12px]"
                  autoFocus
                />
              )}
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