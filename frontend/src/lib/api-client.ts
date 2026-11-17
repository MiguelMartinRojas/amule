// API Client Context for aMule Modern UI - React frontend integration layer

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SystemStatus {
  system: {
    totalMemory: number;
    freeMemory: number;
    usedMemory: number;
    cpuLoad?: string;
  };
  network: {
    downloadSpeed: number;
    uploadSpeed: number;
  };
  p2p: {
    connections: number;
    peers: number;
  };
}

export interface TransferItem {
  id: string;
  name: string;
  status: 'queued' | 'downloading' | 'paused' | 'complete';
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  peerIp: string;
}

export interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline' | 'away' | 'dnd';
  lastSeen: Date;
}

interface ApiClientContextType {
  status: SystemStatus | null;
  error: string | null;
  setStatus: (status: SystemStatus) => void;
  transfers: TransferItem[];
  addTransfer: (transfer: TransferItem) => void;
  removeTransfer: (id: string) => void;
}

export const ApiClientContext = createContext<ApiClientContextType | undefined>(undefined);

interface ApiClientProviderProps {
  children: React.ReactNode;
}

export function ApiClientProvider(props: ApiClientProviderProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`Status request failed (${response.status})`);
        }

        const data = await response.json();
        if (active) {
          setStatus(data);
          setError(null);
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : 'Unknown API error';
          console.error('Failed to fetch status:', error);
          setError(message);
        }
      }
    };

    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const addTransfer = (transfer: TransferItem) => {
    setTransfers((prev) => [...prev, transfer]);
  };

  const removeTransfer = (id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  return React.createElement(
    ApiClientContext.Provider,
    { value: { status, error, setStatus, transfers, addTransfer, removeTransfer } },
    props.children
  );
}

export function useApiClient(): SystemStatus | null {
  const context = useContext(ApiClientContext);
  if (!context) {
    throw new Error('useApiClient must be used within ApiClientProvider');
  }
  return context.status;
}

export function useApiError(): string | null {
  const context = useContext(ApiClientContext);
  if (!context) {
    throw new Error('useApiError must be used within ApiClientProvider');
  }
  return context.error;
}

// Modern React components using createElement for compatibility
export function LoadingSpinner(props: { size?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const sizeClass = props.size ? (sizes as any)[props.size] : 'w-8 h-8';

  return React.createElement(
    'div',
    { className: `flex items-center justify-center ${sizeClass}` },
    React.createElement('div', {
      className: 'border-4 border-blue-200 rounded-full animate-spin'
    })
  );
}

export function StatusBadge(props: { status: TransferItem['status'] }) {
  const colorMap: Record<TransferItem['status'], string> = {
    queued: 'bg-yellow-100 text-yellow-800',
    downloading: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-800',
    complete: 'bg-blue-100 text-blue-800',
  };
  const colorClass = colorMap[props.status] || 'bg-gray-200';

  return React.createElement(
    'span',
    { className: `px-2 py-1 rounded-full text-xs ${colorClass}` },
    props.status
  );
}
