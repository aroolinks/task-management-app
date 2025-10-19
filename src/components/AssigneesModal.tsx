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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-slate-100 text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-300 text-sm">Select assignees</label>
          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-600 p-2">
            <ul className="space-y-1">
              {options.map(opt => {
                const checked = values.includes(opt);
                return (
                  <li key={opt} className="flex items-center gap-2">
                    <input
                      id={`assignee-${opt}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setValues(prev => e.target.checked ? [...prev, opt] : prev.filter(v => v !== opt));
                      }}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <label htmlFor={`assignee-${opt}`} className="text-[12px] text-slate-100 cursor-pointer select-none">
                      {opt}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onSave(values)}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
