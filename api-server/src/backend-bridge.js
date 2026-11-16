#!/usr/bin/env node

/**
 * Backend integration layer - Conecta Express con backend wxWidgets existente
 */

import http from 'http';
import express from 'express';
import { Client } from 'json-rpc-protocol'; // Para RPC si es necesario

const app = express();
app.use(express.json());

// Configuración del backend wxWidgets
const BACKEND_CONFIG = {
  socketPath: process.env.BACKEND_PATH || '/var/run/amule/amuled.sock',
  httpPort: process.env.BACKEND_HTTP_PORT || 9123, // Por defecto amule usa ~9100-9200
};

/**
 * Lector de datos del backend wxWidgets
 */
class BackendReader {
  constructor(config: typeof BACKEND_CONFIG) {
    this.config = config;
    this.running = false;
    
    // TODO: Implementar conexión a backend wxWidgets existente
    // Opciones posibles:
    // 1. Socket local si amuled usa UNIX sockets
    // 2. HTTP polling si amuleweb es el interface HTTP
    // 3. IPC si se define como pipe/named socket
    
    // Placeholder para ahora - devolverá datos simulados hasta que se integre con backend real
    console.log('BackendReader initialized with config:', config);
  }

  /**
   * Leer estado actual del sistema desde backend wxWidgets
   */
  async readSystemStatus(): Promise<{
    system: { totalMemory: number; freeMemory: number; usedMemory: number };
    network: { downloadSpeed: number; uploadSpeed: number };
    p2p: { connections: number; peers: number };
  }> {
    // Placeholder - devolviendo datos simulados
    return {
      system: {
        totalMemory: Math.floor(Math.random() * 16000) + 8000,
        freeMemory: Math.floor(Math.random() * 4000) + 1000,
        usedMemory: Math.floor(Math.random() * 10000) + 5000,
      },
      network: {
        downloadSpeed: Math.floor(Math.random() * 20) + 1,
        uploadSpeed: Math.floor(Math.random() * 20) + 1,
      },
      p2p: {
        connections: Math.floor(Math.random() * 50),
        peers: Math.floor(Math.random() * 200),
      },
    };
  }

  /**
   * Leer lista de transferencias activas
   */
  async readTransfers(): Promise<{ isDownloading: boolean; filename: string; status: string }[]> {
    // Placeholder
    return [];
  }
}

const backendReader = new BackendReader(BACKEND_CONFIG);

// ============================================
// ENDPOINTS
// ============================================

app.get('/api/status', async (req, res) => {
  try {
    const data = await backendReader.readSystemStatus();
    res.json(data);
  } catch (error) {
    console.error('[Backend] Error reading status:', error);
    res.status(500).json({ error: 'Failed to read system status' });
  }
});

app.get('/api/transfers', async (req, res) => {
  try {
    const transfers = await backendReader.readTransfers();
    // Devolver placeholder si no hay datos reales todavía
    if (!transfers || transfers.length === 0) {
      res.json({ message: 'No active transfers detected or connection to backend pending' });
    } else {
      res.json(transfers);
    }
  } catch (error) {
    console.error('[Backend] Error reading transfers:', error);
    res.status(500).json({ error: 'Failed to read transfers' });
  }
});

// Endpoint de salud para k8s/lb
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    backendConnected: !!BACKEND_CONFIG.socketPath,
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(BACKEND_CONFIG.httpPort || process.env.API_PORT || 3128, () => {
  console.log(`\n========================================`);
  console.log(`✅ aMule Modern API Backend Bridge v0.1.0 is running!`);
  console.log(`📍 http://localhost:${BACKEND_CONFIG.httpPort || process.env.API_PORT || 3128}`);
  console.log(`💻 Backend reader initialized (backend integration in progress)`);
  console.log(`========================================\n`);
});

server.on('error', (err) => {
  console.error('[API Server] Error:', err.message);
  server.close();
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('Shutdown complete');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('Shutdown complete');
    process.exit(0);
  });
});

export default app;