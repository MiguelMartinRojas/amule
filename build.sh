#!/bin/bash
# Script para construir el frontend React moderno

set -e

echo "=========================================="
echo "  🚀 aMule Modern UI - Build Script"
echo "=========================================="

FRONTEND_DIR="$(dirname "${BASH_SOURCE[0]}")/frontend"

echo ""
echo "📁 Frontend directory: $FRONTEND_DIR"

# Verificar node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no instalado. Por favor instálalo antes de continuar."
    echo "   Instala con: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "                    && sudo apt-get install -y nodejs"
    exit 1
fi

echo "✅ Node.js $(node --version)"

# Cambiar al directorio frontend
cd "$FRONTEND_DIR"

# Instalar dependencias
echo ""
echo "📦 Installing dependencies..."
npm install

# Construir el proyecto
echo ""
echo "🏗️  Building frontend..."
npm run build

echo ""
echo "✅ Build complete! Frontend files in: dist/"
echo "   Run 'npx serve dist' to preview, or add to nginx/Apache"
