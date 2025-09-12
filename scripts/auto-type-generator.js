#!/usr/bin/env node

/**
 * Automatic TypeScript Type Generator for My Detail Area
 * Combines Supabase CLI generated types with custom utilities and enhancements
 * Provides intelligent merging, backup, and validation
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Auto Type Generator Class
 */
class AutoTypeGenerator {
  constructor(config = {}) {
    this.config = {
      dockerAvailable: false,
      backupEnabled: true,
      validationEnabled: true,
      customTypesEnabled: true,
      outputPath: path.join(__dirname, '../src/types/database.ts'),
      generatedPath: path.join(__dirname, '../src/types/database-generated.ts'),
      backupPath: path.join(__dirname, '../backups/types'),
      ...config
    }

    // Initialize Supabase client (will be set up later)
    this.supabase = null

    this.generationStats = {
      startTime: null,
      endTime: null,
      method: null,
      tablesDetected: 0,
      enumsDetected: 0,
      functionsDetected: 0,
      errors: [],
      warnings: []
    }
  }

  /**
   * Initialize Supabase client
   */
  initializeSupabase() {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.VITE_SUPABASE_URL || 'https://swfnnrpzpkdypbrzmgnr.supabase.co',
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY'
      )
    }
  }

  /**
   * Main entry point for type generation
   */
  async generateTypes() {
    console.log('🔧 Starting automatic type generation...')
    this.generationStats.startTime = new Date()

    try {
      // Initialize Supabase client
      this.initializeSupabase()

      // 1. Check Docker availability
      await this.checkDockerStatus()

      // 2. Backup existing types
      if (this.config.backupEnabled) {
        await this.backupExistingTypes()
      }

      // 3. Generate types using available method
      let generatedTypes = ''
      if (this.config.dockerAvailable) {
        generatedTypes = await this.generateWithSupabaseCLI()
      } else {
        generatedTypes = await this.generateWithFallback()
      }

      // 4. Enhance generated types with custom utilities
      const enhancedTypes = await this.enhanceTypes(generatedTypes)

      // 5. Validate generated types
      if (this.config.validationEnabled) {
        await this.validateTypes(enhancedTypes)
      }

      // 6. Write final types
      await fs.writeFile(this.config.outputPath, enhancedTypes)

      // 7. Update package.json type references if needed
      await this.updateTypeReferences()

      this.generationStats.endTime = new Date()
      console.log('✅ Type generation completed successfully!')
      
      return this.getGenerationSummary()

    } catch (error) {
      this.generationStats.errors.push(error.message)
      this.generationStats.endTime = new Date()
      console.error('❌ Type generation failed:', error.message)
      throw error
    }
  }

  /**
   * Check if Docker and Supabase CLI are available
   */
  async checkDockerStatus() {
    try {
      await execAsync('docker --version')
      await execAsync('supabase --version')
      
      // Test if we can access the project
      const { stdout } = await execAsync('supabase status --workdir .')
      
      this.config.dockerAvailable = true
      this.generationStats.method = 'docker-cli'
      console.log('✅ Using Supabase CLI for type generation')
    } catch (error) {
      this.config.dockerAvailable = false
      this.generationStats.method = 'fallback'
      console.log('⚠️ Docker/CLI unavailable, using fallback method')
    }
  }

  /**
   * Generate types using Supabase CLI (preferred method)
   */
  async generateWithSupabaseCLI() {
    console.log('🐳 Generating types with Supabase CLI...')
    
    try {
      // Generate types using the official CLI
      const { stdout } = await execAsync('supabase gen types typescript --local')
      
      // Save raw generated types
      await fs.writeFile(this.config.generatedPath, stdout)
      
      console.log('✅ CLI type generation successful')
      return stdout
    } catch (error) {
      console.error('❌ CLI type generation failed:', error.message)
      this.generationStats.warnings.push('CLI generation failed, falling back to manual method')
      return await this.generateWithFallback()
    }
  }

  /**
   * Generate types using fallback method (JavaScript client + manual parsing)
   */
  async generateWithFallback() {
    console.log('📡 Generating types with fallback method...')
    
    try {
      // Read migration files to understand schema
      const schemaInfo = await this.extractSchemaFromMigrations()
      
      // Generate TypeScript types from schema info
      const generatedTypes = await this.buildTypesFromSchema(schemaInfo)
      
      console.log('✅ Fallback type generation successful')
      return generatedTypes
    } catch (error) {
      console.error('❌ Fallback type generation failed:', error.message)
      throw new Error(`All type generation methods failed: ${error.message}`)
    }
  }

  /**
   * Extract schema information from migration files
   */
  async extractSchemaFromMigrations() {
    const migrationsDir = path.join(__dirname, '../supabase/migrations')
    const migrationFiles = await fs.readdir(migrationsDir)
    
    const schema = {
      tables: new Map(),
      enums: new Map(),
      functions: new Map()
    }

    // Read all migration files
    for (const file of migrationFiles.filter(f => f.endsWith('.sql'))) {
      const content = await fs.readFile(path.join(migrationsDir, file), 'utf8')
      
      // Parse CREATE TYPE statements (enums)
      const enumMatches = content.match(/CREATE TYPE (\w+) AS ENUM \([^)]+\);/g) || []
      for (const match of enumMatches) {
        const enumMatch = match.match(/CREATE TYPE (\w+) AS ENUM \(([^)]+)\)/)
        if (enumMatch) {
          const enumName = enumMatch[1]
          const values = enumMatch[2].split(',').map(v => v.trim().replace(/['"]/g, ''))
          schema.enums.set(enumName, values)
        }
      }

      // Parse CREATE TABLE statements
      const tableMatches = content.match(/CREATE TABLE [^(]+\([^;]+\);/gs) || []
      for (const match of tableMatches) {
        const tableMatch = match.match(/CREATE TABLE (?:public\.)?(\w+) \((.*)\);/s)
        if (tableMatch) {
          const tableName = tableMatch[1]
          const columns = this.parseTableColumns(tableMatch[2])
          schema.tables.set(tableName, columns)
        }
      }

      // Parse CREATE FUNCTION statements
      const functionMatches = content.match(/CREATE (?:OR REPLACE )?FUNCTION [^;]+;/gs) || []
      for (const match of functionMatches) {
        const funcMatch = match.match(/CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?(\w+)\s*\([^)]*\)\s*RETURNS\s+([^;]+)/s)
        if (funcMatch) {
          const funcName = funcMatch[1]
          const returnType = funcMatch[2].trim()
          schema.functions.set(funcName, { returnType })
        }
      }
    }

    this.generationStats.tablesDetected = schema.tables.size
    this.generationStats.enumsDetected = schema.enums.size
    this.generationStats.functionsDetected = schema.functions.size

    return schema
  }

  /**
   * Parse table columns from CREATE TABLE statement
   */
  parseTableColumns(columnsText) {
    const columns = []
    const lines = columnsText.split('\n').map(line => line.trim())
    
    for (const line of lines) {
      if (line.startsWith('--') || !line || line.includes('CONSTRAINT')) continue
      
      const columnMatch = line.match(/^(\w+)\s+([^,\s]+)(.*)/)
      if (columnMatch) {
        const [, name, type, rest] = columnMatch
        const nullable = !rest.includes('NOT NULL')
        const hasDefault = rest.includes('DEFAULT')
        
        columns.push({
          name,
          type: this.mapPostgresToTypeScript(type),
          nullable,
          hasDefault
        })
      }
    }
    
    return columns
  }

  /**
   * Build TypeScript types from parsed schema
   */
  async buildTypesFromSchema(schema) {
    let output = `// Auto-generated database types for My Detail Area
// Generated on: ${new Date().toISOString()}
// Method: ${this.generationStats.method}
// Project: swfnnrpzpkdypbrzmgnr

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

`

    // Generate enums
    if (schema.enums.size > 0) {
      output += '// Database Enums\n'
      for (const [enumName, values] of schema.enums) {
        const tsEnumName = this.toPascalCase(enumName)
        output += `export type ${tsEnumName} = ${values.map(v => `'${v}'`).join(' | ')}\n`
      }
      output += '\n'
    }

    // Generate database interface
    output += `export interface Database {
  public: {
    Tables: {
`

    // Generate table types
    for (const [tableName, columns] of schema.tables) {
      output += `      ${tableName}: {
        Row: {
`
      for (const col of columns) {
        const optional = col.nullable ? '?' : ''
        const nullType = col.nullable ? ' | null' : ''
        output += `          ${col.name}${optional}: ${col.type}${nullType}\n`
      }
      
      output += `        }
        Insert: {
`
      for (const col of columns) {
        const optional = col.nullable || col.hasDefault ? '?' : ''
        const nullType = col.nullable ? ' | null' : ''
        output += `          ${col.name}${optional}: ${col.type}${nullType}\n`
      }
      
      output += `        }
        Update: {
`
      for (const col of columns) {
        const nullType = col.nullable ? ' | null' : ''
        output += `          ${col.name}?: ${col.type}${nullType}\n`
      }
      
      output += `        }
      }
`
    }

    output += `    }
    Views: {
      [_ in never]: never
    }
    Functions: {
`

    // Generate function types
    for (const [funcName, func] of schema.functions) {
      output += `      ${funcName}: {
        Args: Record<PropertyKey, never>
        Returns: ${this.mapPostgresToTypeScript(func.returnType)}
      }
`
    }

    output += `    }
    Enums: {
`

    // Add enum references
    for (const [enumName] of schema.enums) {
      const tsEnumName = this.toPascalCase(enumName)
      output += `      ${enumName}: ${tsEnumName}\n`
    }

    output += `    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`

    return output
  }

  /**
   * Enhance generated types with custom utilities and helpers
   */
  async enhanceTypes(generatedTypes) {
    console.log('⚡ Enhancing types with custom utilities...')
    
    const customEnhancements = `
// Type helpers for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table type aliases for common usage
export type Dealership = Tables<'dealerships'>
export type DealershipContact = Tables<'dealership_contacts'>
export type Profile = Tables<'profiles'>
export type DealerMembership = Tables<'dealer_memberships'>
export type Order = Tables<'orders'>
export type NFCTag = Tables<'nfc_tags'>
export type NFCScan = Tables<'nfc_scans'>
export type Message = Tables<'messages'>
export type Notification = Tables<'notifications'>

// Insert type aliases
export type DealershipInsert = TablesInsert<'dealerships'>
export type DealershipContactInsert = TablesInsert<'dealership_contacts'>
export type ProfileInsert = TablesInsert<'profiles'>
export type DealerMembershipInsert = TablesInsert<'dealer_memberships'>
export type OrderInsert = TablesInsert<'orders'>
export type NFCTagInsert = TablesInsert<'nfc_tags'>
export type NFCScanInsert = TablesInsert<'nfc_scans'>
export type MessageInsert = TablesInsert<'messages'>
export type NotificationInsert = TablesInsert<'notifications'>

// Update type aliases
export type DealershipUpdate = TablesUpdate<'dealerships'>
export type DealershipContactUpdate = TablesUpdate<'dealership_contacts'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type DealerMembershipUpdate = TablesUpdate<'dealer_memberships'>
export type OrderUpdate = TablesUpdate<'orders'>
export type NFCTagUpdate = TablesUpdate<'nfc_tags'>
export type NFCScanUpdate = TablesUpdate<'nfc_scans'>
export type MessageUpdate = TablesUpdate<'messages'>
export type NotificationUpdate = TablesUpdate<'notifications'>

// Utility types for common patterns
export type WithTimestamps = {
  created_at: string
  updated_at: string
}

export type WithSoftDelete = {
  deleted_at?: string | null
}

export type DatabaseRecord<T extends keyof Database['public']['Tables']> = 
  Tables<T> & { id: string | number }

export type CreateRecord<T extends keyof Database['public']['Tables']> = 
  Omit<TablesInsert<T>, 'id' | 'created_at' | 'updated_at'>

export type UpdateRecord<T extends keyof Database['public']['Tables']> = 
  Omit<TablesUpdate<T>, 'id' | 'created_at' | 'updated_at'>

// Filter types for queries
export type DatabaseFilter<T extends keyof Database['public']['Tables']> = 
  Partial<Tables<T>>

export type SortDirection = 'asc' | 'desc'

export type DatabaseSort<T extends keyof Database['public']['Tables']> = {
  [K in keyof Tables<T>]?: SortDirection
}

// Pagination types
export type PaginationParams = {
  limit?: number
  offset?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  count: number | null
  hasMore: boolean
  nextOffset?: number
}

// Query builder types
export type SelectQuery<T extends keyof Database['public']['Tables']> = {
  table: T
  select?: string
  filter?: DatabaseFilter<T>
  sort?: DatabaseSort<T>
  pagination?: PaginationParams
}

// Real-time subscription types
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export type RealtimePayload<T extends keyof Database['public']['Tables']> = {
  eventType: RealtimeEvent
  new: Tables<T> | null
  old: Tables<T> | null
  errors: string[] | null
}

export type SubscriptionCallback<T extends keyof Database['public']['Tables']> = 
  (payload: RealtimePayload<T>) => void

// Permission types for RLS
export type UserPermissions = {
  userId: string
  userType: Database['public']['Enums']['user_type']
  dealerships: {
    dealershipId: number
    role: Database['public']['Enums']['user_role']
    permissions: Record<string, boolean>
  }[]
}

// Custom error types
export interface DatabaseError {
  message: string
  code?: string
  details?: any
  hint?: string
}

export interface DatabaseResult<T> {
  data: T | null
  error: DatabaseError | null
}

// Generation metadata
export const DATABASE_GENERATION_INFO = {
  timestamp: '${new Date().toISOString()}',
  method: '${this.generationStats.method}',
  tablesCount: ${this.generationStats.tablesDetected},
  enumsCount: ${this.generationStats.enumsDetected},
  functionsCount: ${this.generationStats.functionsDetected},
  version: '${await this.getPackageVersion()}'
} as const
`

    return generatedTypes + customEnhancements
  }

  /**
   * Validate generated types
   */
  async validateTypes(types) {
    console.log('🧪 Validating generated types...')
    
    try {
      // Write temporary file for TypeScript validation
      const tempFile = path.join(__dirname, '../temp-types-validation.ts')
      await fs.writeFile(tempFile, types)
      
      // Run TypeScript compiler to check for syntax errors
      try {
        await execAsync(`npx tsc --noEmit --strict ${tempFile}`)
        console.log('✅ Type validation passed')
      } catch (error) {
        console.warn('⚠️ Type validation warnings:', error.message)
        this.generationStats.warnings.push('Type validation warnings detected')
      }
      
      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {})
      
    } catch (error) {
      console.error('❌ Type validation failed:', error.message)
      this.generationStats.errors.push(`Type validation failed: ${error.message}`)
    }
  }

  /**
   * Backup existing types
   */
  async backupExistingTypes() {
    try {
      await fs.mkdir(this.config.backupPath, { recursive: true })
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(this.config.backupPath, `database-types-${timestamp}.ts`)
      
      // Check if current types file exists
      try {
        const currentTypes = await fs.readFile(this.config.outputPath, 'utf8')
        await fs.writeFile(backupFile, currentTypes)
        console.log(`💾 Types backed up to ${backupFile}`)
      } catch (error) {
        console.log('ℹ️ No existing types file to backup')
      }
      
      // Clean up old backups (keep last 10)
      const backups = await fs.readdir(this.config.backupPath)
      const typeBackups = backups
        .filter(f => f.startsWith('database-types-'))
        .sort()
      
      if (typeBackups.length > 10) {
        const oldBackups = typeBackups.slice(0, -10)
        for (const backup of oldBackups) {
          await fs.unlink(path.join(this.config.backupPath, backup))
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Backup failed:', error.message)
      this.generationStats.warnings.push(`Backup failed: ${error.message}`)
    }
  }

  /**
   * Update package.json type references if needed
   */
  async updateTypeReferences() {
    try {
      const packageJsonPath = path.join(__dirname, '../package.json')
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
      
      // Update types field if it exists
      if (packageJson.types || packageJson.typings) {
        // This would be more complex in a real implementation
        console.log('📦 Package.json types field exists')
      }
      
    } catch (error) {
      // Package.json might not need updating, this is optional
    }
  }

  /**
   * Helper methods
   */
  mapPostgresToTypeScript(pgType) {
    const typeMap = {
      'bigint': 'number',
      'bigserial': 'number',
      'integer': 'number',
      'smallint': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'decimal': 'number',
      'text': 'string',
      'varchar': 'string',
      'character varying': 'string',
      'character': 'string',
      'char': 'string',
      'uuid': 'string',
      'boolean': 'boolean',
      'bool': 'boolean',
      'timestamp with time zone': 'string',
      'timestamptz': 'string',
      'timestamp without time zone': 'string',
      'timestamp': 'string',
      'date': 'string',
      'time': 'string',
      'jsonb': 'Json',
      'json': 'Json',
      'point': 'Json'
    }

    // Handle array types
    if (pgType.includes('[]')) {
      const baseType = pgType.replace('[]', '')
      return `(${this.mapPostgresToTypeScript(baseType)})[]`
    }

    // Handle custom enum types
    if (!typeMap[pgType.toLowerCase()]) {
      return 'string' // Default to string for unknown types
    }

    return typeMap[pgType.toLowerCase()] || 'any'
  }

  toPascalCase(str) {
    return str.replace(/(^\w|_\w)/g, match => match.replace('_', '').toUpperCase())
  }

  async getPackageVersion() {
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf8'))
      return packageJson.version || '1.0.0'
    } catch {
      return '1.0.0'
    }
  }

  /**
   * Get generation summary
   */
  getGenerationSummary() {
    const duration = this.generationStats.endTime - this.generationStats.startTime
    
    return {
      duration: `${duration}ms`,
      method: this.generationStats.method,
      tablesDetected: this.generationStats.tablesDetected,
      enumsDetected: this.generationStats.enumsDetected,
      functionsDetected: this.generationStats.functionsDetected,
      errors: this.generationStats.errors,
      warnings: this.generationStats.warnings,
      success: this.generationStats.errors.length === 0
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new AutoTypeGenerator()
  
  const command = process.argv[2] || 'generate'
  
  switch (command) {
    case 'generate':
      try {
        const result = await generator.generateTypes()
        console.log('\n📊 Generation Summary:')
        console.log(JSON.stringify(result, null, 2))
      } catch (error) {
        console.error('💥 Generation failed:', error.message)
        process.exit(1)
      }
      break
      
    case 'validate':
      const types = await fs.readFile(generator.config.outputPath, 'utf8')
      await generator.validateTypes(types)
      break
      
    default:
      console.log('Available commands: generate, validate')
  }
}

export default AutoTypeGenerator