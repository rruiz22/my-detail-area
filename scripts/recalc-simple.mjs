/**
 * Recalculate Order Totals - Simplified Version
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    // Step 2: Show backup
    console.log('💾 Step 2: Orders to update (backup reference):');
    console.log('   =====================================');
    ordersToUpdate.forEach((order, idx) => {
      console.log(`   ${idx + 1}. Order: ${order.order_number} | Stock: ${order.stock_number} | Old Total: $${order.total_amount}`);
    });
    console.log('   =====================================\n');

    // Step 3: Recalculate and update each order
    console.log('🔄 Step 3: Recalculating totals...\n');

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
          console.log(`   ✅ Updated: ${order.order_number} | Stock: ${order.stock_number || 'N/A'} | Old: $${order.total_amount} → New: $${newTotal.toFixed(2)}`);
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
        console.log(`   ${order.order_number} | Stock: ${order.stock_number || 'N/A'} | Total: $${order.total_amount} | Services: ${serviceCount}`);
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
