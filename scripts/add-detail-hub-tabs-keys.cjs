/**
 * Add Detail Hub Tabs Translation Keys
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'public', 'translations');

const tabKeys = {
  en: {
    "detail_hub.tabs.overview": "Overview",
    "detail_hub.tabs.employees": "Employees",
    "detail_hub.tabs.timecards": "Timecards",
    "detail_hub.tabs.analytics": "Analytics",
    "detail_hub.tabs.reports": "Reports",
    "detail_hub.tabs.invoices": "Invoices",
    "detail_hub.tabs.kiosks": "Kiosks"
  },
  es: {
    "detail_hub.tabs.overview": "Resumen",
    "detail_hub.tabs.employees": "Empleados",
    "detail_hub.tabs.timecards": "Tarjetas de Tiempo",
    "detail_hub.tabs.analytics": "Análisis",
    "detail_hub.tabs.reports": "Reportes",
    "detail_hub.tabs.invoices": "Facturas",
    "detail_hub.tabs.kiosks": "Kioscos"
  },
  "pt-BR": {
    "detail_hub.tabs.overview": "Visão Geral",
    "detail_hub.tabs.employees": "Funcionários",
    "detail_hub.tabs.timecards": "Cartões de Ponto",
    "detail_hub.tabs.analytics": "Análise",
    "detail_hub.tabs.reports": "Relatórios",
    "detail_hub.tabs.invoices": "Faturas",
    "detail_hub.tabs.kiosks": "Quiosques"
  }
};

console.log('📑 Adding Detail Hub tabs translation keys...\n');

Object.keys(tabKeys).forEach(lang => {
  const fileName = lang === 'pt-BR' ? 'pt-BR.json' : `${lang}.json`;
  const filePath = path.join(TRANSLATIONS_DIR, fileName);

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Ensure detail_hub.tabs exists
    if (!content.detail_hub) content.detail_hub = {};
    if (!content.detail_hub.tabs) content.detail_hub.tabs = {};

    // Add all tab keys
    Object.entries(tabKeys[lang]).forEach(([fullKey, value]) => {
      const keyParts = fullKey.split('.');
      const tabKey = keyParts[keyParts.length - 1]; // "overview", "employees", etc.
      content.detail_hub.tabs[tabKey] = value;
    });

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✅ ${lang.toUpperCase()}: Added 7 tab keys`);

  } catch (error) {
    console.error(`❌ Error fixing ${lang}:`, error.message);
  }
});

console.log('\n✅ Tab translation keys added to all 3 languages!');
