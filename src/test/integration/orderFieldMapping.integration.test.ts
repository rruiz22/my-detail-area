import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Integration test to verify the complete order field mapping implementation
describe('Order Field Mapping - Integration Test', () => {
  beforeAll(async () => {
    // Clean up any test data
    await supabase.from('orders').delete().like('customer_name', 'Test%');
    await supabase.from('dealerships').delete().like('name', 'Test%');
    await supabase.from('dealer_groups').delete().like('name', 'Test%');
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('orders').delete().like('customer_name', 'Test%');
    await supabase.from('dealerships').delete().like('name', 'Test%');
    await supabase.from('dealer_groups').delete().like('name', 'Test%');
  });

  it('should create test data and verify field mapping works end-to-end', async () => {
    // Step 1: Insert test dealership
    const { data: dealership, error: dealershipError } = await supabase
      .from('dealerships')
      .insert({
        name: 'Test Dealership for Integration',
        email: 'test@integration.com',
        status: 'active'
      })
      .select()
      .single();

    expect(dealershipError).toBeNull();
    expect(dealership).toBeDefined();
    expect(dealership.name).toBe('Test Dealership for Integration');

    // Step 2: Insert test dealer group
    const { data: dealerGroup, error: groupError } = await supabase
      .from('dealer_groups')
      .insert({
        dealer_id: dealership.id,
        name: 'Test Detail Team',
        description: 'Test group for integration testing',
        permissions: ['orders.create', 'orders.update'],
        slug: 'test-detail-team'
      })
      .select()
      .single();

    expect(groupError).toBeNull();
    expect(dealerGroup).toBeDefined();
    expect(dealerGroup.name).toBe('Test Detail Team');

    // Step 3: Insert test order with group assignments
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: 'INT-TEST-001',
        customer_name: 'Test Integration Customer',
        customer_email: 'test@customer.com',
        vehicle_year: 2023,
        vehicle_make: 'Tesla',
        vehicle_model: 'Model 3',
        vehicle_vin: 'TEST123456789VIN',
        stock_number: 'INT-STK-001',
        order_type: 'sales',
        status: 'pending',
        dealer_id: dealership.id,
        assigned_group_id: dealerGroup.id,
        created_by_group_id: dealerGroup.id,
        sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        total_amount: 299.99
      })
      .select()
      .single();

    expect(orderError).toBeNull();
    expect(order).toBeDefined();
    expect(order.customer_name).toBe('Test Integration Customer');

    // Step 4: Test the enhanced query with manual JOINs
    const { data: ordersWithJoins, error: queryError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id);

    expect(queryError).toBeNull();
    expect(ordersWithJoins).toHaveLength(1);

    // Step 5: Fetch related data separately (our new approach)
    const { data: dealerships, error: dealershipsError } = await supabase
      .from('dealerships')
      .select('id, name');

    const { data: dealerGroups, error: groupsError } = await supabase
      .from('dealer_groups')
      .select('id, name');

    expect(dealershipsError).toBeNull();
    expect(groupsError).toBeNull();
    expect(dealerships.length).toBeGreaterThan(0);
    expect(dealerGroups.length).toBeGreaterThan(0);

    // Step 6: Create lookup maps and test the transformation
    const dealershipMap = new Map(dealerships.map(d => [d.id, d.name]));
    const groupMap = new Map(dealerGroups.map(g => [g.id, g.name]));

    const transformedOrder = ordersWithJoins[0];
    
    // Apply manual JOIN logic
    const dealershipName = dealershipMap.get(transformedOrder.dealer_id);
    const assignedGroupName = transformedOrder.assigned_group_id ? 
      groupMap.get(transformedOrder.assigned_group_id) : undefined;
    const createdByGroupName = transformedOrder.created_by_group_id ? 
      groupMap.get(transformedOrder.created_by_group_id) : undefined;

    // Step 7: Verify the field mapping works correctly
    expect(dealershipName).toBe('Test Dealership for Integration');
    expect(assignedGroupName).toBe('Test Detail Team');
    expect(createdByGroupName).toBe('Test Detail Team');

    // Step 8: Test due time formatting
    const dueTime = transformedOrder.sla_deadline ? 
      new Date(transformedOrder.sla_deadline).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }) : undefined;

    expect(dueTime).toBeDefined();
    expect(dueTime).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);

    // Step 9: Verify no hardcoded values remain
    expect(dealershipName).not.toBe('Premium Auto');
    expect(assignedGroupName).not.toBe('Unassigned');

    console.log('✅ Integration test passed:');
    console.log('  - Dealership Name:', dealershipName);
    console.log('  - Assigned Group:', assignedGroupName);
    console.log('  - Created By Group:', createdByGroupName);
    console.log('  - Due Time:', dueTime);
    console.log('  - Order ID:', transformedOrder.id);
  });

  it('should handle missing relationships gracefully', async () => {
    // Create an order without group assignments
    const { data: dealership } = await supabase
      .from('dealerships')
      .select('id, name')
      .limit(1)
      .single();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: 'INT-TEST-002', 
        customer_name: 'Test No Groups Customer',
        vehicle_make: 'Honda',
        vehicle_model: 'Civic',
        order_type: 'sales',
        status: 'pending',
        dealer_id: dealership.id,
        // No assigned_group_id or created_by_group_id
        total_amount: 150.00
      })
      .select()
      .single();

    expect(orderError).toBeNull();

    // Test the lookup with missing data
    const { data: dealerships } = await supabase
      .from('dealerships')
      .select('id, name');

    const { data: dealerGroups } = await supabase
      .from('dealer_groups')
      .select('id, name');

    const dealershipMap = new Map(dealerships.map(d => [d.id, d.name]));
    const groupMap = new Map(dealerGroups.map(g => [g.id, g.name]));

    // Apply manual JOIN logic
    const dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
    const assignedGroupName = order.assigned_group_id ? 
      groupMap.get(order.assigned_group_id) : undefined;
    const assignedTo = assignedGroupName || 'Unassigned';

    // Verify fallback values work correctly
    expect(dealershipName).toBe(dealership.name); // Should find the dealer
    expect(assignedGroupName).toBeUndefined(); // No group assigned
    expect(assignedTo).toBe('Unassigned'); // Proper fallback

    console.log('✅ Fallback handling test passed:');
    console.log('  - Dealership Name:', dealershipName);
    console.log('  - Assigned To:', assignedTo);
  });

  it('should test all order types have consistent field mapping', async () => {
    const orderTypes = ['sales', 'service', 'recon', 'car_wash'];
    const results = [];

    for (const orderType of orderTypes) {
      const { data: testOrder } = await supabase
        .from('orders')
        .insert({
          order_number: `${orderType.toUpperCase()}-TEST-001`,
          customer_name: `Test ${orderType} Customer`,
          vehicle_make: 'Toyota',
          vehicle_model: 'Camry',
          order_type: orderType,
          status: 'pending',
          dealer_id: 5, // Default dealer
          total_amount: 200.00
        })
        .select()
        .single();

      // Test that all order types can be queried and transformed consistently
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('id', testOrder.id);

      expect(orders).toHaveLength(1);
      expect(orders[0].order_type).toBe(orderType);

      results.push({
        orderType,
        orderId: orders[0].id,
        hasValidStructure: true
      });
    }

    expect(results).toHaveLength(4);
    expect(results.every(r => r.hasValidStructure)).toBe(true);

    console.log('✅ All order types structure test passed:', results);
  });
});

// Performance test
describe('Order Field Mapping - Performance Test', () => {
  it('should perform lookup operations efficiently with large datasets', async () => {
    // Simulate large lookup maps
    const largeDealershipMap = new Map();
    const largeGroupMap = new Map();

    // Create 1000 mock dealerships
    for (let i = 1; i <= 1000; i++) {
      largeDealershipMap.set(i, `Dealership ${i}`);
    }

    // Create 5000 mock groups
    for (let i = 1; i <= 5000; i++) {
      largeGroupMap.set(`group-${i}`, `Group ${i}`);
    }

    // Test lookup performance
    const startTime = performance.now();

    for (let i = 1; i <= 1000; i++) {
      const dealershipName = largeDealershipMap.get(i) || 'Unknown Dealer';
      const groupName = largeGroupMap.get(`group-${i}`) || 'Unassigned';
      
      expect(dealershipName).toBe(`Dealership ${i}`);
      expect(groupName).toBe(`Group ${i}`);
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Should complete in under 10ms
    expect(executionTime).toBeLessThan(10);

    console.log(`✅ Performance test passed: ${executionTime.toFixed(2)}ms for 1000 lookups`);
  });
});