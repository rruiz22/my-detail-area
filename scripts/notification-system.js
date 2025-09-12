#!/usr/bin/env node

/**
 * Intelligent Notification System for Schema Changes
 * Supports multiple channels: push notifications, memory persistence, email, webhooks
 * Integrates with existing memory system from CLAUDE.md
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Notification types and priorities
 */
const NOTIFICATION_TYPES = {
  SCHEMA_CHANGE: 'schema_change',
  ERROR: 'error',
  VALIDATION_FAILED: 'validation_failed',
  TYPE_REGENERATED: 'type_regenerated',
  SYNC_COMPLETE: 'sync_complete'
}

const PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
}

/**
 * Main Notification System Class
 */
class NotificationSystem {
  constructor(config = {}) {
    this.config = {
      push: true,
      memory: true,
      email: false,
      webhook: false,
      channels: {
        memory: {
          namespace: 'schema-changes',
          ttl: 86400000 // 24 hours
        },
        push: {
          title: 'Schema Change Detected',
          urgency: 'normal'
        }
      },
      ...config
    }
    
    this.memoryApiUrl = 'https://claude-memory-sync-api-production.up.railway.app'
    this.notificationHistory = []
  }

  /**
   * Initialize notification system
   */
  async initialize() {
    console.log('🔔 Initializing Notification System...')
    
    // Test memory API connection
    if (this.config.memory) {
      await this.testMemoryConnection()
    }
    
    // Create notification history directory
    const historyDir = path.join(__dirname, '../logs/notifications')
    await fs.mkdir(historyDir, { recursive: true })
    
    console.log('✅ Notification System initialized')
  }

  /**
   * Send notification through configured channels
   */
  async send(notification) {
    const {
      type = NOTIFICATION_TYPES.SCHEMA_CHANGE,
      message,
      data = {},
      priority = PRIORITIES.NORMAL
    } = notification

    console.log(`📢 Sending notification: ${message}`)

    const notificationRecord = {
      id: this.generateNotificationId(),
      type,
      message,
      data,
      priority,
      timestamp: new Date().toISOString(),
      channels: []
    }

    // Send through enabled channels
    const results = await Promise.allSettled([
      this.config.memory ? this.sendToMemory(notificationRecord) : null,
      this.config.push ? this.sendPushNotification(notificationRecord) : null,
      this.config.email ? this.sendEmailNotification(notificationRecord) : null,
      this.config.webhook ? this.sendWebhookNotification(notificationRecord) : null
    ].filter(Boolean))

    // Process results
    results.forEach((result, index) => {
      const channels = ['memory', 'push', 'email', 'webhook'].filter((_, i) => 
        [this.config.memory, this.config.push, this.config.email, this.config.webhook][i]
      )
      
      if (result.status === 'fulfilled') {
        notificationRecord.channels.push(channels[index])
        console.log(`✅ Sent via ${channels[index]}`)
      } else {
        console.error(`❌ Failed to send via ${channels[index]}:`, result.reason)
      }
    })

    // Store in history
    this.notificationHistory.push(notificationRecord)
    await this.saveNotificationHistory(notificationRecord)

    return notificationRecord
  }

  /**
   * Send notification to memory system (Railway API)
   */
  async sendToMemory(notification) {
    try {
      const memoryKey = `schema-notification-${notification.id}`
      const memoryValue = JSON.stringify({
        ...notification,
        source: 'schema-monitor',
        device: 'my-detail-area-dev'
      })

      // Use existing memory sync script if available
      const memoryScript = path.join(process.env.HOME, 'scripts', 'sync-memory.sh')
      
      try {
        await fs.access(memoryScript)
        // Use the existing script
        await execAsync(`bash "${memoryScript}" store "${memoryKey}" "${memoryValue}" "${this.config.channels.memory.namespace}"`)
      } catch {
        // Fallback to direct API call
        await this.directMemoryApiCall(memoryKey, memoryValue)
      }

      console.log(`💾 Stored in memory: ${memoryKey}`)
      return { success: true, channel: 'memory' }
    } catch (error) {
      throw new Error(`Memory storage failed: ${error.message}`)
    }
  }

