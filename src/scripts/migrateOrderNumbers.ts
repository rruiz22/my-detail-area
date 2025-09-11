/**
 * Order Number Migration Script
 * 
 * This script migrates existing order numbers to the new format:
 * SA-000001, SE-000001, CW-000001, RC-000001
 * 
 * Usage:
 * 1. From admin panel: Management → System Tools → Run Migration
 * 2. From console: import { runOrderNumberMigration } from '@/scripts/migrateOrderNumbers'
 * 3. From browser console: window.runOrderNumberMigration()
 */

import { orderNumberService } from '@/services/orderNumberService';

export async function runOrderNumberMigration(): Promise<void> {
  console.log('🚀 Starting Order Number Migration Script...');
  console.log('📝 New format: SA-000001, SE-000001, CW-000001, RC-000001');
  console.log('⚠️  This will update all existing orders with new order numbers');
  
  try {
    await orderNumberService.migrateExistingOrders();
    console.log('✅ Migration completed successfully!');
    console.log('🔄 Please refresh the page to see updated order numbers');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Make it available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).runOrderNumberMigration = runOrderNumberMigration;
}

export default runOrderNumberMigration;