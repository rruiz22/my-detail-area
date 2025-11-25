#!/usr/bin/env node
/**
 * Apply test migration using direct PostgreSQL connection
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Connection string from Supabase (direct connection, not pooler)
const connectionString = 'postgresql://postgres.swfnnrpzpkdypbrzmgnr:[YOUR-PASSWORD]@db.swfnnrpzpkdypbrzmgnr.supabase.co:5432/postgres';

// Actually, let me use the session mode pooler
// Format: postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
// But we need to use Transaction mode on port 6543 or Session mode on port 5432

// Let's try the direct connection (port 6432 for transaction pooler, 5432 for direct)
const client = new Client({
  host: 'db.swfnnrpzpkdypbrzmgnr.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'gTPuTjUnJgeLWHht0tyAjOTunbXkEVUprnXBGn1bL7M=',
  ssl: { rejectUnauthorized: false }
});

console.log('🤖 Claude Migration Test - Using direct PostgreSQL connection\n');

try {
  console.log('📡 Connecting to database...');
  await client.connect();
  console.log('✅ Connected!\n');

  // Read the migration file
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '20251125013919_test_claude_can_apply_migrations.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('📋 Executing migration...\n');
  console.log('SQL:', sql.substring(0, 200) + '...\n');

  const result = await client.query(sql);

  console.log('✅ Migration executed successfully!');
  console.log('Result:', result);

  console.log('\n🎉 SUCCESS! Claude applied the migration programmatically!');
  console.log('✅ No manual SQL Editor needed!');

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nStack:', err.stack);
} finally {
  await client.end();
  console.log('\n📡 Connection closed');
}
