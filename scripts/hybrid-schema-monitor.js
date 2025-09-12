#!/usr/bin/env node

/**
 * Hybrid Schema Monitor for My Detail Area
 * Combines Docker CLI advanced features with JavaScript fallback
 * Provides real-time monitoring, notifications, and automation
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load configuration
const configPath = path.join(__dirname, '../supabase/monitor-config.json')
let config = {}
try {
  const configData = await fs.readFile(configPath, 'utf8')
  config = JSON.parse(configData)
} catch (error) {
  console.error('❌ Failed to load config:', error.message)
  process.exit(1)
}

// Initialize Supabase client for fallback mode
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || config.project?.url || 'https://swfnnrpzpkdypbrzmgnr.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || config.project?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY'
)

// State management
let isMonitoring = false
let lastSchemaHash = config.lastSchemaHash
let monitoringInterval = null

/**
 * Main Schema Monitor Class
 */
class HybridSchemaMonitor {
  constructor() {
    this.config = config
    this.dockerAvailable = false
    this.fallbackMode = false
    this.notificationSystem = null
    this.dashboard = null
  }

  /**
   * Initialize the monitor system
   */
  async initialize() {
    console.log('🔄 Initializing Hybrid Schema Monitor...')
    
    // Check Docker availability
    await this.checkDockerStatus()
    
    // Initialize notification system
    await this.initializeNotificationSystem()
    
    // Initialize dashboard if enabled
    if (this.config.dashboard.enabled) {
      await this.initializeDashboard()
    }
    
    // Start monitoring
    await this.startMonitoring()
    
    console.log('✅ Hybrid Schema Monitor initialized successfully!')
  }

  /**
   * Check if Docker and Supabase CLI are available
   */
  async checkDockerStatus() {
    try {
      console.log('🐳 Checking Docker availability...')
      await execAsync('docker --version')
      await execAsync('supabase --version')
      
      // Test Supabase CLI with our project
      const { stdout } = await execAsync('supabase status')
      
      if (stdout.includes('RUNNING') || stdout.includes('swfnnrpzpkdypbrzmgnr')) {
        this.dockerAvailable = true
        console.log('✅ Docker and Supabase CLI available - Using advanced features')
      } else {
        throw new Error('Supabase not properly linked')
      }
    } catch (error) {
      console.log('⚠️ Docker/CLI not fully available - Using fallback mode')
      console.log(`   Error: ${error.message}`)
      this.dockerAvailable = false
      this.fallbackMode = true
    }
  }

  /**
   * Start the monitoring process
   */
  async startMonitoring() {
    if (isMonitoring) {
      console.log('⚠️ Monitor already running')
      return
    }

    isMonitoring = true
    console.log(`🕐 Starting schema monitoring (${this.config.monitoring.intervalDescription})`)

    // Initial scan
    await this.performSchemaCheck()

    // Set up interval monitoring
    monitoringInterval = setInterval(async () => {
      try {
        await this.performSchemaCheck()
      } catch (error) {
        console.error('❌ Error during scheduled schema check:', error.message)
        await this.sendNotification({
          type: 'error',
          message: `Schema monitoring error: ${error.message}`,
          data: { error: error.message, timestamp: new Date().toISOString() }
        })
      }
    }, this.config.monitoring.interval)

    console.log('✅ Schema monitoring started')
  }

  /**
   * Perform schema check using available method
   */
  async performSchemaCheck() {
    console.log('🔍 Performing schema check...')

    let schemaInfo = null
    let changesDetected = false

    try {
      if (this.dockerAvailable) {
        schemaInfo = await this.getSchemaWithDocker()
      } else {
        schemaInfo = await this.getSchemaWithFallback()
      }

      // Calculate schema hash
      const currentHash = this.calculateSchemaHash(schemaInfo)

      // Check for changes
      if (lastSchemaHash && lastSchemaHash !== currentHash) {
        changesDetected = true
        console.log('🚨 Schema changes detected!')
        
        // Get detailed changes
        const changes = await this.detectChanges(schemaInfo)
        
        // Handle the changes
        await this.handleSchemaChanges(changes, schemaInfo)
      } else if (!lastSchemaHash) {
        console.log('📊 Initial schema capture completed')
      } else {
        console.log('✅ No schema changes detected')
      }

      // Update stored hash and config
      lastSchemaHash = currentHash
      await this.updateConfig({ lastSchemaHash: currentHash, lastSync: new Date().toISOString() })

    } catch (error) {
      console.error('❌ Schema check failed:', error.message)
      throw error
    }
  }

