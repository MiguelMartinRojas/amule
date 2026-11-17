import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addAmuleServer,
  connectAmuleServer,
  disconnectAmuleServer,
  getAmuleServers,
  getAmuleSearchResults,
  startAmuleSearch,
  startAmuleKad,
  stopAmuleSearch,
  stopAmuleKad,
} from './amule-ec-client.mjs';

const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '../.env');
const envConfig = dotenv.config({ path: envFile });
if (envConfig.error && envConfig.error.code !== 'ENOENT') {
  throw envConfig.error;
}

const app = express();
app.use(cors());
app.use(express.json());

// Config backend wxWidgets placeholder
const BACKEND_CONFIG = {
  socketPath: process.env.BACKEND_PATH || '/var/run/amule/amuled.sock',
  httpPort: process.env.BACKEND_HTTP_PORT || 9100,
};

console.log('🚀 aMule API Server starting on port', process.env.API_PORT || (BACKEND_CONFIG.httpPort + 3028));

// Placeholder status endpoint - TODO: conectar con backend wxWidgets real
const getStatus = async () => ({
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
  }
});

// Endpoints principales
app.get('/api/status', async (_req, res) => {
  try {
    const data = await getStatus();
    res.json(data);
  } catch (err) {
    console.error('[Status] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

app.get('/api/transfers', async (_req, res) => {
  res.json({ message: 'No active transfers connected yet. Placeholder endpoint.' });
});

const getEcErrorStatus = (error) =>
  error.message.startsWith('Set AMULE_EC_') ||
  error.message.startsWith('AMULE_EC_PORT')
    ? 503
    : 502;

app.get('/api/servers', async (_req, res) => {
  try {
    res.json(await getAmuleServers());
  } catch (error) {
    console.error('[Servers] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/api/servers', async (req, res) => {
  const { address, port, name = '' } = req.body || {};
  if (
    typeof address !== 'string' ||
    address.length > 253 ||
    !/^[a-zA-Z0-9.-]+$/.test(address) ||
    address.includes('..') ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    typeof name !== 'string' ||
    name.length > 256
  ) {
    res.status(400).json({ error: 'Enter a valid server address, port, and optional name.' });
    return;
  }

  try {
    await addAmuleServer({ address, port, name: name.trim() });
    res.json({ added: true });
  } catch (error) {
    console.error('[Add server] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/api/servers/connect', async (req, res) => {
  const body = req.body || {};
  let server;
  if (body.address !== undefined || body.port !== undefined) {
    if (
      typeof body.address !== 'string' ||
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(body.address) ||
      body.address.split('.').some((octet) => Number(octet) > 255) ||
      !Number.isInteger(body.port) ||
      body.port < 1 ||
      body.port > 65535
    ) {
      res.status(400).json({ error: 'Select a server with a valid IPv4 address and port.' });
      return;
    }
    server = { address: body.address, port: body.port };
  }

  try {
    await connectAmuleServer(server);
    res.json({ connecting: true });
  } catch (error) {
    console.error('[Connect server] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/api/servers/disconnect', async (_req, res) => {
  try {
    await disconnectAmuleServer();
    res.json({ disconnected: true });
  } catch (error) {
    console.error('[Disconnect server] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/api/networks/kad/start', async (_req, res) => {
  try {
    await startAmuleKad();
    res.json({ started: true });
  } catch (error) {
    console.error('[Start Kad] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/api/networks/kad/stop', async (_req, res) => {
  try {
    await stopAmuleKad();
    res.json({ stopped: true });
  } catch (error) {
    console.error('[Stop Kad] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/api/search', async (req, res) => {
  const body = req.body;
  const networks = ['local', 'global', 'kad'];
  const fileTypes = ['', 'Audio', 'Video', 'Image', 'Doc', 'Pro', 'Arc', 'Iso'];
  const isNonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
  if (
    !body ||
    typeof body.query !== 'string' ||
    !body.query.trim() ||
    body.query.length > 256 ||
    !networks.includes(body.network) ||
    (body.fileType !== undefined && !fileTypes.includes(body.fileType)) ||
    (body.extension !== undefined && (typeof body.extension !== 'string' || body.extension.length > 32)) ||
    (body.availability !== undefined &&
      (!isNonNegativeInteger(body.availability) || body.availability > 0xffffffff)) ||
    (body.minSize !== undefined && !isNonNegativeInteger(body.minSize)) ||
    (body.maxSize !== undefined && !isNonNegativeInteger(body.maxSize)) ||
    (body.minSize && body.maxSize && body.minSize > body.maxSize)
  ) {
    res.status(400).json({ error: 'Invalid search query or filters.' });
    return;
  }

  try {
    const result = await startAmuleSearch({
      query: body.query.trim(),
      network: body.network,
      fileType: body.fileType || '',
      extension: body.extension?.trim() || '',
      availability: body.availability || 0,
      minSize: body.minSize || 0,
      maxSize: body.maxSize || 0,
    });
    res.json(result);
  } catch (error) {
    console.error('[Search] External Connections error:', error.message);
    res.status(getEcErrorStatus(error)).json({ error: error.message });
  }
});

app.get('/api/search/results', async (_req, res) => {
  try {
    res.json(await getAmuleSearchResults());
  } catch (error) {
    console.error('[Search results] External Connections error:', error.message);
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/search/stop', async (_req, res) => {
  try {
    await stopAmuleSearch();
    res.json({ stopped: true });
  } catch (error) {
    console.error('[Stop search] External Connections error:', error.message);
    res.status(502).json({ error: error.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '0.1.0-modern',
    timestamp: new Date().toISOString(),
    apiPort: process.env.API_PORT || (BACKEND_CONFIG.httpPort + 3028)
  });
});

const PORT = parseInt(process.env.API_PORT || '', 10) || (BACKEND_CONFIG.httpPort + 3028);

const server = app.listen(PORT, () => {
  console.log(`\n✅ API Server running at http://localhost:${PORT}\n`);
  console.log('📍 Health check: http://localhost:' + PORT + '/health');
});

server.on('error', (err) => {
  console.error('[Error]', err.message);
  server.close();
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

export default app;
