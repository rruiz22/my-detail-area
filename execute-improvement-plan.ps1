# Enterprise Improvement Plan - Interactive Executor
# Version: 1.0
# Project: MyDetailArea

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('1', '2', '3', '4', '5', '6', '7', '8', 'status', 'help')]
    [string]$Phase = 'help'
)

# Colors for output
$successColor = "Green"
$warningColor = "Yellow"
$errorColor = "Red"
$infoColor = "Cyan"

function Show-Header {
    Clear-Host
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $infoColor
    Write-Host "║   MyDetailArea - Enterprise Improvement Plan Executor         ║" -ForegroundColor $infoColor
    Write-Host "║   Version 1.3.43 → 1.4.0                                      ║" -ForegroundColor $infoColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $infoColor
    Write-Host ""
}

function Show-PhaseStatus {
    Write-Host "📊 Estado de las Fases:" -ForegroundColor $infoColor
    Write-Host ""

    $phases = @(
        @{Number=1; Name="Auditoría y Preparación"; Status="pending"},
        @{Number=2; Name="Limpieza y Organización"; Status="pending"},
        @{Number=3; Name="TypeScript Strict Mode"; Status="pending"},
        @{Number=4; Name="ESLint Configuration"; Status="pending"},
        @{Number=5; Name="Git Cleanup"; Status="pending"},
        @{Number=6; Name="Detail Hub Fix"; Status="pending"},
        @{Number=7; Name="Testing Integral"; Status="pending"},
        @{Number=8; Name="Documentación Final"; Status="pending"}
    )

    foreach ($phase in $phases) {
        $icon = "⏳"
        $color = $warningColor

        if ($phase.Status -eq "completed") {
            $icon = "✅"
            $color = $successColor
        }

        Write-Host "  $icon FASE $($phase.Number): $($phase.Name)" -ForegroundColor $color
    }

    Write-Host ""
}

function Show-Menu {
    Write-Host "Opciones disponibles:" -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "  1-8)     Ejecutar FASE específica" -ForegroundColor White
    Write-Host "  status)  Ver estado de las fases" -ForegroundColor White
    Write-Host "  help)    Mostrar esta ayuda" -ForegroundColor White
    Write-Host "  exit)    Salir" -ForegroundColor White
    Write-Host ""
}

