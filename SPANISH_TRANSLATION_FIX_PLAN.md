# Plan de Corrección de Traducciones al Español

**Fecha de Inicio:** 2025-11-22
**Estado:** Herramientas completadas, listo para Fase 1

---

## 📊 Auditoría Inicial - Resultados

### Estadísticas Globales
- **Archivos revisados:** 76 archivos JSON
- **Archivos con problemas:** 66 (87%)
- **Archivos correctos:** 10 (13%)
- **Total de problemas:** 367 instancias

### Desglose por Tipo de Problema
1. **🇵🇹 Palabras en portugués:** 347 instancias (95%)
2. **🇬🇧 Texto en inglés:** 20 instancias (5%)
3. **🔤 Errores de codificación:** 0 (ya fueron corregidos previamente)

### Top 10 Archivos con Más Problemas
1. `get_ready.json` - 25 problemas
2. `chat.json` - 15 problemas
3. `productivity.json` - 15 problemas
4. `accessibility.json` - 14 problemas
5. `common.json` - 12 problemas (⚠️ CRÍTICO - afecta toda la app)
6. `reports.json` - 12 problemas
7. `stock.json` - 12 problemas
8. `dashboard.json` - 11 problemas
9. `sales_orders.json` - 11 problemas
10. `dealer.json` - 10 problemas

---

## 🛠️ Herramientas Creadas

### 1. Script de Validación ✅
**Archivo:** `scripts/validate-spanish-translations.mjs`

**Características:**
- Detecta palabras en portugués (87 palabras monitoreadas)
- Detecta texto en inglés no traducido
- Detecta errores de codificación UTF-8
- Genera reporte detallado con ejemplos

**Uso:**
```bash
# Validar un archivo específico
node scripts/validate-spanish-translations.mjs public/translations/es/common.json

# Validar todos los archivos
node scripts/validate-spanish-translations.mjs --all
```

**Ejemplo de salida:**
```
Files checked: 76
Files with issues: 66
Total issues found: 367

Issues by type:
  🔤 Encoding errors: 0
  🇵🇹 Portuguese words: 347
  🇬🇧 English text: 20
```

### 2. Script de Corrección de Codificación ✅
**Archivo:** `scripts/fix-spanish-encoding.mjs`

**Características:**
- Corrige automáticamente errores de codificación UTF-8
- Valida JSON antes y después de las correcciones
- Muestra estadísticas de correcciones

**Patrones corregidos:**
- `DiÃ¡rio` → `Diario`
- `CrÃ­tico` → `Crítico`
- `â‰¤` → `<`
- `Custo/dia` → `Costo/día`
- `Por Dias` → `Por Días`
- `Etapa Atual` → `Etapa Actual`

**Uso:**
```bash
# Corregir un archivo específico
node scripts/fix-spanish-encoding.mjs public/translations/es/get_ready.json

# Corregir todos los archivos
node scripts/fix-spanish-encoding.mjs --all
```

**Resultado de prueba:**
```
Processing: public/translations/es/get_ready.json
  ✓ Fixed: "DiÃ¡rio" → "Diario" (1 times)
  ✓ Fixed: "CrÃ­tico" → "Crítico" (9 times)
  ✓ Fixed: "Etapa Atual" → "Etapa Actual" (1 times)
  ✅ Fixed 11 encoding issues
```

### 3. Mapa de Traducción PT→ES ✅
**Archivo:** `scripts/portuguese-to-spanish-map.json`

**Contenido:**
- 150+ mapeos organizados por categoría
- Categorías: common_words, verbs, phrases, ui_elements, date_time, dealership_specific

**Ejemplos:**
```json
{
  "common_words": {
    "usuário": "usuario",
    "informações": "información",
    "concessionária": "concesionario"
  },
  "verbs": {
    "criar": "crear",
    "salvar": "guardar"
  },
  "dealership_specific": {
    "estoque": "inventario",
    "manutenção": "mantenimiento",
    "peças": "piezas"
  }
}
```

---

## 📋 Plan de Corrección en 4 Fases

### **FASE 1: CRÍTICO - Manual** (Semana 1) - 20 horas ⏳
Archivos que afectan funcionalidad core de toda la aplicación.

#### Archivos a Corregir:
1. **common.json** (3h) - ⚠️ MÁXIMA PRIORIDAD
   - 12 problemas detectados
   - Afecta: Botones, labels, mensajes globales
   - Estrategia: Traducción manual completa EN→ES

2. **dashboard.json** (3h)
   - 11 problemas (portugués)
   - Afecta: Dashboard principal, métricas
   - Estrategia: Usar mapa PT→ES

3. **auth.json** (2h)
   - 2 problemas (portugués)
   - Afecta: Login, registro, recuperación de contraseña
   - Estrategia: Traducción manual

4. **accessibility.json** (4h)
   - 14 problemas (portugués)
   - Afecta: Lectores de pantalla, navegación por teclado
   - Estrategia: Traducción manual (requiere precisión técnica)

5. **orders.json** (4h)
   - 5 problemas (portugués)
   - Afecta: Funcionalidad de órdenes (sales, service, recon)
   - Estrategia: Usar mapa PT→ES + validación manual

6. **messages.json** (4h)
   - 7 problemas (portugués)
   - Afecta: Sistema de mensajería
   - Estrategia: Traducción manual

**Criterio de Éxito:**
- ✅ 0 palabras en portugués
- ✅ 0 texto en inglés no intencional
- ✅ JSON válido
- ✅ Pruebas en UI confirman traducciones correctas

---

