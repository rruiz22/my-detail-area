#!/usr/bin/env node

/**
 * Validate Spanish Translation Files
 *
 * Detects:
 * - Portuguese words in Spanish files
 * - Encoding issues (Ã, â, etc.)
 * - Missing translations (English text)
 * - Inconsistent terminology
 *
 * Usage: node scripts/validate-spanish-translations.mjs [file-path]
 *        node scripts/validate-spanish-translations.mjs --all
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Portuguese-specific words that shouldn't be in Spanish
const PORTUGUESE_WORDS = [
  'usuário', 'usuários',
  'informações', 'configurações',
  'não', 'sim',
  'serviço', 'serviços',
  'concluído', 'concluída',
  'atribuído', 'atribuída',
  'veículo', 'veículos',
  'concessionária', 'concessionárias',
  'endereço',
  'último', 'última',
  'descrição',
  'função', 'funções',
  'ação', 'ações',
  'opção', 'opções',
  'permissão', 'permissões',
  'atualização', 'atualizações',
  'verificação',
  'substituição',
  'incluído', 'incluída',
  'excluído', 'excluída',
  'histórico',
  'análise',
  'mensagem', 'mensagens',
  'pedido', 'pedidos',  // In dealership context should be "orden"
  'Bem-vindo', 'Bem-vinda',
  'aguarde',
  'certeza',
  'Sucesso',
  'Atenção',
  'Nenhum',
  'Buscar', 'Pesquisar',  // Should be "Buscar" in Spanish
  'Ativo', 'Inativo',
  'Pendente',
  'Concluído',
  'Próximo',
  'Primeira', 'Última',
  'até',
  'Detalhes',
  'Visualizar',
  'Novo', 'Nova',
  'Deletar',
  'Salvar',
  'Fechar',
  'Voltar',
  'Obrigatório',
  'Painel',
  'Cabeçalho', 'Rodapé',
  'Botão',
  'Tabela',
  'Formulário',
  'Etiqueta',
  'Diálogo',
  'Notificação',
  'Alerta',
  'Ícone',
  'Imagem',
  'Arquivo',
  'hoje', 'ontem', 'amanhã',
  'agora',
  'mês', 'meses',
  'ano', 'anos',
  'estoque',
  'manutenção',
  'revisão',
  'reparo',
  'peça', 'peças'
];

// Encoding issue patterns
const ENCODING_PATTERNS = [
  /Ã[aáeéiíoóuúcçñ]/g,  // Corrupted accents
  /â‰[¤¥ ]/g,            // Corrupted math symbols
  /â€[""'—–]/g,          // Corrupted quotes/dashes
  /Â[°·«»]/g             // Corrupted symbols
];

// Stats
const stats = {
  filesChecked: 0,
  filesWithIssues: 0,
  totalIssues: 0,
  issuesByType: {
    encoding: 0,
    portuguese: 0,
    english: 0
  },
  fileIssues: []
};

/**
 * Check for encoding issues
 */
function checkEncoding(content, fileName) {
  const issues = [];

  for (const pattern of ENCODING_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'encoding',
        count: matches.length,
        examples: [...new Set(matches)].slice(0, 5)
      });
      stats.issuesByType.encoding += matches.length;
    }
  }

  return issues;
}

/**
 * Check for Portuguese words
 */
function checkPortuguese(content, fileName) {
  const issues = [];
  const foundWords = new Set();

  for (const word of PORTUGUESE_WORDS) {
    // Create regex with word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex);

    if (matches) {
      foundWords.add(word);
    }
  }

  if (foundWords.size > 0) {
    issues.push({
      type: 'portuguese',
      count: foundWords.size,
      words: Array.from(foundWords).slice(0, 10)
    });
    stats.issuesByType.portuguese += foundWords.size;
  }

  return issues;
}

/**
 * Check for untranslated English
 */
