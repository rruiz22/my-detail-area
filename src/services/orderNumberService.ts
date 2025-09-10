/**
 * Order Number Service - Consistent formatting across all modules
 * Generates standardized order numbers with module-specific prefixes
 */

import { supabase } from '@/integrations/supabase/client';

export type OrderType = 'sales' | 'service' | 'carwash' | 'recon';

export interface OrderNumberFormat {
  prefix: string;
  fullNumber: string;
  sequence: number;
}

export class OrderNumberService {
  private readonly prefixes: Record<OrderType, string> = {
    sales: 'SA',
    service: 'SE', 
    carwash: 'CW',
    recon: 'RC'
  };

  private readonly tableNames: Record<OrderType, string> = {
    sales: 'sales_orders',
    service: 'service_orders',
    carwash: 'car_wash_orders', 
    recon: 'recon_orders'
  };

  /**
   * Generate next order number for specific type
   */
  async generateOrderNumber(orderType: OrderType, dealerId?: number): Promise<string> {
    try {
      const prefix = this.prefixes[orderType];
      const year = new Date().getFullYear();
      
      // Get last order number for this type and year
      const lastSequence = await this.getLastSequenceNumber(orderType, year);
      const nextSequence = lastSequence + 1;
      
      // Format: SA-2025-00001, SE-2025-00001, etc.
      const formattedNumber = `${prefix}-${year}-${nextSequence.toString().padStart(5, '0')}`;
      
      console.log(`🔢 Generated order number: ${formattedNumber} (type: ${orderType}, sequence: ${nextSequence})`);
      
      return formattedNumber;
      
    } catch (error) {
      console.error('❌ Error generating order number:', error);
      // Fallback to simple format if generation fails
      const prefix = this.prefixes[orderType];
      const timestamp = Date.now().toString().slice(-5);
      return `${prefix}-${timestamp}`;
    }
  }

  /**
   * Get last sequence number for order type and year
   */
  private async getLastSequenceNumber(orderType: OrderType, year: number): Promise<number> {
    try {
      const tableName = this.tableNames[orderType];
      const prefix = this.prefixes[orderType];
      const yearPrefix = `${prefix}-${year}-`;
      
      // Query for highest order number with this year prefix
      const { data, error } = await supabase
        .from(tableName)
        .select('order_number')
        .ilike('order_number', `${yearPrefix}%`)
        .order('order_number', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Error querying last sequence:', error);
        return 0;
      }

      if (data && data.length > 0 && data[0].order_number) {
        // Extract sequence from order number: SA-2025-00123 -> 123
        const lastNumber = data[0].order_number;
        const sequencePart = lastNumber.split('-')[2];
        return parseInt(sequencePart) || 0;
      }

      return 0;
      
    } catch (error) {
      console.error('Error getting last sequence:', error);
      return 0;
    }
  }

  /**
   * Validate order number format
   */
  validateOrderNumber(orderNumber: string, orderType: OrderType): boolean {
    const prefix = this.prefixes[orderType];
    const regex = new RegExp(`^${prefix}-\\d{4}-\\d{5}$`);
    return regex.test(orderNumber);
  }

  /**
   * Parse order number components
   */
  parseOrderNumber(orderNumber: string): OrderNumberFormat | null {
    try {
      const parts = orderNumber.split('-');
      if (parts.length !== 3) return null;
      
      const [prefix, year, sequence] = parts;
      
      return {
        prefix,
        fullNumber: orderNumber,
        sequence: parseInt(sequence)
      };
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Get order type from order number
   */
  getOrderTypeFromNumber(orderNumber: string): OrderType | null {
    for (const [type, prefix] of Object.entries(this.prefixes)) {
      if (orderNumber.startsWith(`${prefix}-`)) {
        return type as OrderType;
      }
    }
    return null;
  }

  /**
   * Migrate existing order numbers to new format
   */
  async migrateExistingOrders(): Promise<void> {
    console.log('🔄 Starting order number migration...');
    
    for (const [orderType, tableName] of Object.entries(this.tableNames)) {
      try {
        console.log(`📋 Migrating ${orderType} orders in ${tableName}...`);
        
        // Get all orders without proper format
        const { data: orders, error } = await supabase
          .from(tableName)
          .select('id, order_number')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!orders || orders.length === 0) {
          console.log(`✅ No orders to migrate in ${tableName}`);
          continue;
        }

        // Update each order with new format
        let sequenceCounter = 1;
        const prefix = this.prefixes[orderType as OrderType];
        const year = new Date().getFullYear();
        
        for (const order of orders) {
          // Skip if already has correct format
          if (this.validateOrderNumber(order.order_number || '', orderType as OrderType)) {
            continue;
          }

          const newOrderNumber = `${prefix}-${year}-${sequenceCounter.toString().padStart(5, '0')}`;
          
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ 
              order_number: newOrderNumber,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Error updating order ${order.id}:`, updateError);
          } else {
            console.log(`✅ Updated ${order.id}: ${order.order_number} → ${newOrderNumber}`);
          }

          sequenceCounter++;
        }
        
        console.log(`✅ Completed ${orderType} migration (${sequenceCounter - 1} orders)`);
        
      } catch (error) {
        console.error(`❌ Error migrating ${orderType} orders:`, error);
      }
    }
    
    console.log('🎉 Order number migration completed!');
  }

  /**
   * Display format for UI (with proper spacing)
   */
  formatDisplayNumber(orderNumber: string): string {
    // Add proper spacing for readability: SA-2025-00001 → SA-2025-00001
    return orderNumber.replace(/-/g, '-');
  }
}

// Export singleton instance
export const orderNumberService = new OrderNumberService();