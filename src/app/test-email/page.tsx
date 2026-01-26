'use client';

import { useState } from 'react';
import { sendExpiryNotification } from '@/utils/emailService';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTest = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setSending(true);
    setResult(null);

    const success = await sendExpiryNotification({
      to_email: email,
      website_name: 'Test Website',
      expiry_date: '31/12/2024',
      days_remaining: 15,
      yearly_price: 99.99,
      status: 'expiring',
    });

    setSending(false);
    setResult(success ? 'Email sent successfully! Check your inbox.' : 'Failed to send email. Check console for errors.');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">EmailJS Test Page</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={sending}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Test Email'}
          </button>

          {result && (
            <div className={`p-4 rounded-lg ${
              result.includes('successfully') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {result}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Configuration:</h3>
            <div className="text-sm space-y-1 font-mono">
              <div>Service ID: {process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '❌ Missing'}</div>
              <div>Template ID: {process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '❌ Missing'}</div>
              <div>Public Key: {process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ? '✅ Set' : '❌ Missing'}</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
            <p className="font-semibold mb-2">📝 Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter your email address above</li>
              <li>Click &quot;Send Test Email&quot;</li>
              <li>Open browser console (F12) to see detailed logs</li>
              <li>Check your email inbox (and spam folder)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
