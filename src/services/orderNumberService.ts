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

  /**
   * Generate next order number for specific type
   */
  async generateOrderNumber(orderType: OrderType, dealerId?: number): Promise<string> {
    try {
      const prefix = this.prefixes[orderType];

      // Get last order number for this type (global counter, no year)
      const lastSequence = await this.getLastSequenceNumber(orderType);
      const nextSequence = lastSequence + 1;

      // Format: SA-21, SE-22, CW-23, RC-24 (simple format without padding)
      const formattedNumber = `${prefix}-${nextSequence}`;

      console.log(`🔢 Generated order number: ${formattedNumber} (type: ${orderType}, sequence: ${nextSequence})`);

      return formattedNumber;

    } catch (error) {
      console.error('❌ Error generating order number:', error);
      // Fallback to simple format if generation fails
      const prefix = this.prefixes[orderType];
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}-${timestamp}`;
    }
  }

  /**
   * Get last sequence number for order type (global counter)
   */
  private async getLastSequenceNumber(orderType: OrderType): Promise<number> {
    try {
      const prefix = this.prefixes[orderType];
      const prefixPattern = `${prefix}-%`;

      // Query ALL order numbers for this type to find the highest sequence number
      const { data, error } = await supabase
        .from('orders')
        .select('order_number')
        .ilike('order_number', prefixPattern);

      if (error) {
        console.warn('Error querying last sequence:', error);
        return 20; // Start from 21 (20 + 1 = 21)
      }

      if (data && data.length > 0) {
        // Extract all sequence numbers and find the maximum
        let maxSequence = 0;

        for (const row of data) {
          if (row.order_number) {
            const parts = row.order_number.split('-');
            if (parts.length === 2) {
              const sequenceNum = parseInt(parts[1]) || 0;
              if (sequenceNum > maxSequence) {
                maxSequence = sequenceNum;
              }
            }
          }
        }

        console.log(`🔍 Found max sequence for ${orderType}: ${maxSequence} (from ${data.length} orders)`);
        return maxSequence;
      }

      return 20; // Start from 21 (20 + 1 = 21)

    } catch (error) {
      console.error('Error getting last sequence:', error);
      return 20; // Start from 21 (20 + 1 = 21)
    }
  }

  /**
   * Validate order number format
   */
  validateOrderNumber(orderNumber: string, orderType: OrderType): boolean {
    const prefix = this.prefixes[orderType];
    const regex = new RegExp(`^${prefix}-\\d+$`); // Accept any number of digits
    return regex.test(orderNumber);
  }

  /**
   * Parse order number components
   */
  parseOrderNumber(orderNumber: string): OrderNumberFormat | null {
    try {
      const parts = orderNumber.split('-');
      if (parts.length !== 2) return null;

      const [prefix, sequence] = parts;

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

    try {
      // Get all orders that need migration (orders without proper format)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, order_type, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!orders || orders.length === 0) {
        console.log(`✅ No orders to migrate`);
        return;
      }

      // Group orders by type and migrate each type with sequential numbering
      const ordersByType: Record<string, any[]> = {
        sales: [],
        service: [],
        carwash: [],
        recon: []
      };

      // Separate orders by type
      for (const order of orders) {
        const orderType = order.order_type || 'sales';
        if (ordersByType[orderType]) {
          ordersByType[orderType].push(order);
        }
      }

      // Migrate each order type with sequential numbers
      for (const [orderType, typeOrders] of Object.entries(ordersByType)) {
        if (typeOrders.length === 0) continue;

        console.log(`📋 Migrating ${typeOrders.length} ${orderType} orders...`);

        const prefix = this.prefixes[orderType as OrderType];
        let sequenceCounter = 21; // Start from 21

        for (const order of typeOrders) {
          // Skip if already has correct format
          if (order.order_number && this.validateOrderNumber(order.order_number, orderType as OrderType)) {
            // If it has correct format, extract the sequence to continue from there
            const parsed = this.parseOrderNumber(order.order_number);
            if (parsed && parsed.sequence >= sequenceCounter) {
              sequenceCounter = parsed.sequence + 1;
            }
            continue;
          }

          const newOrderNumber = `${prefix}-${sequenceCounter}`;

          const { error: updateError } = await supabase
            .from('orders')
            .update({
              order_number: newOrderNumber,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Error updating order ${order.id}:`, updateError);
          } else {
            console.log(`✅ Updated ${order.id}: ${order.order_number || 'NULL'} → ${newOrderNumber}`);
          }

          sequenceCounter++;
        }

        console.log(`✅ Completed ${orderType} migration (${sequenceCounter - 1} orders processed)`);
      }

    } catch (error) {
      console.error(`❌ Error migrating orders:`, error);
    }

    console.log('🎉 Order number migration completed!');
  }

  /**
   * Display format for UI (with proper spacing)
   */
  formatDisplayNumber(orderNumber: string): string {
    // Format: SA-000001 → SA-000001 (already properly formatted)
    return orderNumber;
  }
}

// Export singleton instance
export const orderNumberService = new OrderNumberService();
