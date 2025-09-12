#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables manually from .env files
const envPath = path.join(__dirname, '..', '.env')
const envLocalPath = path.join(__dirname, '..', '.env.local')

let SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co'
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY'

console.log('🔗 Connecting to:', SUPABASE_URL)
console.log('🔑 Using anon key:', SUPABASE_ANON_KEY.substring(0, 20) + '...')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function inspectDatabase() {
  try {
    console.log('🔍 Inspecting database schema...')

    // Get all tables from information_schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError)
      return
    }

    console.log(`\n📊 Found ${tables.length} tables in public schema:`)
    
    const schemaInfo = {
      tables: {},
      timestamp: new Date().toISOString(),
      project: 'swfnnrpzpkdypbrzmgnr'
    }

    for (const table of tables) {
      console.log(`\n🔹 ${table.table_name}`)
      
      // Get columns for this table
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .order('ordinal_position')

      if (columnsError) {
        console.error(`❌ Error fetching columns for ${table.table_name}:`, columnsError)
        continue
      }

      // Store table info
      schemaInfo.tables[table.table_name] = {
        columns: columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          position: col.ordinal_position
        })),
        total_columns: columns.length
      }

      // Show column info
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
        console.log(`   └─ ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
      })

      // Get row count (if accessible)
      try {
        const { count, error: countError } = await supabase
          .from(table.table_name)
          .select('*', { count: 'exact', head: true })

        if (!countError) {
          console.log(`   📈 Rows: ${count}`)
          schemaInfo.tables[table.table_name].row_count = count
        } else {
          console.log(`   📈 Rows: Access denied (${countError.message})`)
        }
      } catch (e) {
        console.log(`   📈 Rows: Unable to count`)
      }
    }

    // Save schema to file
    const schemaPath = path.join(process.cwd(), 'docs', 'database-schema.json')
    await fs.writeFile(schemaPath, JSON.stringify(schemaInfo, null, 2))
    console.log(`\n💾 Schema saved to: ${schemaPath}`)

    // Generate TypeScript types
    console.log('\n🔧 Generating TypeScript types...')
    const typesContent = generateTypeScriptTypes(schemaInfo.tables)
    const typesPath = path.join(process.cwd(), 'src', 'types', 'database.ts')
    await fs.mkdir(path.dirname(typesPath), { recursive: true })
    await fs.writeFile(typesPath, typesContent)
    console.log(`💾 Types saved to: ${typesPath}`)

    console.log('\n✅ Database inspection complete!')
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error)
  }
}

function generateTypeScriptTypes(tables) {
  let content = `// Auto-generated database types
// Generated on: ${new Date().toISOString()}
// Project: swfnnrpzpkdypbrzmgnr

export interface Database {
  public: {
    Tables: {
`

  Object.entries(tables).forEach(([tableName, tableInfo]) => {
    content += `      ${tableName}: {
        Row: {
`
    
    tableInfo.columns.forEach(col => {
      const tsType = mapPostgresToTypeScript(col.type)
      const optional = col.nullable ? '?' : ''
      content += `          ${col.name}${optional}: ${tsType}${col.nullable ? ' | null' : ''}\n`
    })

    content += `        }
        Insert: {
`
    
    tableInfo.columns.forEach(col => {
      const tsType = mapPostgresToTypeScript(col.type)
      const optional = col.nullable || col.default ? '?' : ''
      content += `          ${col.name}${optional}: ${tsType}${col.nullable ? ' | null' : ''}\n`
    })

    content += `        }
        Update: {
`
    
    tableInfo.columns.forEach(col => {
      const tsType = mapPostgresToTypeScript(col.type)
      content += `          ${col.name}?: ${tsType}${col.nullable ? ' | null' : ''}\n`
    })

    content += `        }
      }
`
  })

  content += `    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
`

  return content
}

function mapPostgresToTypeScript(pgType) {
  const typeMap = {
    'bigint': 'number',
    'integer': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'text': 'string',
    'character varying': 'string',
    'character': 'string',
    'uuid': 'string',
    'boolean': 'boolean',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'date': 'string',
    'time': 'string',
    'jsonb': 'Json',
    'json': 'Json',
    'ARRAY': 'Array<any>'
  }

  // Handle array types
  if (pgType.includes('ARRAY') || pgType.includes('[]')) {
    const baseType = pgType.replace('ARRAY', '').replace('[]', '').trim()
    const mappedBase = typeMap[baseType] || 'any'
    return `${mappedBase}[]`
  }

  return typeMap[pgType] || 'any'
}

// Add Json type definition
const jsonTypeDef = `
// Json type for JSONB columns
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
`

// Run inspection
inspectDatabase().catch(console.error)