import { useState, useEffect, useCallback } from 'react';

export interface HostingService {
  _id: string;
  clientName: string;
  websiteName: string;
  websiteUrl: string;
  hostingProvider: string;
  packageType: string;
  cost: number;
  currency: string;
  billingCycle: string;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'expiring_soon';
  contactEmail: string;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostingServiceInput {
  clientName: string;
  websiteName: string;
  websiteUrl: string;
  hostingProvider: string;
  packageType: string;
  cost: number;
  currency?: string;
  billingCycle: string;
  startDate: Date;
  endDate: Date;
  autoRenew?: boolean;
  contactEmail: string;
  notes?: string;
}

export function useHosting() {
  const [hostingServices, setHostingServices] = useState<HostingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHostingServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hosting', {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch hosting services');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const formattedServices = data.data.map((service: any) => ({
          ...service,
          startDate: new Date(service.startDate),
          endDate: new Date(service.endDate),
          createdAt: new Date(service.createdAt),
          updatedAt: new Date(service.updatedAt),
        }));
        
        setHostingServices(formattedServices);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching hosting services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch hosting services');
    } finally {
      setLoading(false);
    }
  }, []);

  const createHostingService = useCallback(async (serviceData: HostingServiceInput): Promise<HostingService | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/hosting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create hosting service');
      }
      
      if (data.success && data.data) {
        const newService: HostingService = {
          ...data.data,
          startDate: new Date(data.data.startDate),
          endDate: new Date(data.data.endDate),
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        setHostingServices(prev => [...prev, newService].sort((a, b) => 
          a.endDate.getTime() - b.endDate.getTime()
        ));
        return newService;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error creating hosting service:', err);
      setError(err instanceof Error ? err.message : 'Failed to create hosting service');
      return null;
    }
  }, []);

  const updateHostingService = useCallback(async (id: string, updates: Partial<HostingServiceInput>): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/hosting/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update hosting service');
      }
      
      if (data.success && data.data) {
        const updatedService: HostingService = {
          ...data.data,
          startDate: new Date(data.data.startDate),
          endDate: new Date(data.data.endDate),
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        };
        
        setHostingServices(prev => 
          prev.map(service => 
            service._id === id ? updatedService : service
          ).sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
        );
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error updating hosting service:', err);
      setError(err instanceof Error ? err.message : 'Failed to update hosting service');
      return false;
    }
  }, []);

  const deleteHostingService = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/hosting/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete hosting service');
      }
      
      if (data.success) {
        setHostingServices(prev => prev.filter(service => service._id !== id));
        return true;
      }
      
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('Error deleting hosting service:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete hosting service');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchHostingServices();
  }, [fetchHostingServices]);

  return {
    hostingServices,
    loading,
    error,
    createHostingService,
    updateHostingService,
    deleteHostingService,
    refreshHostingServices: fetchHostingServices,
  };
}