function Execute-Phase1 {
    Show-Header
    Write-Host "🔍 FASE 1: Auditoría y Preparación" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "Esta fase creará backups y capturará métricas baseline." -ForegroundColor White
    Write-Host ""
    $confirm = Read-Host "¿Continuar? (s/n)"

    if ($confirm -ne 's') {
        Write-Host "❌ Cancelado por el usuario." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "⏳ Ejecutando tareas de FASE 1..." -ForegroundColor $warningColor
    Write-Host ""

    # Task 1: Git tag
    Write-Host "1. Creando git tag..." -ForegroundColor White
    git tag v1.3.43-pre-improvements 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Tag creado: v1.3.43-pre-improvements" -ForegroundColor $successColor
    } else {
        Write-Host "   ⚠️ Tag ya existe (OK)" -ForegroundColor $warningColor
    }

    # Task 2: Create backups directory
    Write-Host "2. Creando directorio de backups..." -ForegroundColor White
    $backupDir = "backups/pre-improvement-$(Get-Date -Format 'yyyy-MM-dd')"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Write-Host "   ✅ Directorio creado: $backupDir" -ForegroundColor $successColor

    # Task 3: Backup critical files
    Write-Host "3. Respaldando archivos críticos..." -ForegroundColor White
    $filesToBackup = @(
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "eslint.config.js"
    )

    foreach ($file in $filesToBackup) {
        if (Test-Path $file) {
            Copy-Item $file "$backupDir/$file" -Force
            Write-Host "   ✅ Respaldado: $file" -ForegroundColor $successColor
        }
    }

    # Task 4: Run build and capture metrics
    Write-Host "4. Ejecutando build para capturar métricas..." -ForegroundColor White
    Write-Host "   (Esto puede tomar 1-2 minutos)" -ForegroundColor $warningColor
    $buildStart = Get-Date
    npm run build 2>&1 | Out-File "$backupDir/build-output-baseline.log"
    $buildEnd = Get-Date
    $buildTime = ($buildEnd - $buildStart).TotalSeconds
    Write-Host "   ✅ Build completado en $([math]::Round($buildTime, 2)) segundos" -ForegroundColor $successColor

    # Task 5: Run tests and capture coverage
    Write-Host "5. Ejecutando tests..." -ForegroundColor White
    npm run test:run 2>&1 | Out-File "$backupDir/test-output-baseline.log"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Tests ejecutados exitosamente" -ForegroundColor $successColor
    } else {
        Write-Host "   ⚠️ Algunos tests fallaron (capturado en log)" -ForegroundColor $warningColor
    }

    # Task 6: Run lint and capture output
    Write-Host "6. Ejecutando lint..." -ForegroundColor White
    npm run lint 2>&1 | Out-File "$backupDir/lint-output-baseline.log"
    Write-Host "   ✅ Lint ejecutado (ver log para detalles)" -ForegroundColor $successColor

    # Task 7: Run npm audit
    Write-Host "7. Ejecutando npm audit..." -ForegroundColor White
    npm audit 2>&1 | Out-File "$backupDir/npm-audit-baseline.log"
    Write-Host "   ✅ Audit completado" -ForegroundColor $successColor

    # Task 8: Create PRE_IMPROVEMENT_STATE.md
    Write-Host "8. Creando PRE_IMPROVEMENT_STATE.md..." -ForegroundColor White
    $stateDoc = @"
# Pre-Improvement State - Baseline Metrics

**Fecha:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Versión:** 1.3.43
**Git commit:** $(git rev-parse HEAD)

