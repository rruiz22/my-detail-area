#!/usr/bin/env node

/**
 * Schema Workflow Manager - Master Orchestrator
 * Coordinates all schema monitoring, notifications, validation, and automation
 * Main entry point for the hybrid Docker + JavaScript monitoring system
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Schema Workflow Manager Class
 */
class SchemaWorkflowManager {
  constructor() {
    this.config = null
    this.processes = new Map()
    this.isRunning = false
    this.startTime = null
    
    this.components = {
      monitor: null,
      dashboard: null,
      notifications: null,
      typeGenerator: null,
      validator: null
    }
  }

  /**
   * Initialize the complete workflow system
   */
  async initialize() {
    console.log('🚀 Initializing Schema Workflow Manager...')
    
    try {
      // Load configuration
      await this.loadConfiguration()
      
      // Setup directories
      await this.setupDirectories()
      
      // Install dependencies if needed
      await this.checkDependencies()
      
      // Initialize components
      await this.initializeComponents()
      
      console.log('✅ Schema Workflow Manager initialized successfully!')
      
      return true
    } catch (error) {
      console.error('❌ Initialization failed:', error.message)
      throw error
    }
  }

  /**
   * Start the complete monitoring workflow
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Workflow already running')
      return
    }

    console.log('🔄 Starting Schema Workflow...')
    this.isRunning = true
    this.startTime = new Date()

    try {
      // Start dashboard (if enabled)
      if (this.config.dashboard?.enabled) {
        await this.startDashboard()
      }

      // Start schema monitor
      await this.startSchemaMonitor()

      // Setup graceful shutdown
      this.setupGracefulShutdown()

      console.log('✅ Schema Workflow started successfully!')
      console.log(`📊 Dashboard: http://${this.config.dashboard?.host || 'localhost'}:${this.config.dashboard?.port || 3001}`)
      console.log(`🕐 Monitoring interval: ${this.config.monitoring?.intervalDescription || '5 minutes'}`)
      console.log('🛑 Press Ctrl+C to stop')

    } catch (error) {
      console.error('❌ Failed to start workflow:', error.message)
      await this.stop()
      throw error
    }
  }

  /**
   * Stop the workflow
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Workflow not running')
      return
    }

    console.log('🛑 Stopping Schema Workflow...')

    // Stop all processes
    for (const [name, process] of this.processes) {
      console.log(`🛑 Stopping ${name}...`)
      process.kill('SIGTERM')
    }

    this.processes.clear()
    this.isRunning = false

    console.log('✅ Schema Workflow stopped')
  }

  /**
   * Get workflow status
   */
  getStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0
    
