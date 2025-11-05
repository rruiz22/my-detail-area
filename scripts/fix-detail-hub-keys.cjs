/**
 * Fix Missing Detail Hub Translation Keys
 *
 * Adds "manage_employees" key to quick_actions section
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'public', 'translations');

const fixes = [
  {
    lang: 'en',
    file: 'en.json',
    path: ['detail_hub', 'dashboard', 'quick_actions', 'manage_employees'],
    value: 'Manage Employees'
  },
  {
    lang: 'es',
    file: 'es.json',
    path: ['detail_hub', 'dashboard', 'quick_actions', 'manage_employees'],
    value: 'Gestionar Empleados'
  },
  {
    lang: 'pt-BR',
    file: 'pt-BR.json',
    path: ['detail_hub', 'dashboard', 'quick_actions', 'manage_employees'],
    value: 'Gerenciar Funcionários'
  }
];

console.log('🔧 Fixing Detail Hub translation keys...\n');

fixes.forEach(({ lang, file, path: keyPath, value }) => {
  const filePath = path.join(TRANSLATIONS_DIR, file);

  try {
    // Read file
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Navigate to the nested key
    let current = content;
    for (let i = 0; i < keyPath.length - 1; i++) {
      if (!current[keyPath[i]]) {
        current[keyPath[i]] = {};
      }
      current = current[keyPath[i]];
    }

    // Set the value
    const lastKey = keyPath[keyPath.length - 1];
    current[lastKey] = value;

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✅ ${lang.toUpperCase()}: Added "${keyPath.join('.')}" = "${value}"`);

  } catch (error) {
    console.error(`❌ Error fixing ${lang}:`, error.message);
  }
});

console.log('\n✅ All missing keys have been added!');
console.log('Next: Rebuild the app to see changes');
