#!/usr/bin/env node

/**
 * aMule Modern API Server
 * 
 * Bridge layer entre el backend wxWidgets y el frontend moderno React/Vue
 * Proporciona una REST API moderna + WebSocket para notificaciones en tiempo real
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importaciones de socket.io para WebSockets modernos
// const http = require('http');
// import { Server } from 'socket.io';

__dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3128; // Default HTTP web server port for API + static files
const WS_PORT = process.env.WS_PORT || 3129; // WebSockets port (can share same as above with socket.io)

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, '../../dist')));
app.use(express.static('public')); // Public assets for frontend SPA

// Configuración básica
const config = {
  apiPort: PORT,
  wsPort: WS_PORT,
  backendPath: process.env.BACKEND_PATH || '/var/run/amule/amuled.sock',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
};

console.log('aMule Modern API Server v0.1.0');
console.log(`  Port: ${PORT}`);
console.log(`  Backend path: ${config.backendPath}`);
console.log(`  CORS origins: ${config.corsOrigins.join(', ')}`);

/**
 * @typedef {object} StatusResponse - Estructura de respuesta del status endpoint
 * @property {object} system - Estado del sistema
 * @property {number} system.totalMemory - Memoria total en MB
 * @property {number} system.freeMemory - Memoria libre en MB
 * @property {number} system.usedMemory - Memoria usada en MB
 * @property {string} system.cpuLoad - Carga de CPU (string)
 * @property {object} network - Estado de la red
 * @property {number} network.downloadSpeed - Velocidad descarga en KB/s
 * @property {number} network.uploadSpeed - Velocidad subida en KB/s
 * @property {object} p2p - Estadísticas P2P
 * @property {number} p2p.connections - Number of active connections
 * @property {number} p2p.peers - Number of active peers
 */

/**
 * @typedef {object} TransferItem - Estructura de un item de transferencia
 * @property {string} hash - Hash del archivo (identificador único)
 * @property {boolean} isDownloading - Si está en downloads
 * @property {boolean} isUploading - Si está en uploads
 * @property {number} size - Tamaño total en bytes
 * @property {number} downloaded - Bajados en bytes
 * @property {number} uploaded - Subidos en bytes
 * @property {number} speed - Velocidad actual en bytes/s
 * @property {string} filename - Nombre del archivo (sin path)
 * @property {string} status - Estado (queued, downloading, paused, complete, error)
 * @property {number} eta - Tiempo estimado restante en segundos (0=unknown)
 * @property {number} priority - Prioridad (1-5)
 */

/**
 * @typedef {object} TransferListResponse 
 * @property {TransferItem[]} transfers - Lista de transferencias
 * @property {object} summary - Resumen del sistema
 */

/**
 * @typedef {object} SearchResult 
 * @property {string} hash - Hash del archivo encontrado
 * @property {boolean} isComplete - Si está disponible completo (100%)
 * @property {number} size - Tamaño en bytes
 * @property {number} shareCount - Cuántos peers lo tienen completo o parcial
 * @property {number} uploadLimit - Límite de subida del peer
 * @property {string[]} pieces - Lista de trozos disponibles (base64)
 */

// ============================================
// ENDPOINTS DEL API
// ============================================

// Rutas estáticas para frontend SPA
app.get('/', (req, res) => {
  // En producción, serviría el build del frontend React/Vue
  // Por ahora devolvemos un message básico
  res.json({ 
    status: 'ready', 
    message: 'aMule Modern API is running. Frontend SPA should be served at /', 
    version: 'v0.1.0'
  });
});