    return {
      running: this.isRunning,
      uptime: Math.floor(uptime / 1000),
      uptimeFormatted: this.formatUptime(uptime),
      startTime: this.startTime?.toISOString() || null,
      processes: Array.from(this.processes.keys()),
      config: {
        monitoring: this.config?.monitoring?.enabled || false,
        dashboard: this.config?.dashboard?.enabled || false,
        notifications: this.config?.notifications?.push || false,
        autoCommit: this.config?.monitoring?.autoCommit || false
      }
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfiguration() {
    const configPath = path.join(__dirname, '../supabase/monitor-config.json')
    
    try {
      const configData = await fs.readFile(configPath, 'utf8')
      this.config = JSON.parse(configData)
      console.log('✅ Configuration loaded')
    } catch (error) {
      console.log('⚠️ Using default configuration')
      this.config = this.getDefaultConfig()
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      project: {
        id: "swfnnrpzpkdypbrzmgnr",
        url: "https://swfnnrpzpkdypbrzmgnr.supabase.co",
        name: "My Detail Area"
      },
      monitoring: {
        enabled: true,
        interval: 300000,
        intervalDescription: "5 minutes",
        autoSync: true,
        autoTypeGeneration: true,
        autoCommit: false,
        enableNotifications: true
      },
      notifications: {
        push: true,
        memory: true,
        email: false,
        webhook: false
      },
      dashboard: {
        enabled: true,
        port: 3001,
        host: "localhost",
        refreshInterval: 30000
      },
      validation: {
        runTests: false,
        checkTypeCompatibility: true,
        validateRLS: false,
        checkIndexes: false
      }
    }
  }

  /**
   * Setup required directories
   */
  async setupDirectories() {
    const directories = [
      'logs/notifications',
      'logs/validation',
      'backups/schema-versions',
      'backups/types',
      'backups/workspace'
    ]

    for (const dir of directories) {
      const dirPath = path.join(__dirname, '..', dir)
      await fs.mkdir(dirPath, { recursive: true })
    }

    console.log('✅ Directories setup complete')
  }

  /**
   * Check and install dependencies
   */
  async checkDependencies() {
    console.log('📦 Checking dependencies...')
    
    try {
      // Check if required npm packages are available
      const requiredPackages = [
        '@supabase/supabase-js',
        'express',
        'socket.io'
      ]

      for (const pkg of requiredPackages) {
        try {
          await import(pkg)
        } catch (error) {
          console.log(`⚠️ Installing missing package: ${pkg}`)
          await execAsync(`npm install ${pkg}`)
        }
      }

      console.log('✅ Dependencies check complete')
    } catch (error) {
      console.warn('⚠️ Dependency check failed:', error.message)
      // Continue anyway, as some packages might be available
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    console.log('🔧 Initializing components...')

    // Import components dynamically
    try {
      const HybridSchemaMonitor = (await import('./hybrid-schema-monitor.js')).default
      const NotificationSystem = (await import('./notification-system.js')).default
      const SchemaDashboard = (await import('./schema-dashboard.js')).default
      const AutoTypeGenerator = (await import('./auto-type-generator.js')).default
      const AutoValidationCommit = (await import('./auto-validation-commit.js')).default

      this.components = {
        monitor: new HybridSchemaMonitor(),
        notifications: new NotificationSystem(this.config.notifications),
        dashboard: new SchemaDashboard(this.config.dashboard),
        typeGenerator: new AutoTypeGenerator(),
        validator: new AutoValidationCommit(this.config.validation)
      }

      console.log('✅ Components initialized')
    } catch (error) {
      console.error('❌ Component initialization failed:', error.message)
      throw error
    }
  }

  /**
   * Start schema monitor process
   */
  async startSchemaMonitor() {
    console.log('🔍 Starting schema monitor...')
    
    const monitorProcess = spawn('node', [
      path.join(__dirname, 'hybrid-schema-monitor.js'),
      'start'
    ], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    })

    // Handle monitor output
    monitorProcess.stdout.on('data', (data) => {
      const output = data.toString().trim()
      if (output) {
        console.log(`[MONITOR] ${output}`)
      }
    })

    monitorProcess.stderr.on('data', (data) => {
      const output = data.toString().trim()
      if (output) {
        console.error(`[MONITOR] ${output}`)
      }
    })

    monitorProcess.on('exit', (code) => {
      console.log(`[MONITOR] Process exited with code ${code}`)
      this.processes.delete('monitor')
      
      // Restart if unexpected exit
      if (this.isRunning && code !== 0) {
        console.log('[MONITOR] Restarting monitor...')
        setTimeout(() => this.startSchemaMonitor(), 5000)
      }
    })

    this.processes.set('monitor', monitorProcess)
    console.log('✅ Schema monitor started')
  }

  /**
   * Start dashboard process
   */
  async startDashboard() {
    console.log('📊 Starting dashboard...')
    
    const dashboardProcess = spawn('node', [
      path.join(__dirname, 'schema-dashboard.js'),
      'start'
    ], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    })

    // Handle dashboard output
    dashboardProcess.stdout.on('data', (data) => {
      const output = data.toString().trim()
      if (output) {
        console.log(`[DASHBOARD] ${output}`)
      }
    })

    dashboardProcess.stderr.on('data', (data) => {
      const output = data.toString().trim()
      if (output) {
        console.error(`[DASHBOARD] ${output}`)
      }
    })

    dashboardProcess.on('exit', (code) => {
      console.log(`[DASHBOARD] Process exited with code ${code}`)
      this.processes.delete('dashboard')
      
      // Restart if unexpected exit
      if (this.isRunning && code !== 0) {
        console.log('[DASHBOARD] Restarting dashboard...')
        setTimeout(() => this.startDashboard(), 5000)
      }
    })

    this.processes.set('dashboard', dashboardProcess)
    console.log('✅ Dashboard started')
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\\n🛑 Received ${signal}, shutting down gracefully...`)
      await this.stop()
      process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  }

  /**
   * Trigger manual schema check
   */
  async triggerManualCheck() {
    console.log('🔍 Triggering manual schema check...')
    
    try {
      await execAsync('node scripts/hybrid-schema-monitor.js check')
      console.log('✅ Manual check completed')
    } catch (error) {
      console.error('❌ Manual check failed:', error.message)
      throw error
    }
  }

  /**
   * Trigger type regeneration
   */
  async regenerateTypes() {
    console.log('🔧 Triggering type regeneration...')
    
    try {
      await execAsync('node scripts/auto-type-generator.js generate')
      console.log('✅ Type regeneration completed')
    } catch (error) {
      console.error('❌ Type regeneration failed:', error.message)
      throw error
    }
  }

  /**
   * Run validation workflow
   */
  async runValidation() {
    console.log('🧪 Running validation workflow...')
    
    try {
      await execAsync('node scripts/auto-validation-commit.js validate')
      console.log('✅ Validation completed')
    } catch (error) {
      console.error('❌ Validation failed:', error.message)
      throw error
    }
  }

  /**
   * Format uptime for display
   */
  formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
}

// Create package.json script entries
async function updatePackageScripts() {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json')
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
    
    // Add schema monitoring scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'schema:start': 'node scripts/schema-workflow-manager.js start',
      'schema:stop': 'node scripts/schema-workflow-manager.js stop',
      'schema:status': 'node scripts/schema-workflow-manager.js status',
      'schema:check': 'node scripts/hybrid-schema-monitor.js check',
      'schema:types': 'node scripts/auto-type-generator.js generate',
      'schema:validate': 'node scripts/auto-validation-commit.js validate',
      'schema:dashboard': 'node scripts/schema-dashboard.js start'
    }
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
    console.log('✅ Package.json scripts updated')
  } catch (error) {
    console.warn('⚠️ Could not update package.json:', error.message)
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new SchemaWorkflowManager()
  const command = process.argv[2] || 'help'
  
  switch (command) {
    case 'start':
      await manager.initialize()
      await manager.start()
      break
      
    case 'stop':
      await manager.stop()
      break
      
    case 'status':
      await manager.initialize()
      const status = manager.getStatus()
      console.log('📊 Schema Workflow Status:')
      console.log(JSON.stringify(status, null, 2))
      break
      
    case 'check':
      await manager.initialize()
      await manager.triggerManualCheck()
      break
      
    case 'types':
      await manager.initialize()
      await manager.regenerateTypes()
      break
      
    case 'validate':
      await manager.initialize()
      await manager.runValidation()
      break
      
    case 'setup':
      await manager.initialize()
      await updatePackageScripts()
      console.log('✅ Schema monitoring system setup complete!')
      console.log('🚀 Run "npm run schema:start" to begin monitoring')
      break
      
    case 'help':
    default:
      console.log(`
Schema Workflow Manager - My Detail Area

Usage: node scripts/schema-workflow-manager.js <command>

Commands:
  start      Start the complete monitoring workflow
  stop       Stop all monitoring processes
  status     Show current workflow status
  check      Trigger manual schema check
  types      Regenerate TypeScript types
  validate   Run validation workflow
  setup      Setup package.json scripts and initialize system
  help       Show this help message

Quick Start:
  1. Run "node scripts/schema-workflow-manager.js setup"
  2. Run "npm run schema:start" to start monitoring
  3. Visit http://localhost:3001 for the dashboard

Features:
  🔍 Real-time schema monitoring (5-minute intervals)
  📊 Web dashboard at http://localhost:3001
  🔔 Push notifications for schema changes
  🔧 Automatic TypeScript type regeneration
  🧪 Automated validation and testing
  💾 Persistent memory integration
  🐳 Docker CLI integration when available
  📡 JavaScript fallback mode
      `)
      break
  }
}

export default SchemaWorkflowManager