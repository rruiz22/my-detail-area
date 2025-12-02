#!/usr/bin/env node

/**
 * Git pre-commit hook for design system and quality validation
 * Prevents commits that violate Notion design guidelines
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  try {
    return execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

function getStagedFiles() {
  const stagedFiles = runCommand('git diff --cached --name-only');
  return stagedFiles ? stagedFiles.trim().split('\n').filter(Boolean) : [];
}

function checkFileForViolations(filePath) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];
  const lines = content.split('\n');
  
  // Check for gradients
  lines.forEach((line, index) => {
    if (/linear-gradient\(|radial-gradient\(|conic-gradient\(/i.test(line)) {
      violations.push({
        type: 'DESIGN_VIOLATION',
        file: filePath,
        line: index + 1,
        message: 'Gradients are forbidden in Notion design system',
        pattern: line.trim()
      });
    }
  });
  
  // Check for strong blues
  lines.forEach((line, index) => {
    if (/#0066cc|#0099ff|#3366ff|blue-600|blue-700|blue-800|blue-900/i.test(line)) {
      violations.push({
        type: 'DESIGN_VIOLATION',
        file: filePath,
        line: index + 1,
        message: 'Strong blue colors are forbidden in Notion design system',
        pattern: line.trim()
      });
    }
  });
  
  // Check for bright saturated colors (less strict, warning only)
  lines.forEach((line, index) => {
    if (/rgb\(255,|#ff[0-9a-f]|#[0-9a-f]ff|brightness\(1\.[5-9]|brightness\([2-9]/i.test(line)) {
      violations.push({
        type: 'DESIGN_WARNING',
        file: filePath,
        line: index + 1,
        message: 'Potentially bright color detected - ensure it matches Notion style',
        pattern: line.trim()
      });
    }
  });
  
  return violations;
}

function main() {
  console.log('🎨 Checking staged files for design system compliance...');
  
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log('ℹ️ No staged files to check');
    return 0;
  }
  
  // Filter files that we care about for design system checks
  const relevantFiles = stagedFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.css', '.scss', '.less', '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext);
  });
  
  if (relevantFiles.length === 0) {
    console.log('ℹ️ No relevant files for design system check');
    return 0;
  }
  
  console.log(`Checking ${relevantFiles.length} files...`);
  
  let hasViolations = false;
  let hasWarnings = false;
  
  for (const file of relevantFiles) {
    const violations = checkFileForViolations(file);
    
    for (const violation of violations) {
      if (violation.type === 'DESIGN_VIOLATION') {
        hasViolations = true;
        console.log(`❌ ${violation.file}:${violation.line}`);
        console.log(`   ${violation.message}`);
        console.log(`   Pattern: ${violation.pattern}`);
        console.log();
      } else if (violation.type === 'DESIGN_WARNING') {
        hasWarnings = true;
        console.log(`⚠️  ${violation.file}:${violation.line}`);
        console.log(`   ${violation.message}`);
        console.log(`   Pattern: ${violation.pattern}`);
        console.log();
      }
    }
  }
  
  // Run additional checks if this is a Node.js project
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    
    // Run linting if available
    if (packageJson.scripts && packageJson.scripts.lint) {
      console.log('🔧 Running linter on staged files...');
      const lintResult = runCommand('npm run lint');
      if (!lintResult) {
        console.log('❌ Linting failed - fix issues before committing');
        hasViolations = true;
      } else {
        console.log('✅ Linting passed');
      }
    }
    
    // Run TypeScript check if available
    if (packageJson.scripts && packageJson.scripts.typecheck) {
      console.log('🔍 Running TypeScript check...');
      const typecheckResult = runCommand('npm run typecheck');
      if (!typecheckResult) {
        console.log('❌ TypeScript check failed - fix types before committing');
        hasViolations = true;
      } else {
        console.log('✅ TypeScript check passed');
      }
    }
  }
  
  // Summary
  if (hasViolations) {
    console.log('\n❌ COMMIT BLOCKED');
    console.log('Design system violations or code quality issues found.');
    console.log('Please fix the issues above before committing.');
    console.log('\nReminder: Notion design system rules:');
    console.log('- NO gradients: linear-gradient(), radial-gradient(), conic-gradient()');
    console.log('- NO strong blues: #0066cc, #0099ff, #3366ff, blue-600+');
    console.log('- USE gray-based palette with muted accents only');
    return 1;
  }
  
  if (hasWarnings) {
    console.log('\n⚠️  Warnings found - please review');
    console.log('Consider if these patterns match the Notion design system');
  } else {
    console.log('\n✅ All design system checks passed');
  }
  
  console.log('🚀 Commit approved');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { main, getStagedFiles, checkFileForViolations };