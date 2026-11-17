import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint de prueba "Hola Mundo" para verificar que la API funciona
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    h1 { color: #2c3e50; }
    .status { display: inline-block; padding: 10px 20px; border-radius: 5px; margin: 10px; font-size: 1.2em; }
    .online { background: #4ade80; color: #065f46; }
    .offline { background: #ef4444; color: #7f1d1d; }
  </style>
</head>
<body>
  <h1>🚀 aMule API Server - Endpoint de Prueba</h1>
  <div class="status online">✅ Hola Mundo - API funcionando correctamente!</div>
  <p style="margin-top: 20px; color: #666;">La API server está escuchando en este puerto.</p>
  <div style="margin-top: 30px; background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: left;">
    <strong>Endpoints disponibles:</strong>
    <ul>
      <li><code>/</code> - Esta página de prueba (Hola Mundo)</li>
      <li><code>/health</code> - Health check del servidor</li>
      <li><code>/api/hola-mundo</code> - Endpoint dedicado de "hola mundo"</li>
      <li><code>/api/status</code> - Estado del sistema (placeholder)</li>
      <li><code>/api/transfers</code> - Lista de transfers activos</li>
    </ul>
  </div>
  <p style="margin-top: 30px; font-size: 0.9em; color: #888;">
    Este servidor es un placeholder hasta que se integre con el backend wxWidgets real de aMule.<br/>
    Para ver la UI completa, abre http://localhost:5173 (frontend dev) o http://localhost:3000 (build production).
  </p>
</body>
</html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '0.1.0-modern',
    timestamp: new Date().toISOString()
  });
});

// Endpoint específico de "hola mundo" para fácil testing
app.get('/api/hola-mundo', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head><title>Hola Mundo</title></head>
<body style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Arial, sans-serif; color: white;">
  <div style="text-align: center; padding: 40px; border-radius: 20px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 3px solid rgba(255,255,255,0.2);">
    <h1 style="font-size: 3em; margin: 0;">👋</h1>
    <h2 style="font-size: 2.5em; margin: 20px 0;">¡Hola Mundo!</h2>
    <p style="font-size: 1.2em; opacity: 0.9;">✅ La API está funcionando correctamente</p>
  </div>
</body>
</html>
  `);
});

// Placeholder para status del sistema (placeholder hasta integrar backend)
app.get('/api/status', (req, res) => {
  res.json({
    system: {
      totalMemory: Math.floor(Math.random() * 16000) + 8000,
      freeMemory: Math.floor(Math.random() * 4000) + 1000,
      usedMemory: Math.floor(Math.random() * 10000) + 5000
    },
    network: {
      downloadSpeed: Math.floor(Math.random() * 20) + 1,
      uploadSpeed: Math.floor(Math.random() * 20) + 1
    },
    p2p: {
      connections: Math.floor(Math.random() * 50),
      peers: Math.floor(Math.random() * 200)
    }
  });
});

// Placeholder para transfers
app.get('/api/transfers', (req, res) => {
  res.json({ message: 'No active transfers connected yet. Placeholder endpoint.' });
});

const PORT = process.env.API_PORT || 3128;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`   Root:    http://localhost:${PORT}/`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Hola Mundo: http://localhost:${PORT}/api/hola-mundo`);
  console.log(`   Status:   http://localhost:${PORT}/api/status`);
  console.log('');
});

server.on('error', (err) => {
  console.error('[Error]', err.message);
  process.exit(1);
});

export default app;
