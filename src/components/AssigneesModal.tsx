'use client';

import React, { useEffect, useState } from 'react';

interface AssigneesModalProps {
  open: boolean;
  options: string[];
  initial: string[];
  onClose: () => void;
  onSave: (values: string[]) => void;
  title?: string;
}

export default function AssigneesModal({ open, options, initial, onClose, onSave, title = 'Assign Team Members' }: AssigneesModalProps) {
  const [values, setValues] = useState<string[]>(initial);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  if (!open) return null;

  const toggleAssignee = (assignee: string) => {
    setValues(prev => 
      prev.includes(assignee) 
        ? prev.filter(v => v !== assignee)
        : [...prev, assignee]
    );
  };

  const getAssigneeInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getAssigneeColor = (name: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-emerald-400 to-emerald-600', 
      'from-purple-400 to-purple-600',
      'from-orange-400 to-orange-600',
      'from-pink-400 to-pink-600',
      'from-teal-400 to-teal-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 flex-shrink-0">
          <div>
            <h3 className="text-slate-100 text-lg font-semibold">{title}</h3>
            <p className="text-slate-400 text-sm mt-1">
              {values.length} of {options.length} members selected
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-300 transition-all duration-200"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-hidden">
          {options.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-xl flex items-center justify-center">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-slate-300 font-medium mb-2">No team members available</h4>
              <p className="text-slate-500 text-sm">Add team members in the sidebar to assign them to tasks.</p>
            </div>
          ) : (
            <div className="space-y-3 h-full">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 text-sm font-medium">Available Team Members</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setValues([])}
                    className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-300 rounded-lg transition-all duration-200"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setValues([...options])}
                    className="px-3 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-lg transition-all duration-200"
                  >
                    Select All
                  </button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800/30">
                <div className="p-3 space-y-2">
                  {options.map(assignee => {
                    const isSelected = values.includes(assignee);
                    return (
                      <div
                        key={assignee}
                        onClick={() => toggleAssignee(assignee)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' 
                            : 'hover:bg-slate-700/30 border border-transparent text-slate-300 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-8 h-8 bg-gradient-to-br ${getAssigneeColor(assignee)} rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                          {getAssigneeInitials(assignee)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{assignee}</div>
                          <div className="text-xs text-slate-500">Team Member</div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-slate-500 hover:border-slate-400'
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-700/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-slate-200 rounded-xl font-medium transition-all duration-200 border border-slate-600/50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(values)}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Assign Selected ({values.length})
          </button>
        </div>
      </div>
    </div>
  );
}