  /**
   * Direct API call to memory system
   */
  async directMemoryApiCall(key, value) {
    const response = await fetch(`${this.memoryApiUrl}/api/memory/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memory_key: key,
        memory_value: value,
        namespace: this.config.channels.memory.namespace,
        ttl: this.config.channels.memory.ttl
      })
    })

    if (!response.ok) {
      throw new Error(`Memory API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Send native push notification (macOS)
   */
  async sendPushNotification(notification) {
    try {
      const title = this.config.channels.push.title
      const subtitle = this.getNotificationSubtitle(notification.type)
      const message = notification.message
      const urgency = this.mapPriorityToUrgency(notification.priority)

      // Use macOS osascript for native notifications
      const script = `display notification "${message}" with title "${title}" subtitle "${subtitle}"`
      
      await execAsync(`osascript -e '${script}'`)

      // Also try terminal-notifier if available (better formatting)
      try {
        await execAsync(`which terminal-notifier`)
        const notifierCmd = `terminal-notifier -title "${title}" -subtitle "${subtitle}" -message "${message}" -group "schema-monitor"`
        await execAsync(notifierCmd)
      } catch {
        // terminal-notifier not available, osascript is sufficient
      }

      return { success: true, channel: 'push' }
    } catch (error) {
      throw new Error(`Push notification failed: ${error.message}`)
    }
  }

  /**
   * Send email notification (placeholder for future implementation)
   */
  async sendEmailNotification(notification) {
    // Placeholder for email functionality
    console.log('📧 Email notification (not implemented yet)')
    return { success: false, channel: 'email', reason: 'Not implemented' }
  }

  /**
   * Send webhook notification (placeholder for future implementation)
   */
  async sendWebhookNotification(notification) {
    // Placeholder for webhook functionality
    console.log('🔗 Webhook notification (not implemented yet)')
    return { success: false, channel: 'webhook', reason: 'Not implemented' }
  }

  /**
   * Test memory API connection
   */
  async testMemoryConnection() {
    try {
      const response = await fetch(`${this.memoryApiUrl}/api/health`)
      if (response.ok) {
        console.log('✅ Memory API connection successful')
        return true
      } else {
        throw new Error(`API returned ${response.status}`)
      }
    } catch (error) {
      console.error('⚠️ Memory API connection failed:', error.message)
      return false
    }
  }

  /**
   * Save notification to local history
   */
  async saveNotificationHistory(notification) {
    try {
      const historyFile = path.join(__dirname, '../logs/notifications/history.jsonl')
      const historyLine = JSON.stringify(notification) + '\n'
      
      await fs.appendFile(historyFile, historyLine)
      
      // Keep only last 1000 notifications
      await this.cleanupHistory(historyFile)
    } catch (error) {
      console.error('Failed to save notification history:', error.message)
    }
  }

  /**
   * Clean up old notification history
   */
  async cleanupHistory(historyFile, maxLines = 1000) {
    try {
      const content = await fs.readFile(historyFile, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length > maxLines) {
        const keepLines = lines.slice(-maxLines)
        await fs.writeFile(historyFile, keepLines.join('\n') + '\n')
      }
    } catch (error) {
      // File might not exist yet, ignore
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(limit = 50) {
    try {
      const historyFile = path.join(__dirname, '../logs/notifications/history.jsonl')
      const content = await fs.readFile(historyFile, 'utf8')
      
      const notifications = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .slice(-limit)
        .reverse()

      return notifications
    } catch (error) {
      return []
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats() {
    const history = await this.getNotificationHistory(500)
    
    const stats = {
      total: history.length,
      byType: {},
      byPriority: {},
      byChannel: {},
      recent: history.slice(0, 10)
    }

    history.forEach(notification => {
      // By type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
      
      // By priority
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1
      
      // By channels
      notification.channels.forEach(channel => {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1
      })
    })

    return stats
  }

  /**
   * Helper methods
   */
  generateNotificationId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  getNotificationSubtitle(type) {
    const subtitles = {
      [NOTIFICATION_TYPES.SCHEMA_CHANGE]: '🗄️ Database Update',
      [NOTIFICATION_TYPES.ERROR]: '❌ System Error',
      [NOTIFICATION_TYPES.VALIDATION_FAILED]: '🧪 Validation Failed',
      [NOTIFICATION_TYPES.TYPE_REGENERATED]: '🔧 Types Updated',
      [NOTIFICATION_TYPES.SYNC_COMPLETE]: '✅ Sync Complete'
    }
    
    return subtitles[type] || '📢 Notification'
  }

  mapPriorityToUrgency(priority) {
    const mapping = {
      [PRIORITIES.LOW]: 'low',
      [PRIORITIES.NORMAL]: 'normal',
      [PRIORITIES.HIGH]: 'critical',
      [PRIORITIES.CRITICAL]: 'critical'
    }
    
    return mapping[priority] || 'normal'
  }

  /**
   * Create quick notification shortcuts
   */
  schemaChanged(message, changes = {}) {
    return this.send({
      type: NOTIFICATION_TYPES.SCHEMA_CHANGE,
      message,
      data: { changes },
      priority: PRIORITIES.HIGH
    })
  }

  error(message, error = {}) {
    return this.send({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      data: { error },
      priority: PRIORITIES.CRITICAL
    })
  }

  validationFailed(message, details = {}) {
    return this.send({
      type: NOTIFICATION_TYPES.VALIDATION_FAILED,
      message,
      data: { details },
      priority: PRIORITIES.HIGH
    })
  }

  typesRegenerated(message, stats = {}) {
    return this.send({
      type: NOTIFICATION_TYPES.TYPE_REGENERATED,
      message,
      data: { stats },
      priority: PRIORITIES.NORMAL
    })
  }

  syncComplete(message, summary = {}) {
    return this.send({
      type: NOTIFICATION_TYPES.SYNC_COMPLETE,
      message,
      data: { summary },
      priority: PRIORITIES.LOW
    })
  }
}

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const system = new NotificationSystem()
  await system.initialize()
  
  const command = process.argv[2]
  
  switch (command) {
    case 'test':
      await system.schemaChanged('Test schema change notification', {
        newTables: ['test_table'],
        modifiedColumns: ['users.email']
      })
      break
      
    case 'history':
      const history = await system.getNotificationHistory()
      console.log(JSON.stringify(history, null, 2))
      break
      
    case 'stats':
      const stats = await system.getNotificationStats()
      console.log(JSON.stringify(stats, null, 2))
      break
      
    default:
      console.log('Available commands: test, history, stats')
  }
}

export default NotificationSystem
export { NOTIFICATION_TYPES, PRIORITIES }