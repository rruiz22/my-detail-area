#!/usr/bin/env node

/**
 * Automated Validation and Commit System for Schema Changes
 * Validates TypeScript types, runs tests, and creates automated commits
 * Integrates with the hybrid schema monitoring system
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Auto Validation and Commit System
 */
class AutoValidationCommit {
  constructor(config = {}) {
    this.config = {
      enableAutoCommit: false,
      enableValidation: true,
      enableTests: true,
      enableTypeCheck: true,
      enableLinting: true,
      commitMessage: 'Auto-update: Database schema and types synchronized',
      gitBranch: 'main',
      createBackup: true,
      requireCleanWorkingDirectory: false,
      ...config
    }

    this.validationResults = {
      typeCheck: { passed: false, errors: [] },
      tests: { passed: false, errors: [] },
      lint: { passed: false, errors: [] },
      compilation: { passed: false, errors: [] },
      overall: false
    }

    this.commitInfo = {
      hash: null,
      message: null,
      files: [],
      timestamp: null
    }
  }

  /**
   * Main validation and commit workflow
   */
  async executeWorkflow(changes = {}) {
    console.log('🔍 Starting validation and commit workflow...')

    try {
      // 1. Pre-validation checks
      await this.preValidationChecks()

      // 2. Create backup if enabled
      if (this.config.createBackup) {
        await this.createWorkspaceBackup()
      }

      // 3. Run validation suite
      await this.runValidationSuite()

      // 4. Prepare commit if validation passed
      if (this.validationResults.overall && this.config.enableAutoCommit) {
        await this.prepareAndCommit(changes)
      }

      // 5. Generate report
      const report = this.generateValidationReport()
      
      console.log('✅ Validation workflow completed')
      return report

    } catch (error) {
      console.error('❌ Validation workflow failed:', error.message)
      throw error
    }
  }

