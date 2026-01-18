'use client';

import React, { createContext, useContext } from 'react';
import { useClients as useClientsHook } from '@/hooks/useClients';

// Re-export types from useClients for convenience
export type { Client, ClientTask, ClientInput, TaskInput } from '@/hooks/useClients';

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