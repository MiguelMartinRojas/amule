import express from 'express';
import cors from 'cors';

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
