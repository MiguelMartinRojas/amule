// Type definitions for aMule Modern UI API client

import { SystemStatus, TransferItem, ApiClientContext } from './api-client';

export interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline' | 'away' | 'dnd';
  lastSeen: Date;
}

export type { SystemStatus, TransferItem };
export { ApiClientContext };
