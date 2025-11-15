#!/usr/bin/env node

/**
 * Recalculate Order Totals - Fix for orders with $0.00
 *
 * This script recalculates total_amount for orders that have services but show $0.00
 * This fixes orders created by users without pricing permissions.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration (from src/integrations/supabase/client.ts)
const supabaseUrl = "https://swfnnrpzpkdypbrzmgnr.supabase.co";

// Load service role key from .env for admin operations
const envPath = join(dirname(__dirname), '.env');
const envContent = readFileSync(envPath, 'utf-8');
let supabaseKey = null;

envContent.split('\n').forEach(line => {
  const match = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
  if (match) {
    supabaseKey = match[1].trim();
  }
});

if (!supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_ACCESS_TOKEN in .env file');
  console.error('   This script requires service_role key for admin operations');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Starting order totals recalculation...\n');

async function recalculateOrderTotals() {
  try {
    // Step 1: Find orders with $0.00 but have services
    console.log('📊 Step 1: Finding orders with $0.00 that have services...');

    const { data: affectedOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, stock_number, order_type, services, total_amount, created_at')
      .eq('total_amount', 0)
      .not('services', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching orders:', fetchError);
      return;
    }

    // Filter orders that have at least one service
    const ordersToUpdate = affectedOrders.filter(order => {
      try {
        const services = order.services;
        return services && Array.isArray(services) && services.length > 0;
      } catch {
        return false;
      }
    });

    console.log(`   Found ${ordersToUpdate.length} orders to update\n`);

    if (ordersToUpdate.length === 0) {
      console.log('✅ No orders need updating. All totals are correct!');
      return;
    }

    // Step 2: Create backup (log to console)
    console.log('💾 Step 2: Backing up affected orders...');
    console.log('   Backup data (for reference):');
    console.log('   =====================================');
    ordersToUpdate.forEach(order => {
      console.log(`   Order: ${order.order_number} | Stock: ${order.stock_number} | Old Total: $${order.total_amount}`);
    });
    console.log('   =====================================\n');

    // Step 3: Recalculate and update each order
    console.log('🔄 Step 3: Recalculating totals...');

    let successCount = 0;
    let errorCount = 0;

    for (const order of ordersToUpdate) {
      try {
        // Calculate new total from services
        const services = order.services;
        const newTotal = services.reduce((sum, service) => {
          const price = parseFloat(service.price) || 0;
          return sum + price;
        }, 0);

        // Update order with new total
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            total_amount: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`   ❌ Failed to update order ${order.order_number}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Updated: ${order.order_number} | Stock: ${order.stock_number} | Old: $${order.total_amount} → New: $${newTotal.toFixed(2)}`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error processing order ${order.order_number}:`, err.message);
        errorCount++;
      }
    }

    // Step 4: Summary
    console.log('\n=====================================');
    console.log('📊 RECALCULATION SUMMARY');
    console.log('=====================================');
    console.log(`✅ Successfully updated: ${successCount} orders`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update: ${errorCount} orders`);
    }
    console.log('=====================================\n');

    // Step 5: Verification
    console.log('🔍 Step 4: Verifying updates...');

    const { data: verifyOrders, error: verifyError } = await supabase
      .from('orders')
      .select('order_number, stock_number, total_amount, services')
      .in('id', ordersToUpdate.map(o => o.id));

    if (!verifyError && verifyOrders) {
      console.log('   Updated orders verification:');
      console.log('   =====================================');
      verifyOrders.forEach(order => {
        const serviceCount = order.services?.length || 0;
        console.log(`   ${order.order_number} | Stock: ${order.stock_number} | Total: $${order.total_amount} | Services: ${serviceCount}`);
      });
      console.log('   =====================================\n');
    }

    console.log('✅ Recalculation completed successfully!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
recalculateOrderTotals();