  /**
   * Get schema using Docker CLI (advanced method)
   */
  async getSchemaWithDocker() {
    console.log('🐳 Using Docker CLI for schema detection')

    try {
      // Get schema diff
      const { stdout: diffOutput } = await execAsync('supabase db diff')
      
      // Get current schema via db pull (to temp location to avoid conflicts)
      await execAsync('supabase db pull --schema-only')
      
      // Read migration files to understand current state
      const migrationsDir = path.join(__dirname, '../supabase/migrations')
      const migrationFiles = await fs.readdir(migrationsDir)
      const latestMigration = migrationFiles
        .filter(f => f.endsWith('.sql'))
        .sort()
        .pop()

      let latestMigrationContent = ''
      if (latestMigration) {
        latestMigrationContent = await fs.readFile(
          path.join(migrationsDir, latestMigration), 
          'utf8'
        )
      }

      return {
        method: 'docker',
        diff: diffOutput,
        latestMigration,
        latestMigrationContent,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Docker method failed, falling back:', error.message)
      return await this.getSchemaWithFallback()
    }
  }

  /**
   * Get schema using JavaScript client (fallback method)
   */
  async getSchemaWithFallback() {
    console.log('📡 Using JavaScript client for schema detection')

    try {
      // Query information_schema for table structure
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_info') // Custom function we'll need to create
        .catch(async () => {
          // Fallback: try direct query (limited by RLS)
          return { data: null, error: { message: 'Direct schema access limited by RLS' } }
        })

      // Read local migration files for comparison
      const migrationsDir = path.join(__dirname, '../supabase/migrations')
      const migrationFiles = await fs.readdir(migrationsDir)
      const totalMigrations = migrationFiles.filter(f => f.endsWith('.sql')).length

      return {
        method: 'fallback',
        tables: tables || [],
        migrationCount: totalMigrations,
        error: tablesError?.message,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Fallback method failed:', error.message)
      throw error
    }
  }

  /**
   * Detect specific changes between schema versions
   */
  async detectChanges(currentSchema) {
    // Load previous schema if exists
    const schemaBackupDir = path.join(__dirname, '../backups/schema-versions')
    await fs.mkdir(schemaBackupDir, { recursive: true })

    const changes = {
      newTables: [],
      modifiedTables: [],
      newColumns: [],
      modifiedColumns: [],
      newIndexes: [],
      newFunctions: [],
      summary: ''
    }

    try {
      const backupFiles = await fs.readdir(schemaBackupDir)
      if (backupFiles.length === 0) {
        changes.summary = 'Initial schema capture - no changes detected'
        return changes
      }

      // Compare with most recent backup
      const latestBackup = backupFiles.sort().pop()
      const previousSchema = JSON.parse(
        await fs.readFile(path.join(schemaBackupDir, latestBackup), 'utf8')
      )

      // Detailed comparison logic here
      if (currentSchema.method === 'docker' && currentSchema.diff) {
        changes.summary = currentSchema.diff
        // Parse diff output for specific changes
        this.parseDiffOutput(currentSchema.diff, changes)
      } else {
        changes.summary = 'Fallback mode - limited change detection'
      }

    } catch (error) {
      changes.summary = `Change detection error: ${error.message}`
    }

    return changes
  }

  /**
   * Parse Docker diff output for specific changes
   */
  parseDiffOutput(diffOutput, changes) {
    const lines = diffOutput.split('\n')
    
    for (const line of lines) {
      if (line.includes('CREATE TABLE')) {
        const tableName = line.match(/CREATE TABLE (\w+)/)?.[1]
        if (tableName) changes.newTables.push(tableName)
      }
      
      if (line.includes('ALTER TABLE') && line.includes('ADD COLUMN')) {
        const match = line.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/)
        if (match) {
          changes.newColumns.push({
            table: match[1],
            column: match[2],
            line: line.trim()
          })
        }
      }
      
      if (line.includes('CREATE INDEX')) {
        const indexName = line.match(/CREATE INDEX (\w+)/)?.[1]
        if (indexName) changes.newIndexes.push(indexName)
      }
    }
  }

  /**
   * Handle detected schema changes
   */
  async handleSchemaChanges(changes, schemaInfo) {
    console.log('🔧 Handling schema changes...')

    // 1. Send notifications
    await this.sendNotification({
      type: 'schema_change',
      message: `Schema changes detected: ${changes.summary}`,
      data: {
        changes,
        timestamp: new Date().toISOString(),
        method: schemaInfo.method
      }
    })

    // 2. Backup current schema
    await this.backupSchema(schemaInfo)

    // 3. Auto-generate types if enabled
    if (this.config.monitoring.autoTypeGeneration) {
      await this.regenerateTypes()
    }

    // 4. Run validation if enabled
    if (this.config.validation.runTests) {
      await this.runValidation()
    }

    console.log('✅ Schema changes handled')
  }

  /**
   * Regenerate TypeScript types
   */
  async regenerateTypes() {
    console.log('🔧 Regenerating TypeScript types...')

    try {
      if (this.dockerAvailable) {
        // Use official Supabase CLI type generation
        await execAsync('supabase gen types typescript --local > src/types/database-generated.ts')
        console.log('✅ Types regenerated using Supabase CLI')
      } else {
        // Use our custom type generator
        console.log('⚠️ Using fallback type generation (limited)')
        // Trigger our custom type generator script
        await execAsync('node scripts/update-database-types.js')
      }

      // Update our main database types file
      await this.mergeGeneratedTypes()

    } catch (error) {
      console.error('❌ Type generation failed:', error.message)
    }
  }

  /**
   * Merge generated types with our custom types
   */
  async mergeGeneratedTypes() {
    try {
      const generatedTypesPath = path.join(__dirname, '../src/types/database-generated.ts')
      const mainTypesPath = path.join(__dirname, '../src/types/database.ts')

      // Read both files
      const generatedTypes = await fs.readFile(generatedTypesPath, 'utf8').catch(() => '')
      const mainTypes = await fs.readFile(mainTypesPath, 'utf8')

      // Create backup of current types
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      await fs.writeFile(
        path.join(__dirname, `../backups/types/database-${timestamp}.ts`),
        mainTypes
      )

      // Merge logic here (simplified for now)
      const mergedTypes = `${generatedTypes}\n\n// Custom types and utilities from database.ts\n${mainTypes.split('export interface Database')[1] || ''}`
      
      await fs.writeFile(mainTypesPath, mergedTypes)
      console.log('✅ Types merged successfully')
    } catch (error) {
      console.error('❌ Type merging failed:', error.message)
    }
  }

  /**
   * Backup current schema
   */
  async backupSchema(schemaInfo) {
    const backupDir = path.join(__dirname, '../backups/schema-versions')
    await fs.mkdir(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `schema-${timestamp}.json`)

    await fs.writeFile(backupFile, JSON.stringify(schemaInfo, null, 2))

    // Clean old backups if needed
    const backups = await fs.readdir(backupDir)
    if (backups.length > this.config.backup.keepVersions) {
      const oldBackups = backups.sort().slice(0, -this.config.backup.keepVersions)
      for (const backup of oldBackups) {
        await fs.unlink(path.join(backupDir, backup))
      }
    }

    console.log(`💾 Schema backed up to ${backupFile}`)
  }

  /**
   * Run validation tests
   */
  async runValidation() {
    console.log('🧪 Running validation tests...')

    try {
      if (this.config.validation.runTests) {
        await execAsync('npm test')
      }

      if (this.config.validation.checkTypeCompatibility) {
        await execAsync('npm run type-check')
      }

      console.log('✅ Validation passed')
    } catch (error) {
      console.error('❌ Validation failed:', error.message)
      
      await this.sendNotification({
        type: 'validation_failed',
        message: `Schema validation failed: ${error.message}`,
        data: { error: error.message, timestamp: new Date().toISOString() }
      })
    }
  }

  /**
   * Initialize notification system
   */
  async initializeNotificationSystem() {
    console.log('🔔 Initializing notification system...')
    
    // Import notification system
    const NotificationSystem = await import('./notification-system.js')
    this.notificationSystem = new NotificationSystem.default(this.config.notifications)
    
    await this.notificationSystem.initialize()
    console.log('✅ Notification system ready')
  }

  /**
   * Send notification through available channels
   */
  async sendNotification(notification) {
    if (this.notificationSystem) {
      await this.notificationSystem.send(notification)
    } else {
      console.log('📢 Notification:', notification.message)
    }
  }

  /**
   * Initialize dashboard
   */
  async initializeDashboard() {
    console.log('📊 Initializing dashboard...')
    // Dashboard will be created in separate file
    console.log(`✅ Dashboard will be available at http://${this.config.dashboard.host}:${this.config.dashboard.port}`)
  }

  /**
   * Calculate schema hash for change detection
   */
  calculateSchemaHash(schemaInfo) {
    const hashData = JSON.stringify(schemaInfo, null, 0)
    return crypto.createHash('sha256').update(hashData).digest('hex').substring(0, 16)
  }

  /**
   * Update configuration file
   */
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates }
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2))
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
    isMonitoring = false
    console.log('🛑 Schema monitoring stopped')
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      monitoring: isMonitoring,
      dockerAvailable: this.dockerAvailable,
      fallbackMode: this.fallbackMode,
      lastSchemaHash,
      config: this.config
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new HybridSchemaMonitor()
  
  const command = process.argv[2] || 'start'
  
  switch (command) {
    case 'start':
      await monitor.initialize()
      break
      
    case 'stop':
      monitor.stopMonitoring()
      break
      
    case 'status':
      console.log(JSON.stringify(monitor.getStatus(), null, 2))
      break
      
    case 'check':
      await monitor.initialize()
      await monitor.performSchemaCheck()
      monitor.stopMonitoring()
      break
      
    default:
      console.log('Available commands: start, stop, status, check')
  }
}

export default HybridSchemaMonitor