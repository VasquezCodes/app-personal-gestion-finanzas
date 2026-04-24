#!/bin/bash
# ============================================
# AutoDealer PWA — Script de Inicialización
# Ejecutar: bash setup.sh
# ============================================

echo "🚗 Inicializando AutoDealer PWA..."

# Crear proyecto Vite + React + TypeScript
npm create vite@latest . -- --template react-ts --yes 2>/dev/null || true

# Instalar dependencias principales
echo "📦 Instalando dependencias..."
npm install \
  @supabase/supabase-js \
  react-router-dom \
  zustand \
  react-hook-form \
  @hookform/resolvers \
  zod \
  framer-motion \
  recharts \
  xlsx \
  konsta \
  lucide-react \
  clsx \
  date-fns

# Instalar Tailwind CSS
npm install -D \
  tailwindcss \
  @tailwindcss/vite \
  postcss \
  autoprefixer \
  vite-plugin-pwa \
  workbox-window \
  @types/node

echo "✅ Dependencias instaladas"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Crear proyecto en https://supabase.com"
echo "  2. Copiar URL y ANON KEY a .env"
echo "  3. Ejecutar supabase/schema.sql en el SQL Editor de Supabase"
echo "  4. npm run dev"
echo ""
echo "📄 Archivos de setup incluidos:"
echo "  - CLAUDE.md         → Instrucciones para Claude Code"
echo "  - supabase/schema.sql → Schema de base de datos"
echo "  - src/types/index.ts  → Tipos TypeScript"
echo "  - src/lib/utils.ts    → Utilidades"
echo "  - src/lib/excel.ts    → Parser de Excel"
echo "  - src/styles/ios-tokens.css → Variables de diseño iOS"
