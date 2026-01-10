'use client';

import { useState, useEffect } from 'react';

interface NotesModalProps {
  open: boolean;
  clientName: string;
  initialNotes: string;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export default function NotesModal({ open, clientName, initialNotes, onClose, onSave }: NotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, open]);

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Notes</h2>
            <p className="text-sm text-gray-600 mt-1">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            title="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes & Important Information
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Store client logins, passwords, important URLs, project details, or any other relevant information.
            </p>
          </div>
          
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-64 px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
            placeholder="Enter client notes, login credentials, important information...

Examples:
• Website Login: admin@client.com / password123
• FTP Details: ftp.client.com / username / password
• Important URLs: staging.client.com
• Client Contact: John Doe - john@client.com - +1234567890
• Project Requirements: Use blue theme, integrate with Stripe
• Hosting Details: GoDaddy account - login details in email"
            maxLength={2000}
          />
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Press Ctrl+Enter (Cmd+Enter on Mac) to save quickly
            </p>
            <p className="text-xs text-gray-500">
              {notes.length}/2000 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}