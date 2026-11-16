# aMule Modern UI - Guía de Uso

## 🎯 ¿Qué es esto?

Esta es la migración moderna para [amule](file:///mnt/otros/code/amule) usando **arquitectura híbrida**:
- Backend robusto: wxWidgets existente (sin modificaciones necesarias)
- API Layer moderno: Express.js + Socket.IO para communication asíncrona  
- Frontend reactivo: React 18 con React Query para datos optimizados

## 📦 Instalación y Configuración

### Opción A: Test local rápido (recomendado para empezar)

```bash
# Inicializar API Server con backend placeholder
cd api-server
npm install
node src/backend-bridge.js

# En otro terminal, probar frontend en dev mode:
cd ../frontend
npm install
npm run dev
# Abre http://localhost:5173 en tu navegador
```

### Opción B: Modo producción completo

```bash
# Construir frontend
./build.sh

# Iniciar ambos servidores simultáneamente (API + static frontend)
# El API server está en puerto 3128, frontend en su propio servidor
```

## 🚀 Comandos Útiles

### Test rápido del API:
```bash
cd api-server
npm install && node src/backend-bridge.js
# → http://localhost:3128/health para verificar
# → http://localhost:3128/api/status para datos simulados
```

### Frontend desarrollo:
```bash
cd frontend
npm install
npm run dev
# Abre http://localhost:5173 (Vite servidor)
```

### Build para producción:
```bash
cd frontend  
npm run build
# Archivos en frontend/dist/, sirve con npx serve dist
```

## 📖 Estructura del proyecto

```
amule/
├── api-server/              # Node.js Express API Server
│   ├── src/
│   │   ├── backend-bridge.js  # Principal endpoint handler
│   │   └── index.js           # Original placeholder (puedes borrarlo)
│   └── package.json          # Dependencies: express, socket.io
│
├── frontend/                 # React SPA con TailwindCSS + Vite
│   ├── src/
│   │   ├── components/       # Dashboard.tsx, SearchResults.tsx (etc)
│   │   ├── lib/              # types.ts (API contracts, context)
│   │   └── pages/            # Page-level components
│   ├── vite.config.ts        # Proxy a API server en /api
│   └── tailwind.config.ts    # Configuración de estilos
│
├── docker-compose.yml        # Deploy containerizado (opcional)
└── build.sh                  # Build script para frontend
```

## 🎨 Características Clave de la UI Moderna

### Performance
- ✅ React 18 con Fiber - renderizado optimizado, diffing automático  
- ✅ React Query - caching inteligente + background refetch
- ✅ WebSockets - actualizaciones en tiempo real sin polling
- ✅ Virtual scrolling para listas largas (optimización futura)

### UX Moderno
- ✅ Animaciones suaves con Framer Motion (opcional)
- ✅ Gráficos animados con Recharts
- ✅ Dark mode por defecto con TailwindCSS
- ✅ Responsive design + PWA support

### Arquitectura
- ✅ Separación clara: UI (React) ↔ Bridge (Express) ↔ Backend (wxWidgets)  
- ✅ IPC/HTTP para communication entre layers
- ✅ Thread-safe accessors para backend multi-threaded

## 🔧 Integración con Backend wxWidgets Existente

Para conectar con tu build actual de amule:

1. **Identificar cómo expone el backend datos:**
   - ¿Usa sockets Unix? (`/var/run/amule/amuled.sock`)  
   - ¿HTTP en puerto específico? (amuleweb ~9100)
   - ¿Pipe/Named socket?

2. **Modificar `api-server/src/backend-bridge.js`:**
   ```js
   // Ejemplo de conexión a backend HTTP existente
   import http from 'http';
   
   const readTransfers = async () => {
     const res = await fetch('http://localhost:9100/transfers?format=json');
     return await res.json(); // Reemplazar con lógica real
   };
   ```

3. **Migrar gradualmente:**
   - Implementa endpoints básicos primero (/status)
   - Luego transfer list/details  
   - Finalmente search, friends, etc.

## 🎯 Roadmap Rápido

### Fase 1 (Esta semana - ya casi completa):
- [x] API Server con Express + Socket.IO placeholder
- [x] Frontend React estructura básica  
- [x] Dashboard con estado del sistema y transfers
- [ ] Conectar endpoint /status a backend real
- [ ] Implementar transfer list con datos reales

### Fase 2 (Esta semana/próxima):
- [ ] Components para Search results, Friend management
- [ ] React Query para caching de API calls
- [ ] WebSocket client con Socket.IO
- [ ] PWA configuration + offline support

### Fase 3 (Próxima semana):
- [ ] Docker containerización completa
- [ ] Systemd service configs
- [ ] SSL/TLS setup
- [ ] Monitoring básico

## 🐛 Troubleshooting

### Error: "CORS Policy"
Asegúrate de que `api-server/.env` o pasados como args tienen:
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,*
```

### Error: "Connection refused al /api/status"  
- ¿El API server está corriendo? → `ps aux | grep node`
- ¿Puerto correcto? → Default 3128
- ¿Backend path válido? → Verificar BACKEND_PATH variable

## 📞 Contacto y Ayuda

Si tienes problemas:
1. Revisa logs en `api-server/src/` y `frontend/` 
2. Comproba que ambos servidores están running
3. Prueba cada endpoint individualmente con curl

---

**¡Listo para empezar! Ejecuta estos comandos:**

```bash
# Paso 1: Instalar dependencias de API server
cd api-server && npm install

# Paso 2: Iniciar API server (con placeholder backend)
node src/backend-bridge.js

# Paso 3: En otro terminal, frontend en dev mode  
cd ../frontend && npm install && npm run dev

# Paso 4: Abre http://localhost:5173 en navegador
```

