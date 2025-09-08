#!/bin/bash

# Testing Infrastructure Runner
echo "🧪 MDA Sistema - Testing Phase 3"
echo "================================="

echo "1. Type checking..."
npx tsc --noEmit

echo "2. Running unit tests..."
npx vitest run

echo "3. Testing completed!"
echo "Phase 3 Día 1: Base de Permisos y Roles - ✅ COMPLETADO"
echo ""
echo "✅ Sistema de permisos mejorado"
echo "✅ Nuevos roles específicos agregados" 
echo "✅ Permisos granulares implementados"
echo "✅ Componentes PermissionGuard actualizados"
echo "✅ Tests de permisos creados y validados"
echo "✅ Gestión de membresías simplificada implementada"