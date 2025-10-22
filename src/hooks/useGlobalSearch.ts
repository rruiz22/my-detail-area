import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { usePermissions } from '@/hooks/usePermissions';

export interface SearchResult {
  id: number;
  type: 'sales_order' | 'service_order' | 'recon_order' | 'car_wash' | 'contact' | 'user' | 'get_ready' | 'stock';
  title: string;
  subtitle?: string;
  url: string;
  // Order-specific fields
  stock_number?: string;
  vehicle_vin?: string;
  status?: string;
  due_date?: string;
  completion_date?: string;
  services?: string[];
  // Get Ready / Stock specific fields
  priority?: string;
  step_name?: string;
  location?: string;
}

interface UseGlobalSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  search: (query: string) => void;
  clearResults: () => void;
}

export const useGlobalSearch = (): UseGlobalSearchReturn => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedDealerId } = useDealerFilter();
  const { enhancedUser, hasModulePermission } = usePermissions();

  // Debounced search function
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const debounceTimer = setTimeout(async () => {
      try {
        await performSearch(searchQuery.trim());
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedDealerId, hasModulePermission]);

  const performSearch = async (query: string) => {
    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Don't search if user permissions aren't loaded yet
    if (!enhancedUser) {
      console.warn('⚠️ User permissions not loaded yet - skipping search');
      setResults([]);
      return;
    }

    // Build dealer filter condition
    const dealerFilter = selectedDealerId === 'all'
      ? {}
      : { dealer_id: selectedDealerId };

    // Escape special characters for PostgreSQL ILIKE pattern matching
    // Characters that need escaping: % (wildcard), _ (single char wildcard), \ (escape char)
    const escapePattern = (str: string): string => {
      return str.replace(/[%_\\]/g, '\\$&');
    };

    // Build search pattern once with escaped characters
    const escapedQuery = escapePattern(query);
    const searchPattern = '*' + escapedQuery + '*';

    // 🔍 SALES ORDERS - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('sales_orders', 'view_orders')) {
      try {
        let salesQuery = supabase
          .from('orders')
          .select('*')
          .eq('order_type', 'sales')
          .or('vehicle_vin.ilike.' + searchPattern + ',customer_name.ilike.' + searchPattern + ',order_number.ilike.' + searchPattern + ',stock_number.ilike.' + searchPattern);

        if (selectedDealerId !== 'all') {
          salesQuery = salesQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: salesOrders, error } = await salesQuery.limit(5);

        if (!error && salesOrders) {
          salesOrders.forEach(order => {
            searchResults.push({
              id: order.id,
              type: 'sales_order',
              title: `Sales Order #${order.order_number}`,
              subtitle: order.customer_name || order.vehicle_vin || order.stock_number || undefined,
              url: `/sales?order=${order.id}`,
              stock_number: order.stock_number || undefined,
              vehicle_vin: order.vehicle_vin || undefined,
              status: order.status || undefined,
              due_date: order.due_date || undefined,
              completion_date: order.completion_date || undefined,
              services: order.services_requested ? order.services_requested.split(',').map((s: string) => s.trim()) : undefined,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 SERVICE ORDERS - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('service_orders', 'view_orders')) {
      try {
        let serviceQuery = supabase
          .from('orders')
          .select('*')
          .eq('order_type', 'service')
          .or('vehicle_vin.ilike.' + searchPattern + ',customer_name.ilike.' + searchPattern + ',order_number.ilike.' + searchPattern + ',stock_number.ilike.' + searchPattern);

        if (selectedDealerId !== 'all') {
          serviceQuery = serviceQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: serviceOrders, error } = await serviceQuery.limit(5);

        if (!error && serviceOrders) {
          serviceOrders.forEach(order => {
            searchResults.push({
              id: order.id,
              type: 'service_order',
              title: `Service Order #${order.order_number}`,
              subtitle: order.customer_name || order.vehicle_vin || order.stock_number || undefined,
              url: `/service?order=${order.id}`,
              stock_number: order.stock_number || undefined,
              vehicle_vin: order.vehicle_vin || undefined,
              status: order.status || undefined,
              due_date: order.due_date || undefined,
              completion_date: order.completion_date || undefined,
              services: order.services_requested ? order.services_requested.split(',').map((s: string) => s.trim()) : undefined,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 RECON ORDERS - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('recon_orders', 'view_orders')) {
      try {
        let reconQuery = supabase
          .from('orders')
          .select('*')
          .eq('order_type', 'recon')
          .or('vehicle_vin.ilike.' + searchPattern + ',customer_name.ilike.' + searchPattern + ',order_number.ilike.' + searchPattern + ',stock_number.ilike.' + searchPattern);

        if (selectedDealerId !== 'all') {
          reconQuery = reconQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: reconOrders, error } = await reconQuery.limit(5);

        if (!error && reconOrders) {
          reconOrders.forEach(order => {
            searchResults.push({
              id: order.id,
              type: 'recon_order',
              title: `Recon Order #${order.order_number}`,
              subtitle: order.customer_name || order.vehicle_vin || order.stock_number || undefined,
              url: `/recon?order=${order.id}`,
              stock_number: order.stock_number || undefined,
              vehicle_vin: order.vehicle_vin || undefined,
              status: order.status || undefined,
              due_date: order.due_date || undefined,
              completion_date: order.completion_date || undefined,
              services: order.services_requested ? order.services_requested.split(',').map((s: string) => s.trim()) : undefined,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 CAR WASH - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('car_wash', 'view_orders')) {
      try {
        let carWashQuery = supabase
          .from('orders')
          .select('*')
          .eq('order_type', 'car_wash')
          .or('vehicle_vin.ilike.' + searchPattern + ',customer_name.ilike.' + searchPattern + ',order_number.ilike.' + searchPattern + ',stock_number.ilike.' + searchPattern);

        if (selectedDealerId !== 'all') {
          carWashQuery = carWashQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: carWashOrders, error } = await carWashQuery.limit(5);

        if (!error && carWashOrders) {
          carWashOrders.forEach(order => {
            searchResults.push({
              id: order.id,
              type: 'car_wash',
              title: `Car Wash #${order.order_number}`,
              subtitle: order.customer_name || order.vehicle_vin || order.stock_number || undefined,
              url: `/carwash?order=${order.id}`,
              stock_number: order.stock_number || undefined,
              vehicle_vin: order.vehicle_vin || undefined,
              status: order.status || undefined,
              due_date: order.due_date || undefined,
              completion_date: order.completion_date || undefined,
              services: order.services_requested ? order.services_requested.split(',').map((s: string) => s.trim()) : undefined,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 CONTACTS - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('contacts', 'view_contacts')) {
      try {
        let contactsQuery = supabase
          .from('dealership_contacts')
          .select('id, first_name, last_name, email, company, phone')
          .or('first_name.ilike.' + searchPattern + ',last_name.ilike.' + searchPattern + ',email.ilike.' + searchPattern + ',company.ilike.' + searchPattern + ',phone.ilike.' + searchPattern);

        if (selectedDealerId !== 'all') {
          contactsQuery = contactsQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: contacts, error } = await contactsQuery.limit(5);

        if (!error && contacts) {
          contacts.forEach(contact => {
            const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
            searchResults.push({
              id: contact.id,
              type: 'contact',
              title: fullName || contact.email || `Contact #${contact.id}`,
              subtitle: contact.company || contact.email || contact.phone || undefined,
              url: `/contacts/${contact.id}`,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 USERS - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('users', 'view_users')) {
      try {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .or('first_name.ilike.' + searchPattern + ',last_name.ilike.' + searchPattern + ',email.ilike.' + searchPattern)
          .limit(5);

        if (!error && users) {
          users.forEach(user => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            searchResults.push({
              id: user.id as unknown as number,
              type: 'user',
              title: fullName || user.email || `User #${user.id}`,
              subtitle: user.email || undefined,
              url: `/users/${user.id}`,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 GET READY VEHICLES - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('stock', 'view_inventory')) {
      try {
        let getReadyQuery = supabase
          .from('get_ready_vehicles')
          .select('id, stock_number, vin, vehicle_year, vehicle_make, vehicle_model, status, priority, step_id, get_ready_steps!inner(name)')
          .or('stock_number.ilike.' + searchPattern + ',vin.ilike.' + searchPattern + ',vehicle_make.ilike.' + searchPattern + ',vehicle_model.ilike.' + searchPattern)
          .is('deleted_at', null);

        if (selectedDealerId !== 'all') {
          getReadyQuery = getReadyQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: getReadyVehicles, error } = await getReadyQuery.limit(5);

        if (!error && getReadyVehicles) {
          getReadyVehicles.forEach((vehicle: any) => {
            const vehicleTitle = `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''}`.trim();
            const stepName = vehicle.get_ready_steps?.name || 'Unknown Step';
            searchResults.push({
              id: vehicle.id,
              type: 'get_ready',
              title: vehicleTitle || `Vehicle #${vehicle.stock_number}`,
              subtitle: `Stock: ${vehicle.stock_number} | VIN: ${vehicle.vin?.slice(-8) || 'N/A'}`,
              url: `/get-ready/${vehicle.id}`,
              stock_number: vehicle.stock_number || undefined,
              vehicle_vin: vehicle.vin || undefined,
              status: vehicle.status || undefined,
              priority: vehicle.priority || undefined,
              step_name: stepName,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    // 🔍 STOCK INVENTORY - Permission-based search
    if (enhancedUser?.is_system_admin || hasModulePermission('stock', 'view_inventory')) {
      try {
        let stockQuery = supabase
          .from('get_ready_vehicles')
          .select('id, stock_number, vin, vehicle_year, vehicle_make, vehicle_model, status, location')
          .eq('is_in_stock', true)
          .or('stock_number.ilike.' + searchPattern + ',vin.ilike.' + searchPattern + ',vehicle_make.ilike.' + searchPattern + ',vehicle_model.ilike.' + searchPattern)
          .is('deleted_at', null);

        if (selectedDealerId !== 'all') {
          stockQuery = stockQuery.eq('dealer_id', selectedDealerId);
        }

        const { data: stockVehicles, error } = await stockQuery.limit(5);

        if (!error && stockVehicles) {
          stockVehicles.forEach((vehicle: any) => {
            const vehicleTitle = `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''}`.trim();
            searchResults.push({
              id: vehicle.id,
              type: 'stock',
              title: vehicleTitle || `Stock #${vehicle.stock_number}`,
              subtitle: `Stock: ${vehicle.stock_number} | Location: ${vehicle.location || 'N/A'}`,
              url: `/stock/${vehicle.id}`,
              stock_number: vehicle.stock_number || undefined,
              vehicle_vin: vehicle.vin || undefined,
              status: vehicle.status || undefined,
              location: vehicle.location || undefined,
            });
          });
        }
      } catch (error) {
        // Silently ignore - user may not have access or table may not exist
      }
    }

    setResults(searchResults);
  };

  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clearResults = useCallback(() => {
    setSearchQuery('');
    setResults([]);
    setIsSearching(false);
  }, []);

  return {
    results,
    isSearching,
    search,
    clearResults,
  };
};
