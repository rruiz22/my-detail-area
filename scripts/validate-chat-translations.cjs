/**
 * Script para validar la estructura de las traducciones del módulo Team Chat
 */

const fs = require('fs');
const path = require('path');

function validateTranslationStructure(lang) {
  const filePath = path.join(__dirname, '..', 'public', 'translations', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`\n🔍 Validando ${lang}.json...`);

  // Verificar que chat existe y es un objeto
  if (!data.chat || typeof data.chat !== 'object') {
    console.error(`❌ ${lang}: chat no es un objeto válido`);
    return false;
  }

  // Verificar secciones principales
  const requiredSections = [
    'permissions',
    'templates',
    'moderation',
    'channels',
    'threading',
    'messages',
    'emoji',
    'mentions'
  ];

  const missingSections = requiredSections.filter(section => !data.chat[section]);

  if (missingSections.length > 0) {
    console.error(`❌ ${lang}: Faltan secciones: ${missingSections.join(', ')}`);
    return false;
  }

  // Verificar keys de nivel superior
  const requiredTopLevelKeys = [
    'no_messages_yet',
    'just_now',
    'minutes_ago',
    'hours_ago',
    'days_ago',
    'start_conversation_hint'
  ];

  const missingTopLevelKeys = requiredTopLevelKeys.filter(key => !data.chat[key]);

  if (missingTopLevelKeys.length > 0) {
    console.error(`❌ ${lang}: Faltan keys de nivel superior: ${missingTopLevelKeys.join(', ')}`);
    return false;
  }

  // Contar keys en cada sección
  const sectionCounts = {};
  requiredSections.forEach(section => {
    sectionCounts[section] = Object.keys(data.chat[section]).length;
  });

  console.log(`✅ ${lang}.json: Estructura validada correctamente`);
  console.log(`   Secciones validadas:`);
  Object.entries(sectionCounts).forEach(([section, count]) => {
    console.log(`     - ${section}: ${count} keys`);
  });

  return true;
}

function validateConsistency() {
  console.log('\n🔄 Validando consistencia entre idiomas...\n');

  const languages = ['en', 'es', 'pt-BR'];
  const structures = {};

  // Cargar todas las estructuras
  for (const lang of languages) {
    const filePath = path.join(__dirname, '..', 'public', 'translations', `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    structures[lang] = data.chat;
  }

  // Verificar que todas las secciones tengan el mismo número de keys
  const sections = Object.keys(structures.en).filter(key =>
    typeof structures.en[key] === 'object' && structures.en[key] !== null
  );

  let isConsistent = true;

  for (const section of sections) {
    const enKeys = Object.keys(structures.en[section] || {}).length;
    const esKeys = Object.keys(structures.es[section] || {}).length;
    const ptKeys = Object.keys(structures['pt-BR'][section] || {}).length;

    if (enKeys !== esKeys || enKeys !== ptKeys) {
      console.error(`❌ Inconsistencia en sección "${section}":`);
      console.error(`   EN: ${enKeys} keys, ES: ${esKeys} keys, PT-BR: ${ptKeys} keys`);
      isConsistent = false;
    } else {
      console.log(`✅ ${section}: ${enKeys} keys (consistente en todos los idiomas)`);
    }
  }

  return isConsistent;
}

// Ejecutar validaciones
console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 VALIDACIÓN DE TRADUCCIONES DEL MÓDULO TEAM CHAT');
console.log('═══════════════════════════════════════════════════════════');

const languages = ['en', 'es', 'pt-BR'];
let allValid = true;

for (const lang of languages) {
  if (!validateTranslationStructure(lang)) {
    allValid = false;
  }
}

const isConsistent = validateConsistency();

console.log('\n═══════════════════════════════════════════════════════════');

if (allValid && isConsistent) {
  console.log('✅ VALIDACIÓN EXITOSA');
  console.log('   - Todas las estructuras son válidas');
  console.log('   - Consistencia entre idiomas verificada');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.log('❌ VALIDACIÓN FALLIDA');
  if (!allValid) {
    console.log('   - Hay errores en las estructuras');
  }
  if (!isConsistent) {
    console.log('   - Hay inconsistencias entre idiomas');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(1);
}
