import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Starting aMule Modern API Server...');
console.log(`   Working directory: ${import.meta.url}`);

const apiPort = parseInt(process.env.API_PORT) || 3128;

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Placeholder API endpoints
app.get('/api/status', (_req, res) => {
  const status = {
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
  };
  res.json(status);
});

app.get('/api/transfers', (_req, res) => {
  res.json({ transfers: [], message: 'Placeholder - conectando con backend real...' });
});

const server = app.listen(apiPort, () => {
  console.log(`\n✅ Server running at http://localhost:${apiPort}`);
  console.log('📍 API:   http://localhost:' + apiPort + '/api/status');
  console.log('🏥 Health: http://localhost:' + apiPort + '/health');
});

process.on('SIGINT', () => { server.close(); process.exit(0); });

export default app;