### **FASE 2: ALTA PRIORIDAD - Híbrido** (Semana 2) - 15 horas
Archivos de módulos principales usados frecuentemente.

#### Archivos a Corregir:
1. **get_ready.json** (4h) - 25 problemas
2. **reports.json** (3h) - 12 problemas
3. **sales_orders.json** (2h) - 11 problemas
4. **service_orders.json** (2h) - 10 problemas
5. **contacts.json** - Ya está correcto ✅
6. **chat.json** (4h) - 15 problemas

**Estrategia:**
- Usar `fix-spanish-encoding.mjs` primero
- Aplicar mapa PT→ES automáticamente
- Revisión manual de términos específicos del dominio

---

### **FASE 3: MEDIA PRIORIDAD - Automatizado** (Semana 3) - 12 horas
Archivos de funcionalidades secundarias.

#### Archivos a Corregir:
- `productivity.json` (15 problemas)
- `stock.json` (12 problemas)
- `dealer.json` (10 problemas)
- `groups.json`, `roles.json`, `permissions.json`
- `vin_scanner.json`, `vin_analyzer.json`
- Otros 20 archivos con <10 problemas cada uno

**Estrategia:**
- Ejecución automática con scripts
- Validación por muestreo (revisar 20% manualmente)

---

### **FASE 4: BAJA PRIORIDAD - Automatizado** (Semana 4) - 8 horas
Archivos de funcionalidades poco usadas o edge cases.

#### Archivos a Corregir:
- `announcements.json`
- `calendar.json`
- `nfc.json`, `nfc_tracking.json`
- `integrations.json`
- `legal.json`
- Otros archivos con <5 problemas

**Estrategia:**
- Corrección batch automática
- Validación final con script

---

## 🎯 Próximos Pasos Inmediatos

### 1. Ejecutar Corrección Automática de Codificación
```bash
# Aplicar correcciones a todos los archivos
node scripts/fix-spanish-encoding.mjs --all
```

**Resultado esperado:** ~50-100 correcciones automáticas de encoding

### 2. Iniciar Fase 1 - common.json
Este es el archivo MÁS CRÍTICO que afecta toda la aplicación.

**Pasos:**
1. Hacer backup: `cp public/translations/es/common.json public/translations/es/common.json.backup`
2. Revisar archivo completo línea por línea
3. Traducir todo texto en inglés a español
4. Validar JSON: `node scripts/validate-spanish-translations.mjs public/translations/es/common.json`
5. Probar en UI local: `npm run dev`

### 3. Crear Glosario de Términos
Durante la corrección de common.json, documentar traducciones estándar:

**Términos clave:**
- Order → Orden (NO "pedido")
- Dealership → Concesionario
- Inventory → Inventario (NO "estoque")
- Service → Servicio
- Customer → Cliente
- Vehicle → Vehículo
- Settings → Configuración
- Dashboard → Panel de control

---

## ✅ Checklist de Validación

Después de cada corrección, verificar:

- [ ] Script de validación no reporta errores
- [ ] JSON es válido (no hay errores de sintaxis)
- [ ] No hay texto en portugués
- [ ] No hay texto en inglés (excepto valores técnicos como "Loading...")
- [ ] Términos son consistentes con el glosario
- [ ] UI muestra traducciones correctamente
- [ ] No hay errores en consola del navegador

---

## 📈 Métricas de Progreso

### Estado Actual (2025-11-22)
- ✅ Herramientas creadas: 3/3 (100%)
- ⏳ Fase 1: 0/6 archivos (0%)
- ⏳ Fase 2: 0/6 archivos (0%)
- ⏳ Fase 3: 0/20 archivos (0%)
- ⏳ Fase 4: 0/10 archivos (0%)

**Total:** 0/42 archivos corregidos (0%)

### Objetivo Final
- 🎯 76 archivos revisados
- 🎯 0 errores de codificación
- 🎯 0 palabras en portugués
- 🎯 Máximo 5% de texto en inglés (solo valores técnicos)

---

## 🚀 Estimación de Tiempo Total

| Fase | Horas | Estado |
|------|-------|--------|
| Preparación (herramientas) | 6h | ✅ Completado |
| Fase 1 - Crítico | 20h | ⏳ Pendiente |
| Fase 2 - Alta prioridad | 15h | ⏳ Pendiente |
| Fase 3 - Media prioridad | 12h | ⏳ Pendiente |
| Fase 4 - Baja prioridad | 8h | ⏳ Pendiente |
| Validación final | 4h | ⏳ Pendiente |
| **TOTAL** | **65h** | **9% completado** |

---

## 📝 Notas Importantes

1. **Backup antes de cambios masivos:**
   ```bash
   cp -r public/translations/es public/translations/es_backup_20251122
   ```

2. **Testing después de cada fase:**
   - Ejecutar validación: `node scripts/validate-spanish-translations.mjs --all`
   - Probar UI en español: `npm run dev`
   - Verificar módulos afectados manualmente

3. **Control de versiones:**
   - Commits frecuentes después de cada archivo corregido
   - Mensaje de commit descriptivo: `fix(i18n): corregir traducciones en common.json (PT→ES)`

4. **Archivos que NO necesitan corrección:**
   - `completion_date.json` ✅
   - `contacts.json` ✅
   - `due_date.json` ✅
   - `error_screens.json` ✅
   - `quick_scan.json` ✅
   - `recon_defaults.json` ✅
   - `settings.json` ✅
   - `users.json` ✅
   - `validation.json` ✅
   - `vin_scanner_errors.json` ✅

---

**Última actualización:** 2025-11-22
**Próxima revisión:** Después de completar Fase 1
