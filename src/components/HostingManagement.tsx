'use client';

import { useState } from 'react';
import { useHosting, HostingService } from '@/hooks/useHosting';
import { useAuth } from '@/contexts/AuthContext';
import { sendExpiryNotification, sendBulkExpiryNotifications } from '@/utils/emailService';

export default function HostingManagement() {
  const { user } = useAuth();
  const { hostingServices, loading, createHostingService, updateHostingService, deleteHostingService } = useHosting();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<HostingService | null>(null);
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('1');
  const [endDate, setEndDate] = useState('');
  const [yearlyPrice, setYearlyPrice] = useState('0');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isClientWebsite, setIsClientWebsite] = useState(false);
  const [isFreeHosting, setIsFreeHosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate end date when start date or duration changes
  const calculateEndDate = (start: string, years: string) => {
    if (!start || !years) return '';
    const startDateObj = new Date(start);
    const durationYears = parseInt(years) || 1;
    const endDateObj = new Date(startDateObj);
    endDateObj.setFullYear(endDateObj.getFullYear() + durationYears);
    return endDateObj.toISOString().split('T')[0];
  };

  // Update end date when start date or duration changes
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    const calculated = calculateEndDate(date, duration);
    setEndDate(calculated);
  };

  const handleDurationChange = (years: string) => {
    setDuration(years);
    const calculated = calculateEndDate(startDate, years);
    setEndDate(calculated);
  };

  const handleSendEmail = async (service: HostingService) => {
    setSendingEmail(service._id);
    setEmailStatus(null);

    const days = getDaysUntilExpiry(service.endDate);
    const isExpired = days < 0;

    const result = await sendExpiryNotification({
      to_email: service.contactEmail,
      website_name: service.websiteName,
      expiry_date: formatDate(service.endDate),
      days_remaining: Math.abs(days),
      yearly_price: service.cost,
      status: (isExpired ? 'expired' : 'expiring') as 'expired' | 'expiring',
    });

    setSendingEmail(null);

    if (result) {
      setEmailStatus({ type: 'success', message: `Email sent successfully to ${service.contactEmail}` });
    } else {
      setEmailStatus({ type: 'error', message: 'Failed to send email. Please try again.' });
    }

    // Clear status after 5 seconds
    setTimeout(() => setEmailStatus(null), 5000);
  };

  const handleSendBulkEmails = async (type: 'expiring' | 'expired') => {
    setSendingEmail('bulk');
    setEmailStatus(null);

    const services = hostingServices.filter(s => 
      type === 'expiring' ? s.status === 'expiring_soon' : s.status === 'expired'
    );

    const emailParams = services.map(service => {
      const days = getDaysUntilExpiry(service.endDate);
      return {
        to_email: service.contactEmail,
        website_name: service.websiteName,
        expiry_date: formatDate(service.endDate),
        days_remaining: Math.abs(days),
        yearly_price: service.cost,
        status: type as 'expired' | 'expiring',
      };
    });

    const result = await sendBulkExpiryNotifications(emailParams);
    setSendingEmail(null);

    if (result.success > 0) {
      setEmailStatus({ 
        type: 'success', 
        message: `Successfully sent ${result.success} email(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}` 
      });
    } else {
      setEmailStatus({ type: 'error', message: 'Failed to send emails. Please try again.' });
    }

    // Clear status after 5 seconds
    setTimeout(() => setEmailStatus(null), 5000);
  };

  const resetForm = () => {
    setCompanyName('');
    setWebsiteUrl('');
    setStartDate('');
    setDuration('1');
    setEndDate('');
    setYearlyPrice('0');
    setNotificationEmail('');
    setIsClientWebsite(false);
    setIsFreeHosting(false);
    setFormError(null);
    setEditingService(null);
  };

  const handleAddHosting = async () => {
    // Validation
    if (!companyName.trim()) {
      setFormError('Company name is required');
      return;
    }
    if (!startDate) {
      setFormError('Start date is required');
      return;
    }
    if (!notificationEmail.trim()) {
      setFormError('Email is required');
      return;
    }

    const serviceData = {
      clientName: companyName.trim(),
      websiteName: companyName.trim(),
      websiteUrl: websiteUrl.trim() || `https://${companyName.trim().toLowerCase().replace(/\s+/g, '')}.com`,
      hostingProvider: 'Various',
      packageType: isClientWebsite ? 'Client Website' : 'Standard',
      cost: isFreeHosting ? 0 : parseFloat(yearlyPrice) || 0,
      currency: 'GBP',
      billingCycle: 'yearly' as const,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      autoRenew: false,
      contactEmail: notificationEmail.trim(),
      notes: isFreeHosting ? 'Free Hosting (No charges)' : '',
    };

    if (editingService) {
      const success = await updateHostingService(editingService._id, serviceData);
      if (success) {
        setShowAddForm(false);
        resetForm();
      }
    } else {
      const result = await createHostingService(serviceData);
      if (result) {
        setShowAddForm(false);
        resetForm();
      }
    }
  };

  const handleEditService = (service: HostingService) => {
    setEditingService(service);
    setCompanyName(service.clientName);
    setWebsiteUrl(service.websiteUrl || '');
    setStartDate(service.startDate.toISOString().split('T')[0]);
    setEndDate(service.endDate.toISOString().split('T')[0]);
    
    // Calculate duration
    const years = Math.round((service.endDate.getTime() - service.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    setDuration(years.toString());
    
    setYearlyPrice(service.cost.toString());
    setNotificationEmail(service.contactEmail);
    setIsClientWebsite(service.packageType === 'Client Website');
    setIsFreeHosting(service.cost === 0);
    setShowAddForm(true);
  };

  // Calculate statistics
  const totalServices = hostingServices.length;
  const totalCost = hostingServices.reduce((sum, service) => {
    const yearlyCost = service.billingCycle === 'yearly' ? service.cost : service.cost * 12;
    return sum + yearlyCost;
  }, 0);
  const yearlyRecurringCost = hostingServices
    .filter(s => s.billingCycle === 'yearly')
    .reduce((sum, s) => sum + s.cost, 0);
  const expiringSoon = hostingServices.filter(s => s.status === 'expiring_soon').length;
  const personalWebsites = hostingServices.filter(s => s.packageType !== 'Client Website').length;
  const clientWebsites = hostingServices.filter(s => s.packageType === 'Client Website').length;

  // Pagination
  const totalPages = Math.ceil(hostingServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = hostingServices.slice(startIndex, endIndex);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysUntilExpiry = (endDate: Date) => {
    const now = new Date();
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading hosting services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hosting Management</h1>
            <p className="text-gray-600 mt-1">Manage client hosting services and subscriptions</p>
          </div>
          {user?.permissions?.canEditClients && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Add Hosting Service
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Services</p>
            <p className="text-2xl font-bold text-gray-900">{totalServices}</p>
          </div>
          {user?.role === 'admin' && (
            <>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Cost (All Contracts)</p>
                <p className="text-2xl font-bold text-gray-900">£{totalCost.toFixed(0)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Yearly Recurring Cost</p>
                <p className="text-2xl font-bold text-gray-900">£{yearlyRecurringCost.toFixed(0)}</p>
              </div>
            </>
          )}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Personal Websites</p>
            <p className="text-2xl font-bold text-gray-900">{personalWebsites}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Client Websites</p>
            <p className="text-2xl font-bold text-gray-900">{clientWebsites}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
            <p className="text-2xl font-bold text-orange-600">{expiringSoon}</p>
          </div>
        </div>

        {/* Email Status Message */}
        {emailStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            emailStatus.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {emailStatus.type === 'success' ? (
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                emailStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {emailStatus.message}
              </p>
            </div>
          </div>
        )}

        {/* Expiring Soon Alert */}
        {expiringSoon > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 bg-orange-100 border-b border-orange-200">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h3 className="text-sm font-semibold text-orange-800">Subscriptions Expiring Soon</h3>
              </div>
            </div>
            <div className="divide-y divide-orange-200">
              {hostingServices
                .filter(s => s.status === 'expiring_soon')
                .map(service => {
                  const days = getDaysUntilExpiry(service.endDate);
                  return (
                    <div key={service._id} className="px-4 py-3 hover:bg-orange-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-orange-900">{service.websiteName}</span>
                          <span className="text-orange-700 text-sm ml-2">• Expires in {days} days</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-orange-600 font-medium">{formatDate(service.endDate)}</span>
                          <button
                            onClick={() => handleSendEmail(service)}
                            disabled={sendingEmail === service._id}
                            className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed"
                            title={`Send reminder to ${service.contactEmail}`}
                          >
                            {sendingEmail === service._id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Expired Alert */}
        {hostingServices.filter(s => s.status === 'expired').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 bg-red-100 border-b border-red-200">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <h3 className="text-sm font-semibold text-red-800">Expired Subscriptions</h3>
              </div>
            </div>
            <div className="divide-y divide-red-200">
              {hostingServices
                .filter(s => s.status === 'expired')
                .map(service => {
                  const days = Math.abs(getDaysUntilExpiry(service.endDate));
                  return (
                    <div key={service._id} className="px-4 py-3 hover:bg-red-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-red-900">{service.websiteName}</span>
                          <span className="text-red-700 text-sm ml-2">• Expired {days} days ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-red-600 font-medium">{formatDate(service.endDate)}</span>
                          <button
                            onClick={() => handleSendEmail(service)}
                            disabled={sendingEmail === service._id}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                            title={`Send expiry notification to ${service.contactEmail}`}
                          >
                            {sendingEmail === service._id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Hosting Services List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Hosted Websites ({totalServices})</h2>
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, totalServices)} of {totalServices}
            </div>
          </div>
        </div>

        {hostingServices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hosting services yet</h3>
            <p className="text-gray-500 mb-4">
              Start by adding your first hosting service to track subscriptions and renewals.
            </p>
            {user?.permissions?.canEditClients && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Add First Hosting Service
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {paginatedServices.map((service) => {
              const days = getDaysUntilExpiry(service.endDate);
              const isExpired = days < 0;
              const isExpiringSoon = days >= 0 && days <= 30;

              return (
                <div key={service._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">{service.websiteName}</h3>
                        {isExpired && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                            Expired
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-medium">
                            Expiring Soon
                          </span>
                        )}
                        {!isExpired && !isExpiringSoon && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                            Active
                          </span>
                        )}
                        
                        {/* Website URL and Email - In same row as title */}
                        <span className="text-gray-400">•</span>
                        {service.websiteUrl && (
                          <>
                            <div className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              <a 
                                href={service.websiteUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-700 underline"
                              >
                                {service.websiteUrl}
                              </a>
                            </div>
                            <span className="text-gray-400">•</span>
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">{service.contactEmail}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Client</p>
                          <p className="font-medium text-gray-900">{service.clientName}</p>
                        </div>
                        {user?.role === 'admin' && (
                          <div>
                            <p className="text-gray-600">Cost</p>
                            <p className="font-medium text-gray-900">
                              £{service.cost}/{service.billingCycle === 'yearly' ? 'year' : 'month'}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="font-medium text-gray-900">
                            {Math.round((service.endDate.getTime() - service.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))} year{Math.round((service.endDate.getTime() - service.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Expires</p>
                          <p className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                            {formatDate(service.endDate)}
                            {!isExpired && ` (${days} days)`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {user?.permissions?.canEditClients && (
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={() => handleSendEmail(service)}
                          disabled={sendingEmail === service._id}
                          className="px-3 py-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={`Send notification to ${service.contactEmail}`}
                        >
                          {sendingEmail === service._id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              Sending
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send Email
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleEditService(service)}
                          className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-sm"
                          title="Edit service"
                        >
                          Edit
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${service.websiteName}?`)) {
                                deleteHostingService(service._id);
                              }
                            }}
                            className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-sm"
                            title="Delete service (Admin only)"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 text-sm rounded transition-colors ${
                            currentPage === page
                              ? 'bg-gray-900 text-white'
                              : 'border border-gray-300 text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>

      {/* Add/Edit Hosting Service Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingService ? 'Edit Hosting Service' : 'Add New Hosting Service'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name:
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL:
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - Leave blank to auto-generate from company name
                </p>
              </div>

              {/* Start Date and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Years):
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* End Date and Yearly Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Auto-calculated):
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600"
                  />
                </div>
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yearly Price (£):
                    </label>
                    <input
                      type="number"
                      value={yearlyPrice}
                      onChange={(e) => setYearlyPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={isFreeHosting}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                )}
              </div>

              {/* Email for Notifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email for Notifications/Updates:
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We&apos;ll notify you 1 month before subscription expires
                </p>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="clientWebsite"
                    checked={isClientWebsite}
                    onChange={(e) => setIsClientWebsite(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="clientWebsite" className="ml-2 text-sm text-gray-700">
                    Client Website
                  </label>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="freeHosting"
                      checked={isFreeHosting}
                      onChange={(e) => {
                        setIsFreeHosting(e.target.checked);
                        if (e.target.checked) {
                          setYearlyPrice('0');
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="freeHosting" className="ml-2 text-sm text-gray-700">
                      Free Hosting (No charges)
                    </label>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">{formError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleAddHosting}
                className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded font-medium transition-colors"
              >
                {editingService ? 'Update Hosting Service' : 'Add Hosting Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
