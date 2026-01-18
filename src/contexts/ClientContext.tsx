'use client';

import React, { createContext, useContext } from 'react';
import { useClients as useClientsHook, type Client, type ClientTask, type ClientInput, type TaskInput } from '@/hooks/useClients';

// Re-export types for convenience
export type { Client, ClientTask, ClientInput, TaskInput };

type ClientContextType = ReturnType<typeof useClientsHook>;

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const clientsData = useClientsHook();

  return (
    <ClientContext.Provider value={clientsData}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
}

// Re-export types
export type { Client, ClientTask, ClientInput, TaskInput } from '@/hooks/useClients';
export type { ClientLoginDetail, LoginDetailInput } from '@/hooks/useClients';