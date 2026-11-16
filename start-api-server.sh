#!/bin/bash

# Script para iniciar el API Server moderno de aMule
# Este bridge conecta el backend wxWidgets con el frontend React moderno

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SERVER_DIR="$SCRIPT_DIR/api-server"

echo "=========================================="
echo "  🚀 aMule Modern API Server Launcher"
echo "=========================================="
echo ""

# Verificar que el directorio existe
if [ ! -d "$API_SERVER_DIR" ]; then
    echo "❌ Error: api-server directory not found at $API_SERVER_DIR"
    exit 1
fi

# Cambiar al directorio del API server
cd "$API_SERVER_DIR"

echo "📁 Working directory: $(pwd)"
echo ""

# Verificar node/npm
if command -v node &> /dev/null; then
    echo "✅ Node.js installed: $(node --version)"
else
    echo "❌ Node.js not found. Installing via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    if command -v node &> /dev/null; then
        echo "✅ Node.js installed: $(node --version)"
    else
        echo "❌ Error: Cannot install Node.js, exiting..."
        exit 1
    fi
fi

# Instalar dependencias (solo si es la primera vez o dependencias corruptas)
if [ ! -d "node_modules" ] || [ ! -f package-lock.json ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install --production
else
    echo ""
    echo "✅ Dependencies already installed (skipping)"
fi

# Iniciar el servidor API
echo ""
echo "🚀 Starting API server at port ${API_PORT:-3128}..."
exec node src/backend-bridge.js "$@"

