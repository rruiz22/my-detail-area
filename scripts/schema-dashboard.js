#!/usr/bin/env node

/**
 * Real-time Schema Dashboard for My Detail Area
 * Provides web-based monitoring interface for database schema changes
 * Shows real-time status, history, and statistics
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Schema Dashboard Server Class
 */
class SchemaDashboard {
  constructor(config = {}) {
    this.config = {
      port: 3001,
      host: 'localhost',
      refreshInterval: 30000,
      enableWebSocket: true,
      ...config
    }

    this.app = express()
    this.server = createServer(this.app)
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    this.dashboardState = {
      monitoring: false,
      lastUpdate: null,
      schema: null,
      notifications: [],
      stats: {},
      errors: []
    }

    this.connectedClients = 0
    this.updateInterval = null
  }

  /**
   * Initialize and start the dashboard
   */
  async initialize() {
    console.log('📊 Initializing Schema Dashboard...')

    // Setup Express routes
    await this.setupRoutes()

    // Setup WebSocket handlers
    this.setupWebSocket()

    // Load initial data
    await this.loadInitialData()

    // Start the server
    this.server.listen(this.config.port, this.config.host, () => {
      console.log(`✅ Schema Dashboard running at http://${this.config.host}:${this.config.port}`)
    })

    // Start periodic updates
    this.startPeriodicUpdates()
  }

