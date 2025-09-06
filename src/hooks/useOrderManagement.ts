import { useState, useEffect, useCallback } from 'react';
import { mockOrders } from '@/lib/mockData';

export function useOrderManagement(activeTab: string) {
  const [orders, setOrders] = useState(mockOrders);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const calculateTabCounts = useCallback((allOrders: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      dashboard: allOrders.length,
      today: allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= today && orderDate < tomorrow;
      }).length,
      tomorrow: allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= tomorrow && orderDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      }).length,
      pending: allOrders.filter(order => order.status === 'Pending').length,
      week: allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= today && orderDate < weekEnd;
      }).length,
      all: allOrders.length,
      services: allOrders.filter(order => order.department === 'Service').length,
      deleted: 0, // Mock deleted orders
    };
  }, []);

  const filterOrders = useCallback((allOrders: any[], tab: string, currentFilters: any) => {
    let filtered = [...allOrders];

    // Apply tab-specific filters
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (tab) {
      case 'today':
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= today && orderDate < tomorrow;
        });
        break;
      case 'tomorrow':
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= tomorrow && orderDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        });
        break;
      case 'pending':
        filtered = filtered.filter(order => order.status === 'Pending');
        break;
      case 'week':
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= today && orderDate < weekEnd;
        });
        break;
      case 'services':
        filtered = filtered.filter(order => order.department === 'Service');
        break;
      case 'deleted':
        filtered = []; // No deleted orders in mock data
        break;
      default:
        // 'dashboard' and 'all' show all orders
        break;
    }

    // Apply global filters
    if (currentFilters.search) {
      const searchTerm = currentFilters.search.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm) ||
        order.vin.toLowerCase().includes(searchTerm) ||
        order.stock?.toLowerCase().includes(searchTerm) ||
        `${order.year} ${order.make} ${order.model}`.toLowerCase().includes(searchTerm)
      );
    }

    if (currentFilters.status) {
      filtered = filtered.filter(order => 
        order.status.toLowerCase() === currentFilters.status.toLowerCase()
      );
    }

    if (currentFilters.make) {
      filtered = filtered.filter(order => 
        order.make.toLowerCase() === currentFilters.make.toLowerCase()
      );
    }

    if (currentFilters.model) {
      filtered = filtered.filter(order => 
        order.model.toLowerCase() === currentFilters.model.toLowerCase()
      );
    }

    if (currentFilters.dateFrom) {
      const fromDate = new Date(currentFilters.dateFrom);
      filtered = filtered.filter(order => 
        new Date(order.createdAt) >= fromDate
      );
    }

    if (currentFilters.dateTo) {
      const toDate = new Date(currentFilters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(order => 
        new Date(order.createdAt) <= toDate
      );
    }

    return filtered;
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, this would fetch from API
    const allOrders = mockOrders;
    const filtered = filterOrders(allOrders, activeTab, filters);
    
    setOrders(filtered);
    setTabCounts(calculateTabCounts(allOrders));
    setLoading(false);
  }, [activeTab, filters, filterOrders, calculateTabCounts]);

  const updateFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const createOrder = useCallback(async (orderData: any) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder = {
      id: `ORD-${Date.now()}`,
      vin: orderData.vin,
      stock: orderData.stockNumber,
      year: parseInt(orderData.year),
      make: orderData.make,
      model: orderData.model,
      service: orderData.services.join(', '),
      description: orderData.internalNotes || 'Nueva orden',
      price: 0, // Calculate based on services
      status: orderData.status === 'pending' ? 'Pending' : 
              orderData.status === 'in_progress' ? 'In Progress' :
              orderData.status === 'completed' ? 'Complete' : 'Cancelled',
      advisor: 'Usuario Actual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      department: 'Sales',
    };
    
    // In real implementation, this would create via API
    console.log('Creating order:', newOrder);
    
    setLoading(false);
  }, []);

  const updateOrder = useCallback(async (orderId: string, orderData: any) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, this would update via API
    console.log('Updating order:', orderId, orderData);
    
    setLoading(false);
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, this would soft delete via API
    console.log('Deleting order:', orderId);
    
    setLoading(false);
  }, []);

  // Refresh data when tab or filters change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Initial load
  useEffect(() => {
    const allOrders = mockOrders;
    setTabCounts(calculateTabCounts(allOrders));
  }, [calculateTabCounts]);

  return {
    orders,
    tabCounts,
    filters,
    loading,
    updateFilters,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}