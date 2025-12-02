#!/usr/bin/env node

/**
 * Post-implementation hook for automated testing and quality validation
 * Runs after code implementation to ensure quality standards
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
    const result = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

function validateDesignSystem(projectRoot) {
  console.log('🎨 Validating Notion-style design system compliance...');
  
  let violations = [];
  
  // Check for gradient usage
  const gradientResult = runCommand(
    'grep -r "linear-gradient\\|radial-gradient\\|conic-gradient" . --include="*.css" --include="*.scss" --include="*.less" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"',
    projectRoot
  );
  
  if (gradientResult.success && gradientResult.output.trim()) {
    violations.push('❌ DESIGN VIOLATION: Gradients found');
    console.log(gradientResult.output);
  }
  
  // Check for strong blue colors
  const blueResult = runCommand(
    'grep -r "#0066cc\\|#0099ff\\|#3366ff\\|blue-600\\|blue-700\\|blue-800\\|blue-900" . --include="*.css" --include="*.scss" --include="*.less" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"',
    projectRoot
  );
  
  if (blueResult.success && blueResult.output.trim()) {
    violations.push('❌ DESIGN VIOLATION: Strong blue colors found');
    console.log(blueResult.output);
  }
  
  // Check for bright saturated colors
  const brightColorResult = runCommand(
    'grep -r "rgb(255,\\|#ff[0-9a-f]\\|#[0-9a-f]ff\\|brightness(1\\.[5-9]\\|brightness([2-9]" . --include="*.css" --include="*.scss" --include="*.less"',
    projectRoot
  );
  
  if (brightColorResult.success && brightColorResult.output.trim()) {
    violations.push('⚠️ DESIGN WARNING: Potentially bright colors found');
    console.log(brightColorResult.output);
  }
  
  return violations;
}

function main() {
  const projectRoot = findProjectRoot();
  console.log(`🔍 Running post-implementation validation in: ${projectRoot}`);
  
  let allPassed = true;
  const results = {};
  
  // Check if it's a Node.js project
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('ℹ️ No package.json found - skipping Node.js validations');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  // 1. Run tests
  if (packageJson.scripts && packageJson.scripts.test) {
    console.log('🧪 Running tests...');
    const testResult = runCommand('npm test', projectRoot);
    results.tests = testResult.success;
    
    if (testResult.success) {
      console.log('✅ All tests passed');
    } else {
      console.log('❌ Tests failed');
      console.log(testResult.output);
      allPassed = false;
    }
  }
  
  // 2. Run linting
  if (packageJson.scripts && packageJson.scripts.lint) {
    console.log('🔧 Running linter...');
    const lintResult = runCommand('npm run lint', projectRoot);
    results.lint = lintResult.success;
    
    if (lintResult.success) {
      console.log('✅ Linting passed');
    } else {
      console.log('❌ Linting failed');
      console.log(lintResult.output);
      allPassed = false;
    }
  }
  
  // 3. TypeScript check
  if (packageJson.scripts && packageJson.scripts.typecheck) {
    console.log('🔍 Running TypeScript check...');
    const typecheckResult = runCommand('npm run typecheck', projectRoot);
    results.typecheck = typecheckResult.success;
    
    if (typecheckResult.success) {
      console.log('✅ TypeScript check passed');
    } else {
      console.log('❌ TypeScript check failed');
      console.log(typecheckResult.output);
      allPassed = false;
    }
  }
  
  // 4. Build check
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('🏗️ Testing build...');
    const buildResult = runCommand('npm run build', projectRoot);
    results.build = buildResult.success;
    
    if (buildResult.success) {
      console.log('✅ Build successful');
    } else {
      console.log('❌ Build failed');
      console.log(buildResult.output);
      allPassed = false;
    }
  }
  
  // 5. Design system validation for frontend projects
  if (packageJson.dependencies && 
      (packageJson.dependencies.react || packageJson.dependencies.vue || packageJson.dependencies.svelte)) {
    
    const violations = validateDesignSystem(projectRoot);
    results.designSystem = violations.length === 0;
    
    if (violations.length === 0) {
      console.log('✅ Design system compliance passed');
    } else {
      console.log('❌ Design system violations found:');
      violations.forEach(violation => console.log(violation));
      if (violations.some(v => v.includes('❌'))) {
        allPassed = false;
      }
    }
  }
  
  // 6. Security check (if available)
  if (packageJson.scripts && packageJson.scripts['security-check']) {
    console.log('🔒 Running security check...');
    const securityResult = runCommand('npm run security-check', projectRoot);
    results.security = securityResult.success;
    
    if (securityResult.success) {
      console.log('✅ Security check passed');
    } else {
      console.log('⚠️ Security issues found');
      console.log(securityResult.output);
    }
  }
  
  // Summary
  console.log('\n📊 POST-IMPLEMENTATION SUMMARY');
  console.log('================================');
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${check}`);
  });
  
  if (allPassed) {
    console.log('\n🎉 All quality checks passed! Implementation is ready.');
  } else {
    console.log('\n⚠️ Some quality checks failed. Please review and fix issues before deployment.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, findProjectRoot, runCommand, validateDesignSystem };