function checkEnglish(content, fileName) {
  const issues = [];

  // Simple heuristic: if file has many English-only keys
  // (This is a simplified check - could be improved)
  const jsonContent = JSON.parse(content);
  const values = JSON.stringify(jsonContent);

  // Common English words that shouldn't be in Spanish translations
  const englishWords = [
    'Loading...', 'Error:', 'Success:',
    'Access Denied', 'Not Found',
    'Please wait', 'Are you sure',
    'Search', 'Filter', 'Sort',
    'Previous', 'Next', 'First', 'Last',
    'New', 'Edit', 'Delete', 'Save', 'Cancel',
    'Details', 'View', 'Actions',
    'Settings', 'Profile', 'Logout'
  ];

  const foundEnglish = [];
  for (const phrase of englishWords) {
    if (values.includes(`"${phrase}"`)) {
      foundEnglish.push(phrase);
    }
  }

  if (foundEnglish.length > 5) {
    issues.push({
      type: 'english',
      count: foundEnglish.length,
      examples: foundEnglish.slice(0, 5)
    });
    stats.issuesByType.english += foundEnglish.length;
  }

  return issues;
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  console.log(`\nChecking: ${filePath}`);

  try {
    const content = readFileSync(filePath, 'utf8');

    // Validate JSON
    try {
      JSON.parse(content);
    } catch (e) {
      console.log(`  ❌ Invalid JSON: ${e.message}`);
      stats.filesWithIssues++;
      return;
    }

    stats.filesChecked++;

    const issues = [
      ...checkEncoding(content, filePath),
      ...checkPortuguese(content, filePath),
      ...checkEnglish(content, filePath)
    ];

    if (issues.length > 0) {
      stats.filesWithIssues++;
      stats.fileIssues.push({ file: filePath, issues });

      console.log(`  ⚠️  Found ${issues.length} issue type(s):`);

      for (const issue of issues) {
        if (issue.type === 'encoding') {
          console.log(`     🔤 Encoding errors: ${issue.count} instances`);
          console.log(`        Examples: ${issue.examples.join(', ')}`);
        } else if (issue.type === 'portuguese') {
          console.log(`     🇵🇹 Portuguese words: ${issue.count} unique words`);
          console.log(`        Examples: ${issue.words.join(', ')}`);
        } else if (issue.type === 'english') {
          console.log(`     🇬🇧 English text: ${issue.count} phrases`);
          console.log(`        Examples: ${issue.examples.join(', ')}`);
        }
      }

      stats.totalIssues += issues.reduce((sum, i) => sum + i.count, 0);
    } else {
      console.log(`  ✅ No issues found`);
    }

  } catch (error) {
    console.error(`  ❌ Error reading file: ${error.message}`);
  }
}

/**
 * Get all Spanish translation files
 */
function getAllSpanishFiles() {
  const translationsDir = 'public/translations/es';
  const files = [];

  try {
    const entries = readdirSync(translationsDir);

    for (const entry of entries) {
      const fullPath = join(translationsDir, entry);
      const stat = statSync(fullPath);

      if (stat.isFile() && entry.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory: ${error.message}`);
  }

  return files.sort();
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  console.log('🔍 Spanish Translation Validator');
  console.log('='.repeat(60));

  if (args.length === 0 || args[0] === '--help') {
    console.log('\nUsage:');
    console.log('  node scripts/validate-spanish-translations.mjs <file-path>');
    console.log('  node scripts/validate-spanish-translations.mjs --all');
    console.log('\nExamples:');
    console.log('  node scripts/validate-spanish-translations.mjs public/translations/es/common.json');
    console.log('  node scripts/validate-spanish-translations.mjs --all');
    process.exit(0);
  }

  let filesToCheck = [];

  if (args[0] === '--all') {
    filesToCheck = getAllSpanishFiles();
    console.log(`\nFound ${filesToCheck.length} Spanish translation files\n`);
  } else {
    filesToCheck = [args[0]];
  }

  // Validate each file
  for (const file of filesToCheck) {
    validateFile(file);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files checked: ${stats.filesChecked}`);
  console.log(`Files with issues: ${stats.filesWithIssues}`);
  console.log(`Total issues found: ${stats.totalIssues}`);
  console.log('\nIssues by type:');
  console.log(`  🔤 Encoding errors: ${stats.issuesByType.encoding}`);
  console.log(`  🇵🇹 Portuguese words: ${stats.issuesByType.portuguese}`);
  console.log(`  🇬🇧 English text: ${stats.issuesByType.english}`);

  if (stats.filesWithIssues > 0) {
    console.log('\n⚠️  Files needing correction:');
    const sorted = stats.fileIssues.sort((a, b) => {
      const sumA = a.issues.reduce((s, i) => s + i.count, 0);
      const sumB = b.issues.reduce((s, i) => s + i.count, 0);
      return sumB - sumA;
    });

    sorted.slice(0, 10).forEach((item, idx) => {
      const totalIssues = item.issues.reduce((s, i) => s + i.count, 0);
      console.log(`  ${idx + 1}. ${item.file} (${totalIssues} issues)`);
    });

    if (sorted.length > 10) {
      console.log(`  ... and ${sorted.length - 10} more files`);
    }
  } else {
    console.log('\n✅ All files are valid!');
  }

  console.log('\n' + '='.repeat(60));
}

main();
