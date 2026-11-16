# aMule Modernization - Ruta 2: Arquitectura Híbrida

## Visión General

Migración de la UI nativa wxWidgets a una arquitectura híbrida moderna manteniendo el backend robusto.

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Moderno (React/Vue)              │
│  - Dashboard + Charts + Animations                          │
│  - Web Client para usuarios remotos                         │
│  - PWA con offline support                                   │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/WebSocket/REST API
┌─────────────────────────────────────────────────────────────┐
│              RPC Server (Express.js / Fastify)               │
│  - Middleware layer entre backend y frontend                │
│  - Validación de datos + Serialización                       │
│  - Auth si se requiere                                       │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/IPC
┌─────────────────────────────────────────────────────────────┐
│         Backend wxWidgets (lógica de negocio existente)      │
│  - Lógica P2P, gestión de archivos, red                      │
│  - wxThread threads para async tasks                         │
└─────────────────────────────────────────────────────────────┘
```

## Componentes a Desarrollar

### 1. API RESTful Layer (Express.js)
- ✅ Endpoints para status, stats, transfers, search, etc.
- ✅ WebSocket para notificaciones en tiempo real
- ✅ CORS y seguridad básica

### 2. Frontend React/Vue SPA
- ✅ Dashboard con graficos de transferencia
- ✅ Gestión de downloads/uploads
- ✅ Search client moderno
- ✅ User management (friends, groups)

### 3. RPC Protocolo
- ✅ Serialización JSON-RPC o gRPC si se necesita más control
- ✅ Tipos definidos para contrato API

## Plan de Trabajo

### Fase 1: API Layer Setup
1. Configurar Express.js + WebSocket server
2. Definir API contracts (JSON Schema)
3. Implementar endpoints básicos (/status, /transfers, /search)

### Fase 2: Backend Integration  
4. Exportar datos wxWidgets a JSON streams
5. Thread-safe accessors para el backend
6. IPC o HTTP bridges para communication

### Fase 3: Frontend Development
7. Setup React con Vite/Webpack
8. Components básicos (Layout, Dashboard, Transfers)
9. WebSocket client integration
10. PWA configuration

### Fase 4: Build & Deployment
11. Docker setup para deployment simplificado
12. Systemd/service config para producción
13. Monitoring básico + metrics

## Endpoints Planeados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/status` | GET | Status del sistema (memoria, CPU, conns) |
| `/api/transfers?op=list` | GET | Lista de downloads/uploads |
| `/api/transfers/<hash>` | GET | Details de un transfer |
| `/api/search?query=xyz` | POST/GET | Search en red Kad/eDonkey |
| `/api/friends` | GET/POST/PUT/DELETE | Gestión de amigos |
| `/ws/events` | WS | WebSockets para notificaciones |

## Consideraciones Técnicas

- **Security**: CORS, rate limiting, input validation
- **Performance**: Connection pooling, streaming respuestas grandes
- **Compatibility**: Backwards compatible con protocolo PHP si existe
- **Migration**: Coexistencia temporal del sistema existente

## Stack Tecnológico Propuesto

### Backend API:
- Express.js o Fastify (más moderno y performante)
- Socket.io para WebSockets
- json-rpc-protocol si se requiere

### Frontend:
- React 18+ con TypeScript
- Vite para bundling rápido
- TailwindCSS para styling
- Recharts/Chart.js para gráficos

### Build System:
- Monorepo (Turbopack/Nx) o estructura simple de carpetas
- Docker compose para desarrollo/deploy

---