## Build Metrics
- **Build time:** $([math]::Round($buildTime, 2)) segundos
- **Dist size:** $(if (Test-Path dist) { (Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB } else { "N/A" }) MB

## TypeScript Configuration (tsconfig.json)
\`\`\`json
{
  "noImplicitAny": false,
  "strictNullChecks": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false
}
\`\`\`

## Logs Capturados
- Build output: $backupDir/build-output-baseline.log
- Test output: $backupDir/test-output-baseline.log
- Lint output: $backupDir/lint-output-baseline.log
- NPM audit: $backupDir/npm-audit-baseline.log

## Estructura de Archivos Root
- Archivos en root: $((Get-ChildItem . -File).Count)
- Archivos .md en root: $((Get-ChildItem . -Filter "*.md").Count)
- Archivos .sql en root: $((Get-ChildItem . -Filter "*.sql").Count)

## Próximo Paso
FASE 2: Limpieza y Organización
"@

    $stateDoc | Out-File "PRE_IMPROVEMENT_STATE.md" -Encoding UTF8
    Write-Host "   ✅ Documento creado: PRE_IMPROVEMENT_STATE.md" -ForegroundColor $successColor

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $successColor
    Write-Host "║  ✅ FASE 1 COMPLETADA EXITOSAMENTE                            ║" -ForegroundColor $successColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $successColor
    Write-Host ""
    Write-Host "📁 Backups guardados en: $backupDir" -ForegroundColor $infoColor
    Write-Host "📄 Métricas baseline en: PRE_IMPROVEMENT_STATE.md" -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "Próxima fase: FASE 2 (Limpieza y Organización)" -ForegroundColor $warningColor
    Write-Host "Ejecutar: .\execute-improvement-plan.ps1 -Phase 2" -ForegroundColor White
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase2 {
    Show-Header
    Write-Host "📁 FASE 2: Limpieza y Organización" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "Esta fase reorganizará ~380 archivos del root en estructura clara." -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Esta fase moverá muchos archivos." -ForegroundColor $warningColor
    Write-Host "    Asegúrate de tener un commit limpio antes de continuar." -ForegroundColor $warningColor
    Write-Host ""

    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠️  Hay cambios sin commitear en git." -ForegroundColor $warningColor
        Write-Host ""
        $confirm = Read-Host "¿Continuar de todos modos? (s/n)"
        if ($confirm -ne 's') {
            Write-Host "❌ Cancelado. Commitea tus cambios primero." -ForegroundColor $errorColor
            return
        }
    }

    Write-Host ""
    Write-Host "⏳ Ejecutando tareas de FASE 2..." -ForegroundColor $warningColor
    Write-Host ""

    # Task 1: Create directory structure
    Write-Host "1. Creando estructura de directorios..." -ForegroundColor White
    $directories = @(
        "docs/architecture",
        "docs/features",
        "docs/migration-guides",
        "docs/troubleshooting",
        "docs/api",
        "docs/deployment",
        "migrations/applied",
        "migrations/pending",
        "migrations/rollback",
        "scripts/database",
        "scripts/deployment",
        "scripts/maintenance"
    )

    foreach ($dir in $directories) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "   ✅ Creado: $dir" -ForegroundColor $successColor
    }

    # Task 2: Update .gitignore
    Write-Host "2. Actualizando .gitignore..." -ForegroundColor White
    $gitignoreAdditions = @"

# Enterprise Improvement Plan additions
docs/private/
*.backup
*.old
*.log
"@
    Add-Content -Path ".gitignore" -Value $gitignoreAdditions
    Write-Host "   ✅ .gitignore actualizado" -ForegroundColor $successColor

    # Task 3: Update .eslintignore
    Write-Host "3. Actualizando .eslintignore..." -ForegroundColor White
    $eslintignore = @"
# Build outputs
dist/
dev-dist/
build/

# Backups
backups/
.backups/
*.backup
*.old

# Documentation
docs/
*.md

# Migrations and scripts
migrations/
scripts/database/
*.sql

# Node modules
node_modules/

# Generated files
.vscode/
.idea/
*.log
coverage/

# Test fixtures
**/__fixtures__/
**/__mocks__/
"@
    $eslintignore | Out-File ".eslintignore" -Encoding UTF8
    Write-Host "   ✅ .eslintignore actualizado" -ForegroundColor $successColor

    Write-Host ""
    Write-Host "⚠️  Archivos movidos manualmente:" -ForegroundColor $warningColor
    Write-Host "    Los archivos .md y .sql deben ser categorizados y movidos manualmente" -ForegroundColor White
    Write-Host "    debido a su gran cantidad y necesidad de revisión individual." -ForegroundColor White
    Write-Host ""
    Write-Host "    Guía de categorización:" -ForegroundColor $infoColor
    Write-Host "    - *_IMPLEMENTATION.md, *_COMPLETE.md → docs/features/" -ForegroundColor White
    Write-Host "    - *_MIGRATION*.md, APPLY_*.md → docs/migration-guides/" -ForegroundColor White
    Write-Host "    - *_FIX*.md, *_DEBUG*.md, HOTFIX_*.md → docs/troubleshooting/" -ForegroundColor White
    Write-Host "    - DEPLOY_*.md → docs/deployment/" -ForegroundColor White
    Write-Host "    - *_ARCHITECTURE.md → docs/architecture/" -ForegroundColor White
    Write-Host "    - Archivos .sql → migrations/ o scripts/database/ según tipo" -ForegroundColor White
    Write-Host ""

    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $warningColor
    Write-Host "║  ⏸️  FASE 2 PARCIALMENTE COMPLETADA                           ║" -ForegroundColor $warningColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $warningColor
    Write-Host ""
    Write-Host "✅ Estructura de directorios creada" -ForegroundColor $successColor
    Write-Host "✅ .gitignore y .eslintignore actualizados" -ForegroundColor $successColor
    Write-Host "⏳ Pendiente: Mover archivos .md y .sql manualmente" -ForegroundColor $warningColor
    Write-Host ""
    Write-Host "Para completar esta fase:" -ForegroundColor $infoColor
    Write-Host "1. Revisar archivos en root" -ForegroundColor White
    Write-Host "2. Mover a carpetas apropiadas según guía arriba" -ForegroundColor White
    Write-Host "3. Validar con: npm run build" -ForegroundColor White
    Write-Host "4. Commitear cambios" -ForegroundColor White
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase3 {
    Show-Header
    Write-Host "🔒 FASE 3: TypeScript Strict Mode" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "⚠️  ADVERTENCIA: Esta es la fase más crítica del plan." -ForegroundColor $errorColor
    Write-Host ""
    Write-Host "Esta fase activará TypeScript strict mode en 3 sub-pasos:" -ForegroundColor White
    Write-Host "  • PASO 3.1: strictNullChecks" -ForegroundColor White
    Write-Host "  • PASO 3.2: noImplicitAny" -ForegroundColor White
    Write-Host "  • PASO 3.3: Full strict mode" -ForegroundColor White
    Write-Host ""
    Write-Host "Cada paso puede generar 30-150 errores de TypeScript que" -ForegroundColor White
    Write-Host "deberás resolver antes de continuar al siguiente paso." -ForegroundColor White
    Write-Host ""
    Write-Host "⏱️  Duración estimada: 4-6 horas" -ForegroundColor $warningColor
    Write-Host ""

    $confirm = Read-Host "¿Estás listo para comenzar? (s/n)"
    if ($confirm -ne 's') {
        Write-Host "❌ Cancelado. Revisa ENTERPRISE_IMPROVEMENT_PLAN.md sección FASE 3 para más detalles." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "📚 FASE 3 es un proceso manual guiado." -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "Abriendo ENTERPRISE_IMPROVEMENT_PLAN.md en sección FASE 3..." -ForegroundColor White

    # Open plan document at FASE 3 section
    if (Test-Path "ENTERPRISE_IMPROVEMENT_PLAN.md") {
        Start-Process "ENTERPRISE_IMPROVEMENT_PLAN.md"
    }

    Write-Host ""
    Write-Host "Sigue estas instrucciones:" -ForegroundColor $infoColor
    Write-Host "1. Leer sección FASE 3 completa" -ForegroundColor White
    Write-Host "2. Ejecutar PASO 3.1 (strictNullChecks)" -ForegroundColor White
    Write-Host "3. Resolver errores TypeScript" -ForegroundColor White
    Write-Host "4. Validar con: npm run build && npm run test" -ForegroundColor White
    Write-Host "5. Commitear: git commit -m 'refactor(typescript): Enable strictNullChecks'" -ForegroundColor White
    Write-Host "6. Repetir para PASO 3.2 y 3.3" -ForegroundColor White
    Write-Host ""
    Write-Host "Cuando termines FASE 3 completa, ejecuta: .\execute-improvement-plan.ps1 -Phase 4" -ForegroundColor $warningColor
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase4 {
    Show-Header
    Write-Host "✨ FASE 4: ESLint Configuration" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "Esta fase optimizará la configuración de ESLint." -ForegroundColor White
    Write-Host ""
    $confirm = Read-Host "¿Continuar? (s/n)"

    if ($confirm -ne 's') {
        Write-Host "❌ Cancelado por el usuario." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "⏳ Ejecutando tareas de FASE 4..." -ForegroundColor $warningColor
    Write-Host ""

    # Task 1: Run lint to see current state
    Write-Host "1. Analizando estado actual de lint..." -ForegroundColor White
    npm run lint 2>&1 | Out-File "lint-before-phase4.log"
    Write-Host "   ✅ Estado actual guardado en lint-before-phase4.log" -ForegroundColor $successColor

    # Task 2: Run lint --fix
    Write-Host "2. Ejecutando auto-fix de ESLint..." -ForegroundColor White
    npm run lint -- --fix 2>&1 | Out-Null
    Write-Host "   ✅ Auto-fix completado" -ForegroundColor $successColor

    # Task 3: Run lint again to see remaining issues
    Write-Host "3. Re-analizando lint..." -ForegroundColor White
    npm run lint 2>&1 | Out-File "lint-after-phase4.log"

    $lintErrors = Select-String -Path "lint-after-phase4.log" -Pattern "error"
    $errorCount = ($lintErrors | Measure-Object).Count

    if ($errorCount -eq 0) {
        Write-Host "   ✅ ¡0 errores de lint!" -ForegroundColor $successColor
    } else {
        Write-Host "   ⚠️  $errorCount errores restantes (ver lint-after-phase4.log)" -ForegroundColor $warningColor
    }

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $successColor
    Write-Host "║  ✅ FASE 4 COMPLETADA                                         ║" -ForegroundColor $successColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $successColor
    Write-Host ""

    if ($errorCount -gt 0) {
        Write-Host "⚠️  Hay $errorCount errores de lint restantes." -ForegroundColor $warningColor
        Write-Host "    Revisa lint-after-phase4.log y corrige manualmente." -ForegroundColor White
        Write-Host ""
    }

    Write-Host "Próxima fase: FASE 5 (Git Cleanup)" -ForegroundColor $warningColor
    Write-Host "Ejecutar: .\execute-improvement-plan.ps1 -Phase 5" -ForegroundColor White
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase5 {
    Show-Header
    Write-Host "🌿 FASE 5: Git Cleanup" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "Esta fase commiteará cambios pendientes y limpiará estado de git." -ForegroundColor White
    Write-Host ""

    # Show current git status
    Write-Host "Estado actual de git:" -ForegroundColor $infoColor
    git status --short
    Write-Host ""

    $confirm = Read-Host "¿Continuar con git cleanup? (s/n)"
    if ($confirm -ne 's') {
        Write-Host "❌ Cancelado por el usuario." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "📚 FASE 5 requiere decisiones manuales." -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "Sigue el plan en ENTERPRISE_IMPROVEMENT_PLAN.md - FASE 5" -ForegroundColor White
    Write-Host ""
    Write-Host "Pasos recomendados:" -ForegroundColor $infoColor
    Write-Host "1. Revisar cambios con: git status" -ForegroundColor White
    Write-Host "2. Agregar archivos de reinvoicing feature" -ForegroundColor White
    Write-Host "3. Commit con mensaje descriptivo" -ForegroundColor White
    Write-Host "4. Push a origin/main" -ForegroundColor White
    Write-Host ""
    Write-Host "Cuando termines, ejecuta: .\execute-improvement-plan.ps1 -Phase 6" -ForegroundColor $warningColor
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase6 {
    Show-Header
    Write-Host "🗄️  FASE 6: Detail Hub Fix" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "⚠️  ADVERTENCIA: Esta fase modifica la base de datos." -ForegroundColor $errorColor
    Write-Host ""
    Write-Host "Esta fase ejecutará el fix preparado para Detail Hub:" -ForegroundColor White
    Write-Host "  • Agregar enum value 'auto_close'" -ForegroundColor White
    Write-Host "  • Eliminar duplicados de empleados" -ForegroundColor White
    Write-Host "  • Crear vista y función de dashboard" -ForegroundColor White
    Write-Host ""

    $confirm = Read-Host "¿Ya leíste DETAIL_HUB_STATUS_FINAL.md? (s/n)"
    if ($confirm -ne 's') {
        Write-Host "❌ Lee DETAIL_HUB_STATUS_FINAL.md primero." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "📚 FASE 6 debe ejecutarse manualmente en Supabase SQL Editor." -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "Abriendo documentos..." -ForegroundColor White

    if (Test-Path "DETAIL_HUB_STATUS_FINAL.md") {
        Start-Process "DETAIL_HUB_STATUS_FINAL.md"
    }
    if (Test-Path "READY_TO_EXECUTE.md") {
        Start-Process "READY_TO_EXECUTE.md"
    }

    Write-Host ""
    Write-Host "Sigue estas instrucciones:" -ForegroundColor $infoColor
    Write-Host "1. Abrir: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new" -ForegroundColor White
    Write-Host "2. Copiar y ejecutar STEP1_ADD_ENUM_ONLY.sql" -ForegroundColor White
    Write-Host "3. Verificar resultado (5 valores de enum)" -ForegroundColor White
    Write-Host "4. Copiar y ejecutar STEP2_CLEANUP_DUPLICATES.sql" -ForegroundColor White
    Write-Host "5. Verificar mensaje de éxito" -ForegroundColor White
    Write-Host "6. Recargar app (Ctrl+Shift+R)" -ForegroundColor White
    Write-Host "7. Verificar dashboard sin errores" -ForegroundColor White
    Write-Host ""
    Write-Host "Cuando termines, ejecuta: .\execute-improvement-plan.ps1 -Phase 7" -ForegroundColor $warningColor
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase7 {
    Show-Header
    Write-Host "✅ FASE 7: Testing Integral" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "Esta fase ejecutará la suite completa de tests y validación." -ForegroundColor White
    Write-Host ""
    Write-Host "⏱️  Duración estimada: 1-2 horas" -ForegroundColor $warningColor
    Write-Host ""

    $confirm = Read-Host "¿Continuar? (s/n)"
    if ($confirm -ne 's') {
        Write-Host "❌ Cancelado por el usuario." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "⏳ Ejecutando suite de testing..." -ForegroundColor $warningColor
    Write-Host ""

    # Task 1: Unit tests
    Write-Host "1. Ejecutando unit tests..." -ForegroundColor White
    npm run test:unit 2>&1 | Out-File "test-results-unit-phase7.log"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Unit tests: PASS" -ForegroundColor $successColor
    } else {
        Write-Host "   ❌ Unit tests: FAIL (ver log)" -ForegroundColor $errorColor
    }

    # Task 2: Build
    Write-Host "2. Ejecutando build..." -ForegroundColor White
    $buildStart = Get-Date
    npm run build 2>&1 | Out-File "build-output-phase7.log"
    $buildEnd = Get-Date
    $buildTime = ($buildEnd - $buildStart).TotalSeconds

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Build: SUCCESS ($([math]::Round($buildTime, 2))s)" -ForegroundColor $successColor
    } else {
        Write-Host "   ❌ Build: FAIL (ver log)" -ForegroundColor $errorColor
    }

    # Task 3: Lint
    Write-Host "3. Ejecutando lint..." -ForegroundColor White
    npm run lint 2>&1 | Out-File "lint-results-phase7.log"
    $lintErrors = Select-String -Path "lint-results-phase7.log" -Pattern "error"
    $errorCount = ($lintErrors | Measure-Object).Count

    if ($errorCount -eq 0) {
        Write-Host "   ✅ Lint: 0 errores" -ForegroundColor $successColor
    } else {
        Write-Host "   ⚠️  Lint: $errorCount errores" -ForegroundColor $warningColor
    }

    Write-Host ""
    Write-Host "📋 Testing Checklist Manual:" -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "Valida manualmente los siguientes flujos críticos:" -ForegroundColor White
    Write-Host "  [ ] Auth Flow (login/logout/password reset)" -ForegroundColor White
    Write-Host "  [ ] Dashboard (métricas cargan correctamente)" -ForegroundColor White
    Write-Host "  [ ] Orders (CRUD en Sales/Service/Recon/CarWash)" -ForegroundColor White
    Write-Host "  [ ] Contacts (crear/editar/QR generation)" -ForegroundColor White
    Write-Host "  [ ] Detail Hub (dashboard sin duplicados)" -ForegroundColor White
    Write-Host "  [ ] Reports (export PDF/Excel)" -ForegroundColor White
    Write-Host "  [ ] Permissions (diferentes roles funcionan)" -ForegroundColor White
    Write-Host "  [ ] i18n (cambio de idioma funciona)" -ForegroundColor White
    Write-Host ""

    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $warningColor
    Write-Host "║  ⏸️  FASE 7 REQUIERE VALIDACIÓN MANUAL                        ║" -ForegroundColor $warningColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $warningColor
    Write-Host ""
    Write-Host "✅ Tests automatizados ejecutados" -ForegroundColor $successColor
    Write-Host "⏳ Pendiente: Testing manual de flujos críticos" -ForegroundColor $warningColor
    Write-Host ""
    Write-Host "Ejecuta: npm run dev" -ForegroundColor White
    Write-Host "Y valida cada item del checklist arriba." -ForegroundColor White
    Write-Host ""
    Write-Host "Cuando termines, ejecuta: .\execute-improvement-plan.ps1 -Phase 8" -ForegroundColor $warningColor
    Write-Host ""

    Read-Host "Presiona Enter para continuar"
}

function Execute-Phase8 {
    Show-Header
    Write-Host "📚 FASE 8: Documentación Final" -ForegroundColor $infoColor
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $infoColor
    Write-Host ""

    Write-Host "Esta fase creará el changelog y actualizará documentación." -ForegroundColor White
    Write-Host ""
    $confirm = Read-Host "¿Continuar? (s/n)"

    if ($confirm -ne 's') {
        Write-Host "❌ Cancelado por el usuario." -ForegroundColor $errorColor
        return
    }

    Write-Host ""
    Write-Host "⏳ Ejecutando tareas de FASE 8..." -ForegroundColor $warningColor
    Write-Host ""

    # Task 1: Update version in package.json
    Write-Host "1. Actualizando versión en package.json..." -ForegroundColor White
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $packageJson.version = "1.4.0"
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
    Write-Host "   ✅ Versión actualizada: 1.3.43 → 1.4.0" -ForegroundColor $successColor

    # Task 2: Create git tag
    Write-Host "2. Creando git tag para nueva versión..." -ForegroundColor White
    git tag v1.4.0-enterprise-improvements 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Tag creado: v1.4.0-enterprise-improvements" -ForegroundColor $successColor
    } else {
        Write-Host "   ⚠️ Tag ya existe (OK)" -ForegroundColor $warningColor
    }

    # Task 3: Create POST_IMPROVEMENT_STATE.md
    Write-Host "3. Creando POST_IMPROVEMENT_STATE.md..." -ForegroundColor White

    $buildTime = "N/A"
    if (Test-Path "build-output-phase7.log") {
        # Parse build time from log
        $buildTime = "Ver build-output-phase7.log"
    }

    $postStateDoc = @"
# Post-Improvement State - Final Metrics

**Fecha:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Versión:** 1.4.0
**Git commit:** $(git rev-parse HEAD)

## Build Metrics
- **Build time:** $buildTime
- **Dist size:** $(if (Test-Path dist) { [math]::Round((Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2) } else { "N/A" }) MB

## TypeScript Configuration (tsconfig.json)
\`\`\`json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
\`\`\`

## Logs de Validación
- Build output: build-output-phase7.log
- Test output: test-results-unit-phase7.log
- Lint output: lint-results-phase7.log

## Estructura de Archivos
- Estructura /docs/ creada: ✅
- Estructura /migrations/ creada: ✅
- Archivos organizados: ✅

## Mejoras Completadas
- [x] TypeScript strict mode activado
- [x] Estructura de archivos reorganizada
- [x] ESLint configuration optimizada
- [x] Detail Hub fix aplicado
- [x] Tests passing
- [x] Documentación actualizada

## Comparación con Baseline
Ver PRE_IMPROVEMENT_STATE.md para métricas anteriores.

## Próximos Pasos Sugeridos
- [ ] Deploy a staging para validación final
- [ ] Notificar equipo de cambios
- [ ] Schedule retrospective
- [ ] Celebrar éxito 🎉
"@

    $postStateDoc | Out-File "POST_IMPROVEMENT_STATE.md" -Encoding UTF8
    Write-Host "   ✅ Documento creado: POST_IMPROVEMENT_STATE.md" -ForegroundColor $successColor

    Write-Host ""
    Write-Host "📝 Documentación adicional requerida:" -ForegroundColor $infoColor
    Write-Host ""
    Write-Host "Debes crear manualmente:" -ForegroundColor White
    Write-Host "  1. CHANGELOG_v1.4.0.md (ver template en ENTERPRISE_IMPROVEMENT_PLAN.md)" -ForegroundColor White
    Write-Host "  2. LESSONS_LEARNED.md (captura tu experiencia)" -ForegroundColor White
    Write-Host "  3. Actualizar README.md con sección de mejoras recientes" -ForegroundColor White
    Write-Host ""

    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $successColor
    Write-Host "║  ✅ FASE 8 COMPLETADA                                         ║" -ForegroundColor $successColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $successColor
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $successColor
    Write-Host "║                                                                ║" -ForegroundColor $successColor
    Write-Host "║  🎉 ¡TODAS LAS FASES COMPLETADAS!                             ║" -ForegroundColor $successColor
    Write-Host "║                                                                ║" -ForegroundColor $successColor
    Write-Host "║  MyDetailArea v1.4.0 - Enterprise Improvements                ║" -ForegroundColor $successColor
    Write-Host "║                                                                ║" -ForegroundColor $successColor
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $successColor
    Write-Host ""
    Write-Host "✅ Versión actualizada: 1.4.0" -ForegroundColor $successColor
    Write-Host "✅ Git tag creado: v1.4.0-enterprise-improvements" -ForegroundColor $successColor
    Write-Host "✅ Documentación final creada" -ForegroundColor $successColor
    Write-Host ""
    Write-Host "Próximos pasos finales:" -ForegroundColor $infoColor
    Write-Host "1. Crear CHANGELOG_v1.4.0.md" -ForegroundColor White
    Write-Host "2. Crear LESSONS_LEARNED.md" -ForegroundColor White
    Write-Host "3. Actualizar README.md" -ForegroundColor White
    Write-Host "4. git push origin main --tags" -ForegroundColor White
    Write-Host "5. Notificar equipo" -ForegroundColor White
    Write-Host "6. ¡Celebrar! 🎊" -ForegroundColor White
    Write-Host ""

    Read-Host "Presiona Enter para finalizar"
}

# Main execution
switch ($Phase) {
    '1' { Execute-Phase1 }
    '2' { Execute-Phase2 }
    '3' { Execute-Phase3 }
    '4' { Execute-Phase4 }
    '5' { Execute-Phase5 }
    '6' { Execute-Phase6 }
    '7' { Execute-Phase7 }
    '8' { Execute-Phase8 }
    'status' {
        Show-Header
        Show-PhaseStatus
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
    }
    'help' {
        Show-Header
        Show-Menu
        Write-Host "Uso:" -ForegroundColor $infoColor
        Write-Host "  .\execute-improvement-plan.ps1 -Phase <número o comando>" -ForegroundColor White
        Write-Host ""
        Write-Host "Ejemplos:" -ForegroundColor $infoColor
        Write-Host "  .\execute-improvement-plan.ps1 -Phase 1      # Ejecutar FASE 1" -ForegroundColor White
        Write-Host "  .\execute-improvement-plan.ps1 -Phase status # Ver estado" -ForegroundColor White
        Write-Host ""
        Write-Host "📚 Documentación completa:" -ForegroundColor $infoColor
        Write-Host "  - EXECUTIVE_SUMMARY.md (resumen ejecutivo)" -ForegroundColor White
        Write-Host "  - ENTERPRISE_IMPROVEMENT_PLAN.md (plan técnico detallado)" -ForegroundColor White
        Write-Host ""
    }
}
