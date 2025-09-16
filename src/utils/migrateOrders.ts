/**
 * Browser-compatible migration utility
 * Can be run from browser console to migrate order numbers
 */

import { orderNumberService } from '@/services/orderNumberService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Simple migration function that can be called from browser console
 */
export async function migrateOrderNumbers() {
  console.log('🚀 Starting order number migration from browser...');
  console.log('📋 New format: SA-2025-00001, SE-2025-00001, CW-2025-00001, RC-2025-00001');

  try {
    // For now, let's focus on the main 'orders' table which seems to handle all types
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, order_type, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      console.log('✅ No orders found to migrate');
      return;
    }

    console.log(`📊 Found ${orders.length} orders to migrate`);

    // Group orders by type and migrate
    const ordersByType = {
      sales: orders.filter(o => o.order_type === 'sales'),
      service: orders.filter(o => o.order_type === 'service'),
      carwash: orders.filter(o => o.order_type === 'carwash'),
      recon: orders.filter(o => o.order_type === 'recon')
    };

    let totalMigrated = 0;
    const year = new Date().getFullYear();

    // Migrate each type
    for (const [type, typeOrders] of Object.entries(ordersByType)) {
      if (typeOrders.length === 0) continue;

      console.log(`\n🔧 Migrating ${type} orders (${typeOrders.length} orders)...`);
      
      const prefix = type === 'sales' ? 'SA' : 
                    type === 'service' ? 'SE' :
                    type === 'carwash' ? 'CW' : 'RC';

      let sequenceCounter = 1;

      for (const order of typeOrders) {
        // Skip if already has correct format
        if (order.order_number && order.order_number.startsWith(`${prefix}-${year}-`)) {
          console.log(`⏭️  Skipping ${order.order_number} (already migrated)`);
          continue;
        }

        const newOrderNumber = `${prefix}-${year}-${sequenceCounter.toString().padStart(5, '0')}`;

        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            order_number: newOrderNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ Error updating ${type} order ${order.id}:`, updateError);
        } else {
          console.log(`✅ ${type.toUpperCase()}: ${order.order_number || order.id} → ${newOrderNumber}`);
          totalMigrated++;
        }

        sequenceCounter++;
      }
    }

    console.log(`\n🎉 Migration completed! ${totalMigrated} orders updated`);
    console.log('🔄 Please refresh the page to see the new order numbers');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Make available globally for console access
(window as Record<string, unknown>).migrateOrderNumbers = migrateOrderNumbers;

console.log('🔧 Order migration utility loaded');
console.log('📋 Run: migrateOrderNumbers() in browser console to migrate orders');