import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { ContactDepartment, DealershipStatus } from '@/types/dealership';

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  position?: string;
  department: ContactDepartment;
  is_primary: boolean;
  status: DealershipStatus;
  dealership_id: number;
  avatar_url?: string;
  preferred_language: string;
  can_receive_notifications: boolean;
  vehicle?: string;
  plate?: string;
  created_at: string;
  updated_at: string;
  dealership?: {
    name: string;
  };
}

export interface ContactFilters {
  search: string;
  department: string;
  dealership: string;
  status: string;
  isPrimary: string;
}

export interface ContactStats {
  total: number;
  active: number;
  inactive: number;
  byDepartment: Record<string, number>;
}

export interface UseContactsReturn {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  stats: ContactStats;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
  filters: ContactFilters;
  setFilters: (filters: Partial<ContactFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSorting: (field: string, order: 'asc' | 'desc') => void;
  fetchContacts: () => Promise<void>;
  deleteContact: (id: number) => Promise<boolean>;
  refreshStats: () => Promise<void>;
}

export function useContacts(): UseContactsReturn {
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ContactStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byDepartment: {},
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [sorting, setSortingState] = useState({
    field: 'created_at',
    order: 'desc' as 'asc' | 'desc',
  });

  const [filters, setFiltersState] = useState<ContactFilters>({
    search: '',
    department: 'all',
    dealership: 'all',
    status: 'all',
    isPrimary: 'all',
  });

  const setFilters = useCallback((newFilters: Partial<ContactFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when filters change
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination(prev => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  const setSorting = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortingState({ field, order });
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('dealership_contacts')
        .select(`
          *,
          dealerships!dealership_contacts_dealership_id_fkey(name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // Apply filters
      if (filters.department !== 'all') {
        query = query.eq('department', filters.department);
      }

      // Always filter by selected dealer from global filter
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      // Additional dealership filter (if needed for multi-dealer view)
      if (filters.dealership !== 'all') {
        query = query.eq('dealership_id', parseInt(filters.dealership));
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.isPrimary !== 'all') {
        query = query.eq('is_primary', filters.isPrimary === 'true');
      }

      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,` +
          `last_name.ilike.%${filters.search}%,` +
          `email.ilike.%${filters.search}%,` +
          `position.ilike.%${filters.search}%,` +
          `phone.ilike.%${filters.search}%,` +
          `mobile_phone.ilike.%${filters.search}%,` +
          `vehicle.ilike.%${filters.search}%,` +
          `plate.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      query = query.order(sorting.field, { ascending: sorting.order === 'asc' });

      // Apply pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setContacts(data || []);
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / prev.pageSize),
      }));
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load contacts',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, sorting, pagination.page, pagination.pageSize, toast]);

  const refreshStats = useCallback(async () => {
    try {
      // Fetch total count
      const { count: totalCount } = await supabase
        .from('dealership_contacts')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Fetch active count
      const { count: activeCount } = await supabase
        .from('dealership_contacts')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status', 'active');

      // Fetch inactive count
      const { count: inactiveCount } = await supabase
        .from('dealership_contacts')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .neq('status', 'active');

      // Fetch by department
      const { data: departmentData } = await supabase
        .from('dealership_contacts')
        .select('department')
        .is('deleted_at', null);

      const byDepartment: Record<string, number> = {};
      departmentData?.forEach(item => {
        byDepartment[item.department] = (byDepartment[item.department] || 0) + 1;
      });

      setStats({
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: inactiveCount || 0,
        byDepartment,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const deleteContact = useCallback(async (id: number): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('dealership_contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Success',
        description: 'Contact deleted successfully',
      });

      await fetchContacts();
      await refreshStats();

      return true;
    } catch (err) {
      console.error('Error deleting contact:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete contact',
      });
      return false;
    }
  }, [fetchContacts, refreshStats, toast]);

  // Fetch contacts when dependencies change (including selectedDealerId)
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, selectedDealerId]);

  // Fetch stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    contacts,
    loading,
    error,
    stats,
    pagination,
    sorting,
    filters,
    setFilters,
    setPage,
    setPageSize,
    setSorting,
    fetchContacts,
    deleteContact,
    refreshStats,
  };
}
