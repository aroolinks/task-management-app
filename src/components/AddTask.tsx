'use client';

import { useState } from 'react';
import { TaskInput, Priority, Status, CMS } from '@/types/task';

interface AddTaskProps {
  onAddTask: (task: TaskInput) => void;
  isVisible: boolean;
  onClose: () => void;
}

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const statuses: Status[] = ['InProcess', 'Waiting for Quote', 'Completed'];
const cmsOptions: CMS[] = ['Wordpress', 'Shopify', 'Designing' , 'SEO' , 'Marketing'];

export default function AddTask({ onAddTask, isVisible, onClose }: AddTaskProps) {
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  
  // New field states
  const [status, setStatus] = useState<Status>('InProcess');
  const [clientName, setClientName] = useState('');
  const [cms, setCms] = useState<CMS | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName.trim()) { // Use clientName as the required field instead
      onAddTask({
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        completed: false,
        // New fields
        status,
        clientName: clientName.trim(),
        cms,
        webUrl: webUrl.trim(),
        figmaUrl: figmaUrl.trim(),
        assetUrl: assetUrl.trim(),
        totalPrice: totalPrice ? parseFloat(totalPrice) : null,
        deposit: deposit ? parseFloat(deposit) : null,
      });
      setDueDate('');
      setPriority('Medium');
      // Reset new fields
      setStatus('InProcess');
      setClientName('');
      setCms(null);
      setWebUrl('');
      setFigmaUrl('');
      setAssetUrl('');
      setTotalPrice('');
      setDeposit('');
      onClose();
    }
  };

  const handleCancel = () => {
    setDueDate('');
    setPriority('Medium');
    // Reset new fields
    setStatus('InProcess');
    setClientName('');
    setCms(null);
    setWebUrl('');
    setFigmaUrl('');
    setAssetUrl('');
    setTotalPrice('');
    setDeposit('');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter client name..."
              required
            />
          </div>
          
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
<label htmlFor="cms" className="block text-sm font-medium text-gray-700 mb-1">
                Job Desc
              </label>
              <select
                id="cms"
                value={cms || ''}
                onChange={(e) => setCms(e.target.value ? e.target.value as CMS : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {cmsOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="webUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Web URL
              </label>
              <input
                type="url"
                id="webUrl"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="figmaUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Figma URL
              </label>
              <input
                type="url"
                id="figmaUrl"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://figma.com/..."
              />
            </div>
            
            <div>
              <label htmlFor="assetUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Asset URL
              </label>
              <input
                type="url"
                id="assetUrl"
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Total Price ($)
              </label>
              <input
                type="number"
                id="totalPrice"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            
            <div>
              <label htmlFor="deposit" className="block text-sm font-medium text-gray-700 mb-1">
                Deposit ($)
              </label>
              <input
                type="number"
                id="deposit"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}