// RUTA: GET /api/status - Estado del sistema
app.get('/api/status', async (req, res) => {
  try {
    // TODO: Llamada al backend wxWidgets para obtener el estado real
    // Para ahora devolvemos una estructura placeholder
    const statusData = {
      system: {
        totalMemory: Math.floor(Math.random() * 16000) + 8000, // Placeholder ~8-24GB
        freeMemory: Math.floor(Math.random() * 4000) + 1000,    // ~1-4GB free
        usedMemory: Math.floor(Math.random() * 10000) + 5000,
        cpuLoad: 'unknown',   // Placeholder
      },
      network: {
        downloadSpeed: Math.floor(Math.random() * 20) + 1,       // KB/s ~1-21
        uploadSpeed: Math.floor(Math.random() * 20) + 1,         // KB/s
        totalDownloads: 0,   // Placeholder
        totalUploads: 0,
      },
      p2p: {
        connections: Math.floor(Math.random() * 50),              // Placeholder ~1-50
        peers: Math.floor(Math.random() * 200),                   // Placeholder ~1-200
        sharedFiles: 0,     // Placeholder
      },
    };
    
    res.json(statusData);
  } catch (error) {
    console.error('[API] Error fetching status:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch system status',
      details: error.message 
    });
  }
});

// RUTA: GET /api/transfers?op=list - Lista de transferencias
app.get('/api/transfers', async (req, res) => {
  try {
    const { op = 'list' } = req.query; // Support query params
    
    if (!['list', 'details'].includes(op)) {
      return res.status(400).json({ error: 'Invalid operation. Use list or details.' });
    }
    
    const transfers = [];
    for (let i = 0; i < 5; i++) {
      transfers.push({
        hash: `abcdef1234${i}5678`,  // Placeholder hashes
        isDownloading: true,
        filename: 'file_' + i + '.txt',
        size: Math.floor(Math.random() * 500) * 1024 * 1024,  // ~0.1-500MB
        downloaded: Math.floor(Math.random() * transfers[i].size),
        speed: Math.floor(Math.random() * 500),                 // bytes/s
        status: ['queued', 'downloading', 'paused'][Math.floor(Math.random() * 3)],
        priority: Math.floor(Math.random() * 5) + 1,
        eta: Math.floor(Math.random() * 3600),                  // seconds ~0-1hr
        piecesDownloaded: 0,                                     // Placeholder
      });
    }
    
    res.json({ 
      op,
      transfers,
      summary: {
        totalDownloads: transfers.filter(t => t.isDownloading).length,
        totalUploads: 0,
        queued: 0,
        paused: 0,
        complete: 0,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers', details: error.message });
  }
});

// RUTA: POST /api/transfers - Control de transferencia individual
app.post('/api/transfers/:hash/action', async (req, res) => {
  try {
    const { hash } = req.params;
    const { action } = req.body; // actions: start, stop, resume, delete
    
    const validActions = ['start', 'stop', 'resume', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Use: ${validActions.join(', ')}` });
    }
    
    // TODO: Lógica para llamar al backend wxWidgets y ejecutar la acción
    
    // Placeholder response
    res.json({ 
      success: true, 
      hash, 
      action,
      message: `Action '${action}' queued for transfer ${hash}`
    });
  } catch (error) {
    console.error('[API] Error processing transfer action:', error.message);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// RUTA: POST /api/search - Search en la red
app.post('/api/search', async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Search requires a non-empty "query" parameter',
        example: { query: 'example.txt', sizeMax: 10485760 } 
      });
    }
    
    // Placeholder search results
    const results = Array(3).fill(null).map((_, i) => ({
      hash: `search_result_${Date.now()}_${i}`,
      isComplete: Math.random() > 0.5,
      size: Math.floor(Math.random() * 20) * 1048576,
      shareCount: Math.floor(Math.random() * 10) + 1,
      uploadLimit: Math.floor(Math.random() * 100), // KB/s from peer
      pieces: Array(5).fill(null).map(() => `piece_${Math.random().toString(36).substring(7)}`),
    }));
    
    res.json({
      query,
      totalResults: results.length,
      maxResultsShown: 100,
      results,
    });
    
  } catch (error) {
    console.error('[API] Search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// RUTA: GET /api/friends - Lista de amigos
app.get('/api/friends', async (req, res) => {
  try {
    const friends = Array(3).fill(null).map((_, i) => ({
      id: Math.random().toString(36).substring(2, 8),
      username: `user_${i + 1}`,
      clientName: 'aMule/3.0.0',
      uploadLimit: Math.floor(Math.random() * 500), // KB/s
      ip: `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      status: Math.random() > 0.3 ? 'online' : 'offline',
      joinedAt: new Date(Date.now() - i * 86400000).toISOString(), // random past dates
    }));
    
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friends', details: error.message });
  }
});

// RUTA: POST /api/friends - Añadir amigo
app.post('/api/friends', async (req, res) => {
  try {
    const { username, ip, uploadLimit = 100 } = req.body;
    
    if (!username || !ip) {
      return res.status(400).json({ 
        error: 'Missing required fields. Use: username, ip, uploadLimit (optional)'
      });
    }
    
    // TODO: Validar IP, guardar en lista de amigos del backend
    
    const newFriend = {
      id: Math.random().toString(36).substring(2, 8),
      username,
      clientName: 'aMule/3.0.0',
      uploadLimit,
      ip,
      status: 'pending', // pending, online, offline
      joinedAt: new Date().toISOString(),
    };
    
    res.status(201).json(newFriend);
  } catch (error) {
    console.error('[API] Add friend error:', error.message);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// RUTA: DELETE /api/friends/:id - Eliminar amigo
app.delete('/api/friends/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Llamar al backend para eliminar conexión
    
    res.json({ 
      success: true, 
      message: `Friend ${id} removed from list` 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove friend', details: error.message });
  }
});

// RUTA: DELETE /api/transfers/:hash - Eliminar transferencia
app.delete('/api/transfers/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    // TODO: Llamar al backend para cancelar la transferencia
    
    res.json({ 
      success: true, 
      message: `Transfer ${hash} removed from list` 
    });
  } catch (error) {
    console.error('[API] Remove transfer error:', error.message);
    res.status(500).json({ error: 'Failed to remove transfer' });
  }
});

// RUTA: GET /api/priority - Actualizar prioridades de transferencia
app.get('/api/priority/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const priorities = req.query || { 
      min: 1, 
      max: 5,
      uploadPriority: Math.floor(Math.random() * 5),
    };
    
    // TODO: Llamar al backend para actualizar prioridades
    
    res.json({ 
      hash, 
      priority: priorities.uploadPriority, 
      message: 'Priority updated',
    });
  } catch (error) {
    console.error('[API] Priority error:', error.message);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

// ============================================
// SOCKET.IO WS - Real-time notifications
// ============================================
/*
import http from 'http';
const server = app.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
});

const io = require('socket.io')(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST']
  }
});

// Emitir notificaciones en tiempo real a los clients conectados
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Ejemplo de broadcast cuando hay una transferencia nueva/completa
  socket.on('join-group', (groupName) => {
    socket.join(groupName);
  });
  
  // Ejemplo de notificar al cliente sobre eventos en tiempo real
  setInterval(() => {
    io.emit('status-update', { timestamp: Date.now(), statusData: null }); // Placeholder
  }, 5000); // Cada 5 segundos para actualizaciones frecuentes
});

// Handle disconnects
socket.on('disconnect', () => {
  console.log(`Client disconnected: ${socket.id}`);
});
*/

// ============================================
// HEALTH CHECK (para k8s, load balancers, etc.)
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: 'v0.1.0',
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`✅ aMule Modern API Server v0.1.0 is running!`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🚀 Health check: http://localhost:${PORT}/health`);
  console.log(`========================================\n`);
});

server.on('error', (err) => {
  console.error('[API Server] Error:', err.message);
  server.close();
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down API server gracefully...');
  // TODO: Clean up threads, close DB connections, etc.
  server.close(() => {
    console.log('API Server shut down complete');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default app;