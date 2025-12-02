#!/usr/bin/env node

/**
 * Pre-implementation hook for automated testing and quality assurance
 * Runs before any code implementation to ensure proper setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findProjectRoot(startDir = process.cwd()) {
  let currentDir = startDir;
  
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'package.json')) ||
        fs.existsSync(path.join(currentDir, 'tsconfig.json')) ||
        fs.existsSync(path.join(currentDir, '.git'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return startDir;
}

function runCommand(command, cwd) {
  try {
    return execSync(command, { cwd, encoding: 'utf-8' });
  } catch (error) {
    return null;
  }
}

function main() {
  const projectRoot = findProjectRoot();
  console.log(`🔍 Checking project setup in: ${projectRoot}`);
  
  // Check if it's a Node.js project
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('ℹ️ No package.json found - skipping Node.js checks');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  // Check for test scripts
  if (packageJson.scripts && packageJson.scripts.test) {
    console.log('✅ Test script found in package.json');
    
    // Run tests if they exist
    const testResult = runCommand('npm test', projectRoot);
    if (testResult) {
      console.log('✅ Tests passed');
    } else {
      console.log('⚠️ Tests failed or no tests found');
    }
  }
  
  // Check for linting
  if (packageJson.scripts && packageJson.scripts.lint) {
    console.log('🔧 Running linter...');
    const lintResult = runCommand('npm run lint', projectRoot);
    if (lintResult) {
      console.log('✅ Linting passed');
    } else {
      console.log('⚠️ Linting issues found');
    }
  }
  
  // Check for TypeScript
  if (packageJson.scripts && packageJson.scripts.typecheck) {
    console.log('🔍 Running TypeScript check...');
    const typecheckResult = runCommand('npm run typecheck', projectRoot);
    if (typecheckResult) {
      console.log('✅ TypeScript check passed');
    } else {
      console.log('⚠️ TypeScript issues found');
    }
  }
  
  // Design system validation for frontend projects
  if (packageJson.dependencies && 
      (packageJson.dependencies.react || packageJson.dependencies.vue || packageJson.dependencies.svelte)) {
    
    console.log('🎨 Checking for forbidden design patterns...');
    
    // Check for gradient usage in CSS files
    const cssFiles = runCommand('find . -name "*.css" -o -name "*.scss" -o -name "*.less"', projectRoot);
    if (cssFiles) {
      const gradientCheck = runCommand('grep -r "gradient(" . --include="*.css" --include="*.scss" --include="*.less"', projectRoot);
      if (gradientCheck) {
        console.log('❌ DESIGN VIOLATION: Gradients found in CSS files');
        console.log('Forbidden patterns: linear-gradient(), radial-gradient(), conic-gradient()');
      }
    }
    
    // Check for strong blue colors
    const strongBlueCheck = runCommand('grep -r "#0066cc\\|#0099ff\\|#3366ff" . --include="*.css" --include="*.scss" --include="*.less" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"', projectRoot);
    if (strongBlueCheck) {
      console.log('❌ DESIGN VIOLATION: Strong blue colors found');
      console.log('Forbidden colors: #0066cc, #0099ff, #3366ff');
    }
  }
  
  console.log('🚀 Pre-implementation checks completed');
}

if (require.main === module) {
  main();
}

module.exports = { main, findProjectRoot, runCommand };