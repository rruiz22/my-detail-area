#!/usr/bin/env node

/**
 * Fix Zero Prices - Safe Migration Executor
 *
 * This script executes the comprehensive price correction migration
 * with extensive safety checks and user confirmation.
 *
 * Date: 2025-11-22
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    return envVars;
  } catch (err) {
    console.error('Failed to load .env file:', err.message);
    return {};
  }
}

const env = loadEnvFile();
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials');
  console.error('   Required: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Found in .env:');
  console.error('     SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('     SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Utility: Create readline interface
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Utility: Ask yes/no question
function askQuestion(query) {
  const rl = createReadline();
  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Step 1: Pre-flight check
async function preflightCheck() {
  console.log('\n🔍 PREFLIGHT CHECK');
  console.log('='.repeat(60));

  try {
    // Check if orders table exists
    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, services', { count: 'exact', head: false })
      .eq('total_amount', 0)
      .not('services', 'is', null)
      .limit(1);

    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Preflight check failed:', err.message);
    return false;
  }
}

// Step 2: Show analysis of affected orders
async function analyzeAffectedOrders() {
  console.log('\n📊 ANALYZING AFFECTED ORDERS');
  console.log('='.repeat(60));

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, order_type, services, created_at')
      .eq('total_amount', 0)
      .not('services', 'is', null);

    if (error) throw error;

    if (!orders || orders.length === 0) {
      console.log('✅ No orders found with $0 total and services');
      return { count: 0, revenue: 0, orders: [] };
    }

    // Calculate potential revenue recovery
    let totalRevenue = 0;
    const ordersByType = {};

    orders.forEach(order => {
      let orderTotal = 0;

      if (Array.isArray(order.services)) {
        order.services.forEach(service => {
          if (typeof service === 'object' && service.price) {
            orderTotal += parseFloat(service.price) || 0;
          }
        });
      }

      totalRevenue += orderTotal;

      // Group by order type
      if (!ordersByType[order.order_type]) {
        ordersByType[order.order_type] = { count: 0, revenue: 0 };
      }
      ordersByType[order.order_type].count++;
      ordersByType[order.order_type].revenue += orderTotal;
    });

    console.log(`\nTotal affected orders: ${orders.length}`);
    console.log(`Potential revenue recovery: $${totalRevenue.toFixed(2)}`);
    console.log('\nBreakdown by order type:');

    Object.entries(ordersByType)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([type, stats]) => {
        console.log(`  ${type}: ${stats.count} orders ($${stats.revenue.toFixed(2)})`);
      });

    console.log('\nSample orders (first 10):');
    orders.slice(0, 10).forEach(order => {
      let orderTotal = 0;
      if (Array.isArray(order.services)) {
        order.services.forEach(service => {
          if (typeof service === 'object' && service.price) {
            orderTotal += parseFloat(service.price) || 0;
          }
        });
      }

      console.log(`  ${order.order_number} | ${order.order_type} | $${orderTotal.toFixed(2)} | ${new Date(order.created_at).toLocaleDateString()}`);
    });

    if (orders.length > 10) {
      console.log(`  ... and ${orders.length - 10} more orders`);
    }

    return {
      count: orders.length,
      revenue: totalRevenue,
      orders: orders
    };

  } catch (err) {
    console.error('❌ Analysis failed:', err.message);
    throw err;
  }
}

// Step 3: Execute migration
async function executeMigration() {
  console.log('\n🚀 EXECUTING MIGRATION');
  console.log('='.repeat(60));

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251122000003_recalculate_zero_prices_comprehensive.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('⚙️  Executing SQL...\n');

    // Execute migration via RPC or direct SQL
    // Note: Supabase JS client doesn't support raw SQL directly
    // We need to use the REST API or management API

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      // Alternative: Use Supabase Management API or pgAdmin
      console.log('⚠️  Direct SQL execution not available via REST API');
      console.log('📋 Please execute the migration manually using one of these methods:');
      console.log('   1. Supabase Dashboard → SQL Editor');
      console.log('   2. psql command line');
      console.log('   3. pgAdmin or another PostgreSQL client');
      console.log(`\n📁 Migration file location:\n   ${migrationPath}`);
      return false;
    }

    console.log('✅ Migration executed successfully');
    return true;

  } catch (err) {
    console.error('❌ Migration execution failed:', err.message);
    throw err;
  }
}

// Step 4: Verify results
async function verifyResults() {
  console.log('\n✅ VERIFYING RESULTS');
  console.log('='.repeat(60));

  try {
    // Check if backup table was created
    const { data: backupExists } = await supabase
      .from('orders_backup_20251122')
      .select('id', { count: 'exact', head: true });

    if (backupExists) {
      console.log('✅ Backup table created successfully');
    }

    // Check fixed orders
    const { data: fixedOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, services')
      .gt('total_amount', 0)
      .not('services', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log(`\n📊 Recent orders with corrected prices (sample):`);
    if (fixedOrders && fixedOrders.length > 0) {
      fixedOrders.forEach(order => {
        console.log(`  ${order.order_number}: $${order.total_amount}`);
      });
    }

    // Check if any orders still at $0
    const { count: stillZero } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('total_amount', 0)
      .not('services', 'is', null);

    console.log(`\n⚠️  Orders still at $0: ${stillZero || 0}`);

    return true;

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    throw err;
  }
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 FIX ZERO PRICES - SAFE MIGRATION EXECUTOR');
  console.log('='.repeat(60));
  console.log('This script will:');
  console.log('  1. Analyze orders with $0 total but have services');
  console.log('  2. Create automatic backup before changes');
  console.log('  3. Recalculate prices from services JSON');
  console.log('  4. Verify results and show summary');
  console.log('='.repeat(60));

  // Preflight check
  const checkPassed = await preflightCheck();
  if (!checkPassed) {
    console.log('\n❌ Preflight check failed. Exiting.');
    process.exit(1);
  }

  // Analyze affected orders
  const analysis = await analyzeAffectedOrders();

  if (analysis.count === 0) {
    console.log('\n✅ No orders need correction. Exiting.');
    process.exit(0);
  }

  // Ask for confirmation
  console.log('\n⚠️  WARNING: This will modify order data in the database.');
  console.log('   A backup will be created automatically (orders_backup_20251122)');
  const answer = await askQuestion('\n❓ Do you want to proceed? (yes/no): ');

  if (answer !== 'yes' && answer !== 'y') {
    console.log('\n❌ Operation cancelled by user.');
    process.exit(0);
  }

  console.log('\n⚠️  IMPORTANT: This script cannot execute SQL directly.');
  console.log('   Please execute the migration file manually:\n');
  console.log('   📁 File: supabase/migrations/20251122000003_recalculate_zero_prices_comprehensive.sql\n');
  console.log('   Methods:');
  console.log('   1. Supabase Dashboard → SQL Editor → Paste contents');
  console.log('   2. Command: npx supabase db push (if using local dev)');
  console.log('   3. pgAdmin or psql client\n');

  const executeManually = await askQuestion('❓ Have you executed the migration manually? (yes/no): ');

  if (executeManually === 'yes' || executeManually === 'y') {
    await verifyResults();
    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('Next steps:');
    console.log('  1. Review the verification results above');
    console.log('  2. Check orders in the dashboard');
    console.log('  3. If everything looks good, you can drop the backup table');
    console.log('     (or keep it for safety)\n');
  } else {
    console.log('\n⏸️  Migration pending manual execution.');
    console.log('   Run this script again after executing the SQL file.\n');
  }
}

// Run main
main().catch(err => {
  console.error('\n❌ FATAL ERROR:', err);
  process.exit(1);
});
