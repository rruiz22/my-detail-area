import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  total_dealerships: number;
  active_dealerships: number;
  total_users: number;
  active_users: number;
  total_orders: number;
  orders_this_month: number;
  orders_this_week: number;
  pending_invitations: number;
  system_health_score: number;
}

interface SystemActivity {
  activity_type: string;
  activity_description: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user_email: string;
}

interface DealershipPerformance {
  dealership_id: number;
  dealership_name: string;
  total_users: number;
  active_users: number;
  total_orders: number;
  orders_this_month: number;
  avg_orders_per_user: number;
  user_growth_rate: number;
  last_activity: string;
  status: string;
}

export const useSystemStats = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('get_system_stats');
      
      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching system stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};

export const useSystemActivity = () => {
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('get_recent_system_activity');
      
      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error('Error fetching system activity:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchActivity, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { activities, loading, error, refetch: fetchActivity };
};

export const useDealershipPerformance = () => {
  const [performance, setPerformance] = useState<DealershipPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc('get_dealership_performance_stats');
      
      if (error) throw error;
      setPerformance(data || []);
    } catch (err: any) {
      console.error('Error fetching performance stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  return { performance, loading, error, refetch: fetchPerformance };
};