  /**
   * Pre-validation checks
   */
  async preValidationChecks() {
    console.log('🔍 Running pre-validation checks...')

    // Check if required files exist
    const requiredFiles = [
      'src/types/database.ts',
      'package.json',
      'tsconfig.json'
    ]

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file)
      try {
        await fs.access(filePath)
      } catch (error) {
        throw new Error(`Required file missing: ${file}`)
      }
    }

    // Check git status if auto-commit is enabled
    if (this.config.enableAutoCommit && this.config.requireCleanWorkingDirectory) {
      const { stdout } = await execAsync('git status --porcelain')
      if (stdout.trim()) {
        throw new Error('Working directory not clean. Please commit or stash changes first.')
      }
    }

    console.log('✅ Pre-validation checks passed')
  }

  /**
   * Run comprehensive validation suite
   */
  async runValidationSuite() {
    console.log('🧪 Running validation suite...')

    const validations = []

    // TypeScript type checking
    if (this.config.enableTypeCheck) {
      validations.push(this.runTypeCheck())
    }

    // Unit tests
    if (this.config.enableTests) {
      validations.push(this.runTests())
    }

    // Linting
    if (this.config.enableLinting) {
      validations.push(this.runLinting())
    }

    // Build/compilation check
    validations.push(this.runCompilationCheck())

    // Run all validations in parallel
    const results = await Promise.allSettled(validations)
    
    // Process results
    let overallSuccess = true
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        overallSuccess = false
        console.error(`Validation ${index + 1} failed:`, result.reason)
      }
    })

    this.validationResults.overall = overallSuccess
    
    if (overallSuccess) {
      console.log('✅ All validations passed')
    } else {
      console.log('❌ Some validations failed')
    }
  }

  /**
   * Run TypeScript type checking
   */
  async runTypeCheck() {
    console.log('🔧 Running TypeScript type check...')
    
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit --skipLibCheck')
      
      this.validationResults.typeCheck = {
        passed: true,
        errors: [],
        output: stdout
      }
      
      console.log('✅ TypeScript type check passed')
    } catch (error) {
      this.validationResults.typeCheck = {
        passed: false,
        errors: [error.message],
        output: error.stdout || error.stderr
      }
      
      console.error('❌ TypeScript type check failed:', error.message)
      throw error
    }
  }

  /**
   * Run unit tests
   */
  async runTests() {
    console.log('🧪 Running unit tests...')
    
    try {
      // Try different test commands based on what's available
      let testCommand = 'npm test'
      
      // Check if vitest is available
      try {
        await execAsync('npx vitest --version')
        testCommand = 'npx vitest run'
      } catch {
        // Fall back to npm test
      }

      const { stdout, stderr } = await execAsync(testCommand, {
        timeout: 60000 // 1 minute timeout
      })
      
      this.validationResults.tests = {
        passed: true,
        errors: [],
        output: stdout
      }
      
      console.log('✅ Unit tests passed')
    } catch (error) {
      this.validationResults.tests = {
        passed: false,
        errors: [error.message],
        output: error.stdout || error.stderr
      }
      
      console.error('❌ Unit tests failed:', error.message)
      throw error
    }
  }

  /**
   * Run linting
   */
  async runLinting() {
    console.log('🔍 Running linting checks...')
    
    try {
      const { stdout, stderr } = await execAsync('npm run lint')
      
      this.validationResults.lint = {
        passed: true,
        errors: [],
        output: stdout
      }
      
      console.log('✅ Linting passed')
    } catch (error) {
      // ESLint might exit with code 1 even for warnings
      const isWarningsOnly = error.code === 1 && !error.stderr
      
      if (isWarningsOnly) {
        this.validationResults.lint = {
          passed: true,
          errors: [],
          warnings: [error.stdout],
          output: error.stdout
        }
        console.log('⚠️ Linting passed with warnings')
      } else {
        this.validationResults.lint = {
          passed: false,
          errors: [error.message],
          output: error.stdout || error.stderr
        }
        
        console.error('❌ Linting failed:', error.message)
        throw error
      }
    }
  }

  /**
   * Run compilation check
   */
  async runCompilationCheck() {
    console.log('🔨 Running compilation check...')
    
    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        timeout: 120000 // 2 minute timeout
      })
      
      this.validationResults.compilation = {
        passed: true,
        errors: [],
        output: stdout
      }
      
      console.log('✅ Compilation check passed')
    } catch (error) {
      this.validationResults.compilation = {
        passed: false,
        errors: [error.message],
        output: error.stdout || error.stderr
      }
      
      console.error('❌ Compilation check failed:', error.message)
      throw error
    }
  }

  /**
   * Create workspace backup
   */
  async createWorkspaceBackup() {
    console.log('💾 Creating workspace backup...')
    
    try {
      const backupDir = path.join(__dirname, '../backups/workspace')
      await fs.mkdir(backupDir, { recursive: true })
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `workspace-${timestamp}`)
      
      // Create backup of critical files
      const filesToBackup = [
        'src/types/database.ts',
        'src/utils/database.ts',
        'package.json',
        'tsconfig.json'
      ]
      
      await fs.mkdir(backupPath, { recursive: true })
      
      for (const file of filesToBackup) {
        const sourcePath = path.join(__dirname, '..', file)
        const destPath = path.join(backupPath, file.replace(/\//g, '_'))
        
        try {
          await fs.copyFile(sourcePath, destPath)
        } catch (error) {
          console.warn(`⚠️ Could not backup ${file}:`, error.message)
        }
      }
      
      console.log(`✅ Workspace backed up to ${backupPath}`)
    } catch (error) {
      console.error('❌ Workspace backup failed:', error.message)
      // Don't throw - backup failure shouldn't stop the workflow
    }
  }

  /**
   * Prepare and create commit
   */
  async prepareAndCommit(changes = {}) {
    console.log('📝 Preparing automated commit...')
    
    try {
      // Check what files have changed
      const { stdout: statusOutput } = await execAsync('git status --porcelain')
      const changedFiles = statusOutput
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3))
      
      if (changedFiles.length === 0) {
        console.log('ℹ️ No changes to commit')
        return null
      }
      
      // Add changed files
      for (const file of changedFiles) {
        if (this.shouldCommitFile(file)) {
          await execAsync(`git add "${file}"`)
        }
      }
      
      // Create commit message
      const commitMessage = this.generateCommitMessage(changes, changedFiles)
      
      // Create commit
      await execAsync(`git commit -m "${commitMessage}"`)
      
      // Get commit info
      const { stdout: commitHash } = await execAsync('git rev-parse HEAD')
      
      this.commitInfo = {
        hash: commitHash.trim(),
        message: commitMessage,
        files: changedFiles,
        timestamp: new Date().toISOString()
      }
      
      console.log(`✅ Commit created: ${this.commitInfo.hash.substring(0, 8)}`)
      console.log(`📝 Message: ${commitMessage}`)
      
      return this.commitInfo
      
    } catch (error) {
      console.error('❌ Commit creation failed:', error.message)
      throw error
    }
  }

  /**
   * Check if file should be committed automatically
   */
  shouldCommitFile(file) {
    const autoCommitPatterns = [
      'src/types/database.ts',
      'src/types/database-generated.ts',
      'docs/database-schema.md',
      'logs/notifications/',
      'backups/schema-versions/'
    ]
    
    const ignorePatterns = [
      'node_modules/',
      '.DS_Store',
      '*.log',
      'temp-',
      '.env'
    ]
    
    // Check ignore patterns first
    for (const pattern of ignorePatterns) {
      if (file.includes(pattern)) {
        return false
      }
    }
    
    // Check auto-commit patterns
    for (const pattern of autoCommitPatterns) {
      if (file.includes(pattern)) {
        return true
      }
    }
    
    return false
  }

  /**
   * Generate commit message based on changes
   */
  generateCommitMessage(changes, files) {
    let message = this.config.commitMessage
    
    const details = []
    
    if (changes.newTables && changes.newTables.length > 0) {
      details.push(`New tables: ${changes.newTables.join(', ')}`)
    }
    
    if (changes.newColumns && changes.newColumns.length > 0) {
      details.push(`New columns: ${changes.newColumns.length}`)
    }
    
    if (changes.modifiedTables && changes.modifiedTables.length > 0) {
      details.push(`Modified tables: ${changes.modifiedTables.join(', ')}`)
    }
    
    if (files.some(f => f.includes('database.ts'))) {
      details.push('TypeScript types updated')
    }
    
    if (files.some(f => f.includes('schema'))) {
      details.push('Schema documentation updated')
    }
    
    if (details.length > 0) {
      message += `\\n\\n- ${details.join('\\n- ')}`
    }
    
    message += `\\n\\n🤖 Generated by Schema Monitor`
    message += `\\nValidation: ${this.validationResults.overall ? 'Passed' : 'Failed'}`
    message += `\\nTimestamp: ${new Date().toISOString()}`
    
    return message
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: this.validationResults.overall,
      validations: this.validationResults,
      commit: this.commitInfo,
      summary: this.generateSummary()
    }
    
    return report
  }

  /**
   * Generate summary text
   */
  generateSummary() {
    const parts = []
    
    // Validation summary
    const validationCount = Object.keys(this.validationResults).filter(key => key !== 'overall').length
    const passedCount = Object.values(this.validationResults).filter(v => v && v.passed).length
    
    parts.push(`Validation: ${passedCount}/${validationCount} checks passed`)
    
    // Commit summary
    if (this.commitInfo.hash) {
      parts.push(`Commit: ${this.commitInfo.hash.substring(0, 8)} (${this.commitInfo.files.length} files)`)
    } else if (this.config.enableAutoCommit) {
      parts.push('Commit: Skipped (no changes or validation failed)')
    } else {
      parts.push('Commit: Disabled')
    }
    
    // Overall status
    parts.push(`Status: ${this.validationResults.overall ? 'SUCCESS' : 'FAILED'}`)
    
    return parts.join(' | ')
  }

  /**
   * Save validation report to file
   */
  async saveReport(report) {
    try {
      const reportsDir = path.join(__dirname, '../logs/validation')
      await fs.mkdir(reportsDir, { recursive: true })
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const reportFile = path.join(reportsDir, `validation-${timestamp}.json`)
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2))
      
      // Also append to history file
      const historyFile = path.join(reportsDir, 'history.jsonl')
      const historyLine = JSON.stringify({
        timestamp: report.timestamp,
        overall: report.overall,
        summary: report.summary,
        commit: report.commit?.hash || null
      }) + '\\n'
      
      await fs.appendFile(historyFile, historyLine)
      
      console.log(`📄 Validation report saved to ${reportFile}`)
    } catch (error) {
      console.error('❌ Failed to save validation report:', error.message)
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  // Load configuration
  const configPath = path.join(__dirname, '../supabase/monitor-config.json')
  let config = {}
  
  try {
    const configData = await fs.readFile(configPath, 'utf8')
    const fullConfig = JSON.parse(configData)
    config = fullConfig.validation || {}
  } catch (error) {
    console.log('Using default validation configuration')
  }

  const validator = new AutoValidationCommit(config)
  
  const command = process.argv[2] || 'validate'
  
  switch (command) {
    case 'validate':
      try {
        const report = await validator.executeWorkflow()
        await validator.saveReport(report)
        
        console.log('\\n📊 Validation Report:')
        console.log(`Overall: ${report.overall ? '✅ PASSED' : '❌ FAILED'}`)
        console.log(`Summary: ${report.summary}`)
        
        if (!report.overall) {
          process.exit(1)
        }
      } catch (error) {
        console.error('💥 Validation failed:', error.message)
        process.exit(1)
      }
      break
      
    case 'commit':
      config.enableAutoCommit = true
      const validator2 = new AutoValidationCommit(config)
      
      try {
        const changes = JSON.parse(process.argv[3] || '{}')
        const report = await validator2.executeWorkflow(changes)
        await validator2.saveReport(report)
        
        console.log('\\n📊 Validation & Commit Report:')
        console.log(`Overall: ${report.overall ? '✅ PASSED' : '❌ FAILED'}`)
        console.log(`Summary: ${report.summary}`)
        
        if (report.commit) {
          console.log(`Commit: ${report.commit.hash.substring(0, 8)}`)
        }
        
      } catch (error) {
        console.error('💥 Validation & commit failed:', error.message)
        process.exit(1)
      }
      break
      
    default:
      console.log('Available commands: validate, commit')
  }
}

export default AutoValidationCommit