/**
 * Tooltip Debug Utility
 * 
 * This utility helps diagnose tooltip issues by providing comprehensive logging
 * and testing functionality for the DuplicateTooltip component.
 */

interface DebugOrder {
  id: string;
  stockNumber?: string;
  vehicleVin?: string;
  dealer_id?: number;
  status: string;
  createdAt: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
}

export class TooltipDebugger {
  private static instance: TooltipDebugger;
  private debugMode = false;

  static getInstance(): TooltipDebugger {
    if (!TooltipDebugger.instance) {
      TooltipDebugger.instance = new TooltipDebugger();
    }
    return TooltipDebugger.instance;
  }

  enableDebug() {
    this.debugMode = true;
    console.log('🐛 Tooltip Debug Mode ENABLED');
  }

  disableDebug() {
    this.debugMode = false;
    console.log('🐛 Tooltip Debug Mode DISABLED');
  }

  log(message: string, data?: unknown) {
    if (this.debugMode) {
      console.log(`🔍 [TOOLTIP DEBUG] ${message}`, data || '');
    }
  }

  analyzeOrders(orders: DebugOrder[]): {
    totalOrders: number;
    ordersWithStock: number;
    ordersWithVin: number;
    potentialStockDuplicates: Array<{value: string; count: number; orderIds: string[]}>;
    potentialVinDuplicates: Array<{value: string; count: number; orderIds: string[]}>;
  } {
    this.log('Starting order analysis', { orderCount: orders.length });

    const stockMap = new Map<string, string[]>();
    const vinMap = new Map<string, string[]>();

    orders.forEach(order => {
      // Analyze stock numbers
      if (order.stockNumber && order.stockNumber.trim()) {
        const normalized = order.stockNumber.trim().toLowerCase();
        if (!stockMap.has(normalized)) {
          stockMap.set(normalized, []);
        }
        stockMap.get(normalized)!.push(order.id);
      }

      // Analyze VINs
      if (order.vehicleVin && order.vehicleVin.trim()) {
        const normalized = order.vehicleVin.trim().toLowerCase().replace(/[-\s]/g, '');
        if (!vinMap.has(normalized)) {
          vinMap.set(normalized, []);
        }
        vinMap.get(normalized)!.push(order.id);
      }
    });

    const potentialStockDuplicates = Array.from(stockMap.entries())
      .filter(([_, orderIds]) => orderIds.length > 1)
      .map(([value, orderIds]) => ({ value, count: orderIds.length, orderIds }));

    const potentialVinDuplicates = Array.from(vinMap.entries())
      .filter(([_, orderIds]) => orderIds.length > 1)
      .map(([value, orderIds]) => ({ value, count: orderIds.length, orderIds }));

    const analysis = {
      totalOrders: orders.length,
      ordersWithStock: orders.filter(o => o.stockNumber && o.stockNumber.trim()).length,
      ordersWithVin: orders.filter(o => o.vehicleVin && o.vehicleVin.trim()).length,
      potentialStockDuplicates,
      potentialVinDuplicates
    };

    this.log('Order analysis complete', analysis);
    return analysis;
  }

  testTooltipConditions(orders: DebugOrder[], targetOrderId: string): {
    orderFound: boolean;
    stockDuplicateCount: number;
    vinDuplicateCount: number;
    shouldShowStockTooltip: boolean;
    shouldShowVinTooltip: boolean;
    stockDuplicateOrders: DebugOrder[];
    vinDuplicateOrders: DebugOrder[];
  } {
    const targetOrder = orders.find(o => o.id === targetOrderId);
    
    if (!targetOrder) {
      this.log(`Order ${targetOrderId} not found`);
      return {
        orderFound: false,
        stockDuplicateCount: 0,
        vinDuplicateCount: 0,
        shouldShowStockTooltip: false,
        shouldShowVinTooltip: false,
        stockDuplicateOrders: [],
        vinDuplicateOrders: []
      };
    }

    this.log(`Testing tooltip conditions for order ${targetOrderId}`, targetOrder);

    // Test stock duplicates
    const stockDuplicateOrders = orders.filter(order => {
      if (!targetOrder.stockNumber || !order.stockNumber) return false;
      if (targetOrder.dealer_id !== order.dealer_id) return false;
      
      const targetNormalized = targetOrder.stockNumber.trim().toLowerCase();
      const orderNormalized = order.stockNumber.trim().toLowerCase();
      
      return targetNormalized === orderNormalized;
    });

    // Test VIN duplicates
    const vinDuplicateOrders = orders.filter(order => {
      if (!targetOrder.vehicleVin || !order.vehicleVin) return false;
      if (targetOrder.dealer_id !== order.dealer_id) return false;
      
      const targetNormalized = targetOrder.vehicleVin.trim().toLowerCase().replace(/[-\s]/g, '');
      const orderNormalized = order.vehicleVin.trim().toLowerCase().replace(/[-\s]/g, '');
      
      return targetNormalized === orderNormalized;
    });

    const result = {
      orderFound: true,
      stockDuplicateCount: stockDuplicateOrders.length,
      vinDuplicateCount: vinDuplicateOrders.length,
      shouldShowStockTooltip: stockDuplicateOrders.length > 1,
      shouldShowVinTooltip: vinDuplicateOrders.length > 1,
      stockDuplicateOrders,
      vinDuplicateOrders
    };

    this.log(`Tooltip test results for ${targetOrderId}`, result);
    return result;
  }