  /**
   * Setup Express routes
   */
  async setupRoutes() {
    // Serve static files
    this.app.use('/static', express.static(path.join(__dirname, '../public')))

    // API endpoints
    this.app.use(express.json())

    // Dashboard HTML
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML())
    })

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json(this.dashboardState)
    })

    this.app.get('/api/schema', async (req, res) => {
      try {
        const schema = await this.getCurrentSchema()
        res.json(schema)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    this.app.get('/api/notifications', async (req, res) => {
      try {
        const notifications = await this.getRecentNotifications()
        res.json(notifications)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.getSchemaStats()
        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    this.app.post('/api/trigger-check', async (req, res) => {
      try {
        await this.triggerManualCheck()
        res.json({ success: true, message: 'Manual schema check triggered' })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    this.app.post('/api/regenerate-types', async (req, res) => {
      try {
        await this.triggerTypeRegeneration()
        res.json({ success: true, message: 'Type regeneration triggered' })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })
  }

  /**
   * Setup WebSocket handlers
   */
  setupWebSocket() {
    this.io.on('connection', (socket) => {
      this.connectedClients++
      console.log(`🔌 Client connected (${this.connectedClients} total)`)

      // Send current state to new client
      socket.emit('dashboard-state', this.dashboardState)

      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedClients--
        console.log(`🔌 Client disconnected (${this.connectedClients} total)`)
      })

      // Handle manual actions from clients
      socket.on('trigger-check', async () => {
        try {
          await this.triggerManualCheck()
          socket.emit('check-triggered', { success: true })
        } catch (error) {
          socket.emit('error', { message: error.message })
        }
      })
    })
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      // Load configuration
      const configPath = path.join(__dirname, '../supabase/monitor-config.json')
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
      
      // Load current schema info
      this.dashboardState.schema = await this.getCurrentSchema()
      
      // Load recent notifications
      this.dashboardState.notifications = await this.getRecentNotifications()
      
      // Load statistics
      this.dashboardState.stats = await this.getSchemaStats()
      
      // Check monitoring status
      this.dashboardState.monitoring = config.monitoring?.enabled || false
      this.dashboardState.lastUpdate = new Date().toISOString()
      
      console.log('✅ Initial data loaded')
    } catch (error) {
      console.error('❌ Failed to load initial data:', error.message)
      this.dashboardState.errors.push(`Initial load failed: ${error.message}`)
    }
  }

  /**
   * Start periodic updates
   */
  startPeriodicUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateDashboardData()
        this.broadcastUpdate()
      } catch (error) {
        console.error('❌ Update failed:', error.message)
      }
    }, this.config.refreshInterval)

    console.log(`🔄 Periodic updates started (${this.config.refreshInterval}ms interval)`)
  }

  /**
   * Update dashboard data
   */
  async updateDashboardData() {
    try {
      const newSchema = await this.getCurrentSchema()
      const newNotifications = await this.getRecentNotifications()
      const newStats = await this.getSchemaStats()

      // Check for changes
      const schemaChanged = JSON.stringify(newSchema) !== JSON.stringify(this.dashboardState.schema)
      const notificationsChanged = newNotifications.length !== this.dashboardState.notifications.length

      if (schemaChanged || notificationsChanged) {
        this.dashboardState = {
          ...this.dashboardState,
          schema: newSchema,
          notifications: newNotifications,
          stats: newStats,
          lastUpdate: new Date().toISOString()
        }

        console.log('📊 Dashboard data updated')
      }
    } catch (error) {
      console.error('❌ Dashboard update failed:', error.message)
      this.dashboardState.errors.push(`Update failed: ${error.message}`)
    }
  }

  /**
   * Broadcast update to all connected clients
   */
  broadcastUpdate() {
    if (this.connectedClients > 0) {
      this.io.emit('dashboard-update', this.dashboardState)
    }
  }

  /**
   * Get current schema information
   */
  async getCurrentSchema() {
    try {
      // Try to get from latest backup
      const backupDir = path.join(__dirname, '../backups/schema-versions')
      const backups = await fs.readdir(backupDir).catch(() => [])
      
      if (backups.length > 0) {
        const latestBackup = backups.sort().pop()
        const schemaData = await fs.readFile(path.join(backupDir, latestBackup), 'utf8')
        return JSON.parse(schemaData)
      }
      
      return {
        method: 'no-data',
        tables: {},
        timestamp: new Date().toISOString(),
        source: 'No schema data available'
      }
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(limit = 50) {
    try {
      const historyFile = path.join(__dirname, '../logs/notifications/history.jsonl')
      const content = await fs.readFile(historyFile, 'utf8')
      
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .slice(-limit)
        .reverse()
    } catch (error) {
      return []
    }
  }

  /**
   * Get schema statistics
   */
  async getSchemaStats() {
    try {
      const notifications = await this.getRecentNotifications(500)
      
      const stats = {
        totalNotifications: notifications.length,
        schemaChanges: notifications.filter(n => n.type === 'schema_change').length,
        errors: notifications.filter(n => n.type === 'error').length,
        typeRegenerations: notifications.filter(n => n.type === 'type_regenerated').length,
        lastSchemaChange: notifications.find(n => n.type === 'schema_change')?.timestamp || null,
        uptime: this.getUptime(),
        connectedClients: this.connectedClients
      }
      
      return stats
    } catch (error) {
      return {
        error: error.message,
        connectedClients: this.connectedClients
      }
    }
  }

  /**
   * Trigger manual schema check
   */
  async triggerManualCheck() {
    console.log('🔍 Manual schema check triggered')
    
    try {
      // Run the schema monitor check command
      await execAsync('node scripts/hybrid-schema-monitor.js check')
      
      // Update dashboard data immediately
      await this.updateDashboardData()
      this.broadcastUpdate()
      
      console.log('✅ Manual check completed')
    } catch (error) {
      console.error('❌ Manual check failed:', error.message)
      throw error
    }
  }

  /**
   * Trigger type regeneration
   */
  async triggerTypeRegeneration() {
    console.log('🔧 Type regeneration triggered')
    
    try {
      await execAsync('node scripts/auto-type-generator.js generate')
      
      // Update dashboard data
      await this.updateDashboardData()
      this.broadcastUpdate()
      
      console.log('✅ Type regeneration completed')
    } catch (error) {
      console.error('❌ Type regeneration failed:', error.message)
      throw error
    }
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schema Dashboard - My Detail Area</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #2d3748;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #48bb78;
            animation: pulse 2s infinite;
        }
        
        .status-indicator.error {
            background: #f56565;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }
        
        .card:hover {
            transform: translateY(-2px);
        }
        
        .card h3 {
            color: #2d3748;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-value {
            font-weight: bold;
            color: #4299e1;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .btn {
            background: #4299e1;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
        }
        
        .btn:hover {
            background: #3182ce;
        }
        
        .btn:disabled {
            background: #a0aec0;
            cursor: not-allowed;
        }
        
        .notification {
            background: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 0 6px 6px 0;
            font-size: 14px;
        }
        
        .notification.error {
            border-left-color: #f56565;
            background: #fed7d7;
        }
        
        .notification.success {
            border-left-color: #48bb78;
            background: #c6f6d5;
        }
        
        .notification-time {
            font-size: 12px;
            color: #718096;
            margin-top: 4px;
        }
        
        .chart-container {
            grid-column: 1 / -1;
            height: 300px;
            position: relative;
        }
        
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: #718096;
            font-style: italic;
        }
        
        .timestamp {
            font-size: 12px;
            color: #718096;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <span class="status-indicator" id="status-indicator"></span>
                Schema Dashboard - My Detail Area
            </h1>
            <p>Real-time database schema monitoring and management</p>
            <div class="timestamp" id="last-update">Loading...</div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📊 Current Status</h3>
                <div class="metric">
                    <span>Monitoring</span>
                    <span class="metric-value" id="monitoring-status">Unknown</span>
                </div>
                <div class="metric">
                    <span>Connected Clients</span>
                    <span class="metric-value" id="connected-clients">0</span>
                </div>
                <div class="metric">
                    <span>Last Schema Hash</span>
                    <span class="metric-value" id="schema-hash">None</span>
                </div>
                <div class="actions">
                    <button class="btn" onclick="triggerCheck()">Manual Check</button>
                    <button class="btn" onclick="regenerateTypes()">Regenerate Types</button>
                </div>
            </div>
            
            <div class="card">
                <h3>📈 Statistics</h3>
                <div class="metric">
                    <span>Total Notifications</span>
                    <span class="metric-value" id="total-notifications">0</span>
                </div>
                <div class="metric">
                    <span>Schema Changes</span>
                    <span class="metric-value" id="schema-changes">0</span>
                </div>
                <div class="metric">
                    <span>Errors</span>
                    <span class="metric-value" id="total-errors">0</span>
                </div>
                <div class="metric">
                    <span>Type Regenerations</span>
                    <span class="metric-value" id="type-regenerations">0</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🗄️ Schema Info</h3>
                <div class="metric">
                    <span>Detection Method</span>
                    <span class="metric-value" id="schema-method">Unknown</span>
                </div>
                <div class="metric">
                    <span>Tables Detected</span>
                    <span class="metric-value" id="tables-count">0</span>
                </div>
                <div class="metric">
                    <span>Last Schema Change</span>
                    <span class="metric-value" id="last-schema-change">Never</span>
                </div>
                <div class="metric">
                    <span>Schema Timestamp</span>
                    <span class="metric-value" id="schema-timestamp">Unknown</span>
                </div>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🔔 Recent Notifications</h3>
                <div id="notifications-list" class="loading">
                    Loading notifications...
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io()
        let dashboardState = {}
        
        // Socket event handlers
        socket.on('connect', () => {
            console.log('Connected to dashboard')
            updateStatus('connected')
        })
        
        socket.on('disconnect', () => {
            console.log('Disconnected from dashboard')
            updateStatus('disconnected')
        })
        
        socket.on('dashboard-state', (state) => {
            dashboardState = state
            updateDashboard(state)
        })
        
        socket.on('dashboard-update', (state) => {
            dashboardState = state
            updateDashboard(state)
        })
        
        socket.on('error', (error) => {
            console.error('Dashboard error:', error)
            showNotification(\`Error: \${error.message}\`, 'error')
        })
        
        // Update dashboard UI
        function updateDashboard(state) {
            // Update status indicators
            document.getElementById('monitoring-status').textContent = state.monitoring ? 'Active' : 'Inactive'
            document.getElementById('connected-clients').textContent = state.stats.connectedClients || 0
            document.getElementById('last-update').textContent = \`Last update: \${new Date(state.lastUpdate).toLocaleString()}\`
            
            // Update statistics
            if (state.stats) {
                document.getElementById('total-notifications').textContent = state.stats.totalNotifications || 0
                document.getElementById('schema-changes').textContent = state.stats.schemaChanges || 0
                document.getElementById('total-errors').textContent = state.stats.errors || 0
                document.getElementById('type-regenerations').textContent = state.stats.typeRegenerations || 0
                document.getElementById('last-schema-change').textContent = state.stats.lastSchemaChange ? 
                    new Date(state.stats.lastSchemaChange).toLocaleDateString() : 'Never'
            }
            
            // Update schema info
            if (state.schema) {
                document.getElementById('schema-method').textContent = state.schema.method || 'Unknown'
                document.getElementById('tables-count').textContent = state.schema.tablesDetected || Object.keys(state.schema.tables || {}).length
                document.getElementById('schema-timestamp').textContent = state.schema.timestamp ? 
                    new Date(state.schema.timestamp).toLocaleString() : 'Unknown'
                    
                // Update schema hash (simplified)
                const hashElement = document.getElementById('schema-hash')
                if (state.schema.method === 'docker' && state.schema.diff) {
                    hashElement.textContent = 'Modified'
                } else {
                    hashElement.textContent = 'Current'
                }
            }
            
            // Update notifications
            updateNotificationsList(state.notifications || [])
            
            // Update status indicator
            const indicator = document.getElementById('status-indicator')
            if (state.errors && state.errors.length > 0) {
                indicator.className = 'status-indicator error'
            } else {
                indicator.className = 'status-indicator'
            }
        }
        
        function updateNotificationsList(notifications) {
            const container = document.getElementById('notifications-list')
            
            if (notifications.length === 0) {
                container.innerHTML = '<div class="loading">No notifications</div>'
                return
            }
            
            container.innerHTML = notifications.slice(0, 10).map(notification => \`
                <div class="notification \${notification.type === 'error' ? 'error' : (notification.type === 'sync_complete' ? 'success' : '')}">
                    <strong>\${getNotificationIcon(notification.type)} \${notification.type.replace('_', ' ').toUpperCase()}</strong>
                    <div>\${notification.message}</div>
                    <div class="notification-time">\${new Date(notification.timestamp).toLocaleString()}</div>
                </div>
            \`).join('')
        }
        
        function getNotificationIcon(type) {
            const icons = {
                'schema_change': '🔄',
                'error': '❌',
                'validation_failed': '🧪',
                'type_regenerated': '🔧',
                'sync_complete': '✅'
            }
            return icons[type] || '📢'
        }
        
        function updateStatus(status) {
            const indicator = document.getElementById('status-indicator')
            if (status === 'connected') {
                indicator.className = 'status-indicator'
            } else {
                indicator.className = 'status-indicator error'
            }
        }
        
        function triggerCheck() {
            const btn = event.target
            btn.disabled = true
            btn.textContent = 'Checking...'
            
            fetch('/api/trigger-check', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    showNotification(data.message || 'Check triggered', 'success')
                })
                .catch(error => {
                    showNotification(\`Error: \${error.message}\`, 'error')
                })
                .finally(() => {
                    btn.disabled = false
                    btn.textContent = 'Manual Check'
                })
        }
        
        function regenerateTypes() {
            const btn = event.target
            btn.disabled = true
            btn.textContent = 'Regenerating...'
            
            fetch('/api/regenerate-types', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    showNotification(data.message || 'Types regenerated', 'success')
                })
                .catch(error => {
                    showNotification(\`Error: \${error.message}\`, 'error')
                })
                .finally(() => {
                    btn.disabled = false
                    btn.textContent = 'Regenerate Types'
                })
        }
        
        function showNotification(message, type = 'info') {
            // Simple notification system (could be enhanced)
            const notification = document.createElement('div')
            notification.className = \`notification \${type}\`
            notification.innerHTML = \`
                <strong>\${type.toUpperCase()}</strong>
                <div>\${message}</div>
            \`
            
            document.body.appendChild(notification)
            
            setTimeout(() => {
                notification.remove()
            }, 5000)
        }
        
        // Load initial data
        fetch('/api/status')
            .then(response => response.json())
            .then(state => {
                dashboardState = state
                updateDashboard(state)
            })
            .catch(error => {
                console.error('Failed to load initial data:', error)
            })
    </script>
</body>
</html>
    `
  }

  /**
   * Helper methods
   */
  getUptime() {
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  /**
   * Stop the dashboard
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    this.server.close(() => {
      console.log('🛑 Schema Dashboard stopped')
    })
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
    config = fullConfig.dashboard || {}
  } catch (error) {
    console.log('Using default dashboard configuration')
  }

  const dashboard = new SchemaDashboard(config)
  
  const command = process.argv[2] || 'start'
  
  switch (command) {
    case 'start':
      await dashboard.initialize()
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\\n🛑 Shutting down dashboard...')
        dashboard.stop()
        process.exit(0)
      })
      break
      
    default:
      console.log('Available commands: start')
  }
}

export default SchemaDashboard