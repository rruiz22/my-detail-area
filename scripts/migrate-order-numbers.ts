/**
 * Migration Script - Update existing order numbers to new format
 * Run this script to migrate existing orders to SA-, SE-, CW-, RC- format
 */

import { supabase } from '../src/integrations/supabase/client';
import { orderNumberService, OrderType } from '../src/services/orderNumberService';

interface OrderToMigrate {
  id: string;
  order_number: string | null;
  created_at: string;
  order_type?: string;
}

export class OrderNumberMigration {
  
  /**
   * Migrate all order types to new format
   */
  async migrateAllOrders(): Promise<void> {
    console.log('🚀 Starting comprehensive order number migration...');
    console.log('📋 Format: SA-2025-00001, SE-2025-00001, CW-2025-00001, RC-2025-00001');
    
    try {
      // Migrate each order type
      await this.migrateSalesOrders();
      await this.migrateServiceOrders();
      await this.migrateCarWashOrders();
      await this.migrateReconOrders();
      
      console.log('🎉 All order number migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate Sales Orders to SA-YYYY-NNNNN format
   */
  private async migrateSalesOrders(): Promise<void> {
    console.log('\n📊 Migrating Sales Orders...');
    
    const { data: orders, error } = await supabase
      .from('sales_orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    if (!orders || orders.length === 0) {
      console.log('✅ No sales orders to migrate');
      return;
    }

    let sequenceCounter = 1;
    const year = new Date().getFullYear();

    for (const order of orders) {
      // Skip if already has correct format
      if (orderNumberService.validateOrderNumber(order.order_number || '', 'sales')) {
        console.log(`⏭️  Skipping ${order.order_number} (already correct format)`);
        continue;
      }

      const newOrderNumber = `SA-${year}-${sequenceCounter.toString().padStart(5, '0')}`;
      
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ 
          order_number: newOrderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error updating sales order ${order.id}:`, updateError);
      } else {
        console.log(`✅ Sales Order: ${order.order_number || order.id} → ${newOrderNumber}`);
      }

      sequenceCounter++;
    }
    
    console.log(`✅ Sales Orders migration complete: ${sequenceCounter - 1} orders updated`);
  }

  /**
   * Migrate Service Orders to SE-YYYY-NNNNN format
   */
  private async migrateServiceOrders(): Promise<void> {
    console.log('\n🔧 Migrating Service Orders...');
    
    const { data: orders, error } = await supabase
      .from('service_orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    if (!orders || orders.length === 0) {
      console.log('✅ No service orders to migrate');
      return;
    }

    let sequenceCounter = 1;
    const year = new Date().getFullYear();

    for (const order of orders) {
      if (orderNumberService.validateOrderNumber(order.order_number || '', 'service')) {
        console.log(`⏭️  Skipping ${order.order_number} (already correct format)`);
        continue;
      }

      const newOrderNumber = `SE-${year}-${sequenceCounter.toString().padStart(5, '0')}`;
      
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ 
          order_number: newOrderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error updating service order ${order.id}:`, updateError);
      } else {
        console.log(`✅ Service Order: ${order.order_number || order.id} → ${newOrderNumber}`);
      }

      sequenceCounter++;
    }
    
    console.log(`✅ Service Orders migration complete: ${sequenceCounter - 1} orders updated`);
  }

  /**
   * Migrate Car Wash Orders to CW-YYYY-NNNNN format
   */
  private async migrateCarWashOrders(): Promise<void> {
    console.log('\n🚗 Migrating Car Wash Orders...');
    
    const { data: orders, error } = await supabase
      .from('car_wash_orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    if (!orders || orders.length === 0) {
      console.log('✅ No car wash orders to migrate');
      return;
    }

    let sequenceCounter = 1;
    const year = new Date().getFullYear();

    for (const order of orders) {
      if (orderNumberService.validateOrderNumber(order.order_number || '', 'carwash')) {
        console.log(`⏭️  Skipping ${order.order_number} (already correct format)`);
        continue;
      }

      const newOrderNumber = `CW-${year}-${sequenceCounter.toString().padStart(5, '0')}`;
      
      const { error: updateError } = await supabase
        .from('car_wash_orders')
        .update({ 
          order_number: newOrderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error updating car wash order ${order.id}:`, updateError);
      } else {
        console.log(`✅ Car Wash Order: ${order.order_number || order.id} → ${newOrderNumber}`);
      }

      sequenceCounter++;
    }
    
    console.log(`✅ Car Wash Orders migration complete: ${sequenceCounter - 1} orders updated`);
  }

  /**
   * Migrate Recon Orders to RC-YYYY-NNNNN format
   */
  private async migrateReconOrders(): Promise<void> {
    console.log('\n🔄 Migrating Recon Orders...');
    
    const { data: orders, error } = await supabase
      .from('recon_orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    if (!orders || orders.length === 0) {
      console.log('✅ No recon orders to migrate');
      return;
    }

    let sequenceCounter = 1;
    const year = new Date().getFullYear();

    for (const order of orders) {
      if (orderNumberService.validateOrderNumber(order.order_number || '', 'recon')) {
        console.log(`⏭️  Skipping ${order.order_number} (already correct format)`);
        continue;
      }

      const newOrderNumber = `RC-${year}-${sequenceCounter.toString().padStart(5, '0')}`;
      
      const { error: updateError } = await supabase
        .from('recon_orders')
        .update({ 
          order_number: newOrderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error updating recon order ${order.id}:`, updateError);
      } else {
        console.log(`✅ Recon Order: ${order.order_number || order.id} → ${newOrderNumber}`);
      }

      sequenceCounter++;
    }
    
    console.log(`✅ Recon Orders migration complete: ${sequenceCounter - 1} orders updated`);
  }

  /**
   * Verify migration results
   */
  async verifyMigration(): Promise<void> {
    console.log('\n🔍 Verifying migration results...');
    
    const orderTypes: OrderType[] = ['sales', 'service', 'carwash', 'recon'];
    const tableNames = {
      sales: 'sales_orders',
      service: 'service_orders', 
      carwash: 'car_wash_orders',
      recon: 'recon_orders'
    };

    for (const orderType of orderTypes) {
      try {
        const { data: orders, error } = await supabase
          .from(tableNames[orderType])
          .select('order_number')
          .limit(5);

        if (error) throw error;
        
        console.log(`📋 ${orderType.toUpperCase()} Orders sample:`);
        orders?.forEach(order => {
          const isValid = orderNumberService.validateOrderNumber(order.order_number || '', orderType);
          console.log(`  ${isValid ? '✅' : '❌'} ${order.order_number}`);
        });
        
      } catch (error) {
        console.error(`❌ Error verifying ${orderType} orders:`, error);
      }
    }
  }
}

// Export migration instance
export const orderNumberMigration = new OrderNumberMigration();

// Run migration if called directly
if (typeof window === 'undefined') {
  // Node.js environment - can run migration
  console.log('🔄 Order Number Migration Ready');
  console.log('📋 Available commands:');
  console.log('  - orderNumberMigration.migrateAllOrders()');
  console.log('  - orderNumberMigration.verifyMigration()');
}