  checkTooltipImplementation(): {
    hasTooltipProvider: boolean;
    hasRadixTooltip: boolean;
    hasCustomTooltipComponent: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if TooltipProvider exists in DOM
    const hasTooltipProvider = !!document.querySelector('[data-radix-tooltip-provider]');
    if (!hasTooltipProvider) {
      issues.push('TooltipProvider not found in DOM');
    }

    // Check if Radix tooltip is available
    const hasRadixTooltip = typeof window !== 'undefined' && 
      document.querySelector('[data-radix-tooltip-trigger]') !== null;

    // Check if custom tooltip component is loaded
    const hasCustomTooltipComponent = !!document.querySelector('[data-duplicate-tooltip]');

    if (!hasRadixTooltip) {
      issues.push('Radix Tooltip triggers not found');
    }

    const result = {
      hasTooltipProvider,
      hasRadixTooltip,
      hasCustomTooltipComponent,
      issues
    };

    this.log('Tooltip implementation check', result);
    return result;
  }

  /**
   * Create test orders with known duplicates for debugging
   */
  createTestOrders(): DebugOrder[] {
    return [
      {
        id: "test-order-1",
        stockNumber: "ST001",
        vehicleVin: "1HGBH41JXMN109186",
        dealer_id: 1,
        status: "pending",
        createdAt: "2024-01-01T10:00:00Z",
        vehicleYear: 2024,
        vehicleMake: "Honda",
        vehicleModel: "Civic"
      },
      {
        id: "test-order-2",
        stockNumber: "ST001", // DUPLICATE STOCK
        vehicleVin: "2HGBH41JXMN109187",
        dealer_id: 1,
        status: "in_progress",
        createdAt: "2024-01-02T10:00:00Z",
        vehicleYear: 2024,
        vehicleMake: "Toyota",
        vehicleModel: "Camry"
      },
      {
        id: "test-order-3",
        stockNumber: "ST002",
        vehicleVin: "1HGBH41JXMN109186", // DUPLICATE VIN
        dealer_id: 1,
        status: "completed",
        createdAt: "2024-01-03T10:00:00Z",
        vehicleYear: 2024,
        vehicleMake: "Honda",
        vehicleModel: "Accord"
      },
      {
        id: "test-order-4",
        stockNumber: "ST003",
        vehicleVin: "3HGBH41JXMN109188",
        dealer_id: 2, // Different dealer
        status: "pending",
        createdAt: "2024-01-04T10:00:00Z",
        vehicleYear: 2024,
        vehicleMake: "Ford",
        vehicleModel: "F-150"
      }
    ];
  }

  /**
   * Run a full diagnostic test
   */
  runFullDiagnostic(orders?: DebugOrder[]): void {
    this.enableDebug();
    
    console.log('🔧 Running Full Tooltip Diagnostic...');
    
    const testOrders = orders || this.createTestOrders();
    
    // 1. Analyze order data
    const analysis = this.analyzeOrders(testOrders);
    console.table(analysis);
    
    // 2. Test tooltip conditions for each order
    testOrders.forEach(order => {
      const test = this.testTooltipConditions(testOrders, order.id);
      if (test.shouldShowStockTooltip || test.shouldShowVinTooltip) {
        console.log(`✅ Order ${order.id} should show tooltips:`, {
          stock: test.shouldShowStockTooltip,
          vin: test.shouldShowVinTooltip
        });
      } else {
        console.log(`❌ Order ${order.id} should NOT show tooltips`);
      }
    });
    
    // 3. Check implementation
    const implCheck = this.checkTooltipImplementation();
    if (implCheck.issues.length > 0) {
      console.error('🚨 Implementation Issues:', implCheck.issues);
    } else {
      console.log('✅ Implementation looks good');
    }
    
    console.log('🔧 Diagnostic Complete');
  }
}

// Global access for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).tooltipDebugger = TooltipDebugger.getInstance();
}

export const tooltipDebugger = TooltipDebugger.getInstance();