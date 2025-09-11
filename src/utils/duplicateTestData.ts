/**
 * Test Data Generator for Duplicate Tooltip Testing
 * 
 * This utility creates realistic order data with known duplicates to test
 * the duplicate badge tooltip functionality in the sales module.
 */

import { Order } from '@/utils/duplicateUtils';

interface TestDataConfig {
  totalOrders?: number;
  duplicateStockRatio?: number; // Percentage of orders with duplicate stock numbers
  duplicateVinRatio?: number;   // Percentage of orders with duplicate VINs
  dealerIds?: number[];
  includeEdgeCases?: boolean;
}

class DuplicateTestDataGenerator {
  private static instance: DuplicateTestDataGenerator;
  
  static getInstance(): DuplicateTestDataGenerator {
    if (!DuplicateTestDataGenerator.instance) {
      DuplicateTestDataGenerator.instance = new DuplicateTestDataGenerator();
    }
    return DuplicateTestDataGenerator.instance;
  }

  private readonly stockPrefixes = ['ST', 'INV', 'VEH', 'AUTO', 'CAR'];
  private readonly vinPrefixes = ['1HGBH41JX', '2HGFA1F59', '3GNDA13D', '4T1BF1FK', '5NPE24AF'];
  private readonly dealerNames = ['Downtown Motors', 'City Auto', 'Premier Cars', 'Elite Vehicles', 'Metro Motors'];
  private readonly vehicleMakes = ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes'];
  private readonly vehicleModels = ['Civic', 'Camry', 'F-150', 'Malibu', 'Altima', '3 Series', 'C-Class'];
  private readonly statuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  private readonly customerNames = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson', 'David Brown'];

  /**
   * Generate a realistic VIN with controlled duplicates
   */
  private generateVin(duplicateGroup?: string): string {
    if (duplicateGroup) {
      // Return a VIN from a known duplicate group
      return duplicateGroup.padEnd(17, 'X');
    }
    
    const prefix = this.vinPrefixes[Math.floor(Math.random() * this.vinPrefixes.length)];
    const suffix = Math.random().toString(36).substring(2, 9).toUpperCase();
    return (prefix + suffix).padEnd(17, 'X').substring(0, 17);
  }

  /**
   * Generate a stock number with controlled duplicates
   */
  private generateStockNumber(duplicateGroup?: string): string {
    if (duplicateGroup) {
      return duplicateGroup;
    }
    
    const prefix = this.stockPrefixes[Math.floor(Math.random() * this.stockPrefixes.length)];
    const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${prefix}${number}`;
  }

  /**
   * Generate a realistic order with controlled duplicate potential
   */
  private generateOrder(
    index: number, 
    dealerId: number, 
    duplicateStock?: string, 
    duplicateVin?: string
  ): Order {
    const orderType = ['sales', 'service', 'recon', 'carwash'][Math.floor(Math.random() * 4)];
    const make = this.vehicleMakes[Math.floor(Math.random() * this.vehicleMakes.length)];
    const model = this.vehicleModels[Math.floor(Math.random() * this.vehicleModels.length)];
    const year = 2020 + Math.floor(Math.random() * 5);
    
    // Create a realistic creation date (last 90 days)
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 90));
    
    return {
      id: `test-order-${index}-${Date.now()}`,
      createdAt: createdAt.toISOString(),
      orderNumber: `${orderType.toUpperCase()}-${index.toString().padStart(6, '0')}`,
      customOrderNumber: `${orderType.charAt(0).toUpperCase()}${orderType.slice(1)}-${index}`,
      stockNumber: this.generateStockNumber(duplicateStock),
      vehicleVin: this.generateVin(duplicateVin),
      vehicleYear: year,
      vehicleMake: make,
      vehicleModel: model,
      vehicleInfo: `${year} ${make} ${model}`,
      customerName: this.customerNames[Math.floor(Math.random() * this.customerNames.length)],
      status: this.statuses[Math.floor(Math.random() * this.statuses.length)],
      dealer_id: dealerId,
      dealershipName: this.dealerNames[dealerId - 1] || `Dealer ${dealerId}`,
      order_type: orderType,
      dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Due in next 30 days
    };
  }

  /**
   * Generate test data with known duplicates
   */
  generateTestData(config: TestDataConfig = {}): {
    orders: Order[];
    duplicateGroups: {
      stock: Array<{ value: string; orderIds: string[] }>;
      vin: Array<{ value: string; orderIds: string[] }>;
    };
    metadata: {
      totalOrders: number;
      expectedDuplicates: number;
      dealerIds: number[];
    };
  } {
    const {
      totalOrders = 20,
      duplicateStockRatio = 0.3, // 30% of orders will have duplicate stock numbers
      duplicateVinRatio = 0.2,   // 20% of orders will have duplicate VINs
      dealerIds = [1, 2, 3],
      includeEdgeCases = true
    } = config;

    console.log('🧪 Generating test data with duplicates:', {
      totalOrders,
      duplicateStockRatio,
      duplicateVinRatio,
      dealerIds,
      includeEdgeCases
    });

    const orders: Order[] = [];
    const stockDuplicateGroups: Array<{ value: string; orderIds: string[] }> = [];
    const vinDuplicateGroups: Array<{ value: string; orderIds: string[] }> = [];

    // Calculate how many orders should have duplicates
    const stockDuplicateCount = Math.floor(totalOrders * duplicateStockRatio);
    const vinDuplicateCount = Math.floor(totalOrders * duplicateVinRatio);

    // Create duplicate stock number groups
    const stockGroups = new Map<string, string[]>();
    for (let i = 0; i < stockDuplicateCount; i += 2) {
      const stockNumber = `DUPLICATE-ST${Math.floor(i / 2).toString().padStart(3, '0')}`;
      stockGroups.set(stockNumber, []);
    }

    // Create duplicate VIN groups
    const vinGroups = new Map<string, string[]>();
    for (let i = 0; i < vinDuplicateCount; i += 2) {
      const vin = `DUPLICATE-VIN${Math.floor(i / 2).toString().padStart(2, '0')}`;
      vinGroups.set(vin, []);
    }

    // Generate orders with controlled duplicates
    for (let i = 0; i < totalOrders; i++) {
      const dealerId = dealerIds[i % dealerIds.length];
      
      // Determine if this order should have duplicates
      const shouldHaveStockDuplicate = i < stockDuplicateCount;
      const shouldHaveVinDuplicate = i < vinDuplicateCount;
      
      // Get duplicate values if applicable
      const stockDuplicate = shouldHaveStockDuplicate 
        ? Array.from(stockGroups.keys())[Math.floor(i / 2) % stockGroups.size]
        : undefined;
        
      const vinDuplicate = shouldHaveVinDuplicate 
        ? Array.from(vinGroups.keys())[Math.floor(i / 2) % vinGroups.size]
        : undefined;

      const order = this.generateOrder(i, dealerId, stockDuplicate, vinDuplicate);
      orders.push(order);

      // Track duplicate groups
      if (stockDuplicate && stockGroups.has(stockDuplicate)) {
        stockGroups.get(stockDuplicate)!.push(order.id);
      }
      
      if (vinDuplicate && vinGroups.has(vinDuplicate)) {
        vinGroups.get(vinDuplicate)!.push(order.id);
      }
    }

    // Add edge cases if requested
    if (includeEdgeCases) {
      this.addEdgeCases(orders, dealerIds);
    }

    // Build duplicate group arrays
    stockGroups.forEach((orderIds, value) => {
      if (orderIds.length > 1) {
        stockDuplicateGroups.push({ value, orderIds });
      }
    });

    vinGroups.forEach((orderIds, value) => {
      if (orderIds.length > 1) {
        vinDuplicateGroups.push({ value, orderIds });
      }
    });

    const result = {
      orders,
      duplicateGroups: {
        stock: stockDuplicateGroups,
        vin: vinDuplicateGroups
      },
      metadata: {
        totalOrders: orders.length,
        expectedDuplicates: stockDuplicateGroups.length + vinDuplicateGroups.length,
        dealerIds
      }
    };

    console.log('✅ Test data generated successfully:', {
      totalOrders: result.metadata.totalOrders,
      stockDuplicateGroups: result.duplicateGroups.stock.length,
      vinDuplicateGroups: result.duplicateGroups.vin.length,
      expectedDuplicates: result.metadata.expectedDuplicates
    });

    return result;
  }

  /**
   * Add edge cases for testing robustness
   */
  private addEdgeCases(orders: Order[], dealerIds: number[]): void {
    const edgeCases = [
      // Empty/null values
      this.generateOrder(9999, dealerIds[0], '', ''),
      
      // Very long values
      this.generateOrder(9998, dealerIds[0], 'VERY-LONG-STOCK-NUMBER-12345', 'VERY-LONG-VIN-123456'),
      
      // Special characters
      this.generateOrder(9997, dealerIds[0], 'ST-123/ABC', 'VIN@123#ABC'),
      
      // Case sensitivity test
      this.generateOrder(9996, dealerIds[0], 'lowercase-test', 'lowercase-vin-test'),
      this.generateOrder(9995, dealerIds[0], 'LOWERCASE-TEST', 'LOWERCASE-VIN-TEST'),
    ];

    orders.push(...edgeCases);
  }

  /**
   * Create a quick test dataset for immediate debugging
   */
  createQuickTestData(): Order[] {
    console.log('🚀 Creating quick test data with guaranteed duplicates...');
    
    return [
      {
        id: 'quick-test-1',
        createdAt: new Date().toISOString(),
        stockNumber: 'DUPLICATE-ST001',
        vehicleVin: 'DUPLICATE-VIN123456',
        customerName: 'Test Customer 1',
        status: 'pending',
        dealer_id: 1,
        dealershipName: 'Test Dealer',
        vehicleYear: 2024,
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        order_type: 'sales'
      },
      {
        id: 'quick-test-2',
        createdAt: new Date().toISOString(),
        stockNumber: 'DUPLICATE-ST001', // DUPLICATE STOCK
        vehicleVin: 'UNIQUE-VIN789012',
        customerName: 'Test Customer 2',
        status: 'in_progress',
        dealer_id: 1,
        dealershipName: 'Test Dealer',
        vehicleYear: 2024,
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        order_type: 'sales'
      },
      {
        id: 'quick-test-3',
        createdAt: new Date().toISOString(),
        stockNumber: 'UNIQUE-ST002',
        vehicleVin: 'DUPLICATE-VIN123456', // DUPLICATE VIN
        customerName: 'Test Customer 3',
        status: 'completed',
        dealer_id: 1,
        dealershipName: 'Test Dealer',
        vehicleYear: 2024,
        vehicleMake: 'Ford',
        vehicleModel: 'F-150',
        order_type: 'sales'
      }
    ];
  }

  /**
   * Validate that test data contains expected duplicates
   */
  validateTestData(orders: Order[]): {
    isValid: boolean;
    stockDuplicates: number;
    vinDuplicates: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let stockDuplicates = 0;
    let vinDuplicates = 0;

    // Check for stock duplicates
    const stockMap = new Map<string, number>();
    const vinMap = new Map<string, number>();

    orders.forEach(order => {
      if (order.stockNumber) {
        stockMap.set(order.stockNumber, (stockMap.get(order.stockNumber) || 0) + 1);
      }
      if (order.vehicleVin) {
        vinMap.set(order.vehicleVin, (vinMap.get(order.vehicleVin) || 0) + 1);
      }
    });

    // Count actual duplicates
    stockMap.forEach((count, stock) => {
      if (count > 1) stockDuplicates++;
    });

    vinMap.forEach((count, vin) => {
      if (count > 1) vinDuplicates++;
    });

    // Validate minimum expectations
    if (stockDuplicates === 0) {
      issues.push('No stock number duplicates found');
    }

    if (vinDuplicates === 0) {
      issues.push('No VIN duplicates found');
    }

    if (orders.length === 0) {
      issues.push('No orders generated');
    }

    return {
      isValid: issues.length === 0,
      stockDuplicates,
      vinDuplicates,
      issues
    };
  }
}

// Export singleton instance
export const duplicateTestDataGenerator = DuplicateTestDataGenerator.getInstance();

// Export utility functions for browser console
if (typeof window !== 'undefined') {
  (window as any).generateTestData = (config?: TestDataConfig) => 
    duplicateTestDataGenerator.generateTestData(config);
  
  (window as any).createQuickTestData = () => 
    duplicateTestDataGenerator.createQuickTestData();
  
  (window as any).validateTestData = (orders: Order[]) => 
    duplicateTestDataGenerator.validateTestData(orders);
}