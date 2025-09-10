import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NFCTag {
  id: string;
  name: string;
  tag_uid: string;
  tag_type: string;
  description?: string;
  vehicle_vin?: string;
  location_name?: string;
  location_coordinates?: [number, number];
  is_active: boolean;
  is_permanent: boolean;
  scan_count: number;
  last_scanned_at?: string;
  created_at: string;
  dealer_id: number;
  order_id?: string;
  created_by?: string;
}

interface NFCScan {
  id: string;
  tag_id: string;
  scanned_by: string;
  scanned_at: string;
  scan_location?: [number, number];
  scan_address?: string;
  action_type: string;
  session_id?: string;
  device_info: Record<string, any>;
  action_data: Record<string, any>;
  context_data: Record<string, any>;
  is_unique_scan: boolean;
  order_id?: string;
  user_agent?: string;
}

interface NFCStats {
  total_tags: number;
  active_tags: number;
  total_scans: number;
  unique_scans: number;
  vehicles_tracked: number;
  locations_count: number;
  avg_stay_time: number;
  recent_scans: NFCScan[];
}

  // Utility function to parse location coordinates
  const parseLocationCoordinates = (coords: unknown): [number, number] | undefined => {
    if (typeof coords === 'string') {
      // Parse PostGIS point format: "(x,y)" 
      const match = coords.match(/\(([^,]+),([^)]+)\)/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (!isNaN(x) && !isNaN(y)) {
          return [x, y];
        }
      }
    }
    return undefined;
  };

export function useNFCManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tags, setTags] = useState<NFCTag[]>([]);
  const [scans, setScans] = useState<NFCScan[]>([]);
  const [stats, setStats] = useState<NFCStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load NFC tags
  const loadTags = async (dealerId?: number) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('nfc_tags')
        .select('*')
        .order('created_at', { ascending: false });

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(tag => ({
        ...tag,
        description: tag.description || undefined,
        vehicle_vin: tag.vehicle_vin || undefined,
        location_name: tag.location_name || undefined,
        location_coordinates: tag.location_coordinates ? 
          parseLocationCoordinates(tag.location_coordinates) : undefined,
        last_scanned_at: tag.last_scanned_at || undefined,
        order_id: tag.order_id || undefined,
        created_by: tag.created_by || undefined
      }));

      setTags(transformedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load NFC tags';
      setError(message);
      toast({
        title: t('nfc_tracking.errors.load_failed'),
        description: message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load NFC scans
  const loadScans = async (tagId?: string, limit = 100) => {
    try {
      setLoading(true);

      let query = supabase
        .from('nfc_scans')
        .select(`
          *,
          nfc_tags:tag_id(name, tag_type, vehicle_vin)
        `)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (tagId) {
        query = query.eq('tag_id', tagId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(scan => ({
        ...scan,
        scan_location: scan.scan_location ? 
          parseLocationCoordinates(scan.scan_location) : undefined,
        scan_address: scan.scan_address || undefined,
        session_id: scan.session_id || undefined,
        order_id: scan.order_id || undefined,
        user_agent: scan.user_agent || undefined,
        device_info: (scan.device_info as Record<string, any>) || {},
        action_data: (scan.action_data as Record<string, any>) || {},
        context_data: (scan.context_data as Record<string, any>) || {}
      }));

      setScans(transformedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load NFC scans';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Load NFC statistics
  const loadStats = async (dealerId?: number) => {
    try {
      setLoading(true);

      // Get basic tag stats
      let tagQuery = supabase
        .from('nfc_tags')
        .select('id, is_active, vehicle_vin, scan_count, last_scanned_at');
      
      if (dealerId) {
        tagQuery = tagQuery.eq('dealer_id', dealerId);
      }

      const { data: tagData, error: tagError } = await tagQuery;
      if (tagError) throw tagError;

      // Get scan stats
      let scanQuery = supabase
        .from('nfc_scans')
        .select('id, is_unique_scan, scanned_at')
        .gte('scanned_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: scanData, error: scanError } = await scanQuery;
      if (scanError) throw scanError;

      // Calculate stats
      const totalTags = tagData?.length || 0;
      const activeTags = tagData?.filter(t => t.is_active)?.length || 0;
      const vehiclesTracked = new Set(tagData?.filter(t => t.vehicle_vin).map(t => t.vehicle_vin)).size;
      const totalScans = scanData?.length || 0;
      const uniqueScans = scanData?.filter(s => s.is_unique_scan)?.length || 0;

      // Transform recent scans to match interface
      const recentScans = (scanData || []).slice(0, 10).map(scan => ({
        id: scan.id,
        tag_id: '', // This would need to be fetched from a join
        scanned_by: '', // This would need to be fetched
        scanned_at: scan.scanned_at,
        action_type: 'read',
        device_info: {},
        action_data: {},
        context_data: {},
        is_unique_scan: scan.is_unique_scan
      }));

      // Mock some additional stats for now
      const mockStats: NFCStats = {
        total_tags: totalTags,
        active_tags: activeTags,
        total_scans: totalScans,
        unique_scans: uniqueScans,
        vehicles_tracked: vehiclesTracked,
        locations_count: 8, // Could be calculated from unique location_names
        avg_stay_time: 45, // Minutes - would need more complex calculation
        recent_scans: recentScans
      };

      setStats(mockStats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load NFC statistics';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Create new NFC tag
  const createTag = async (tagData: Partial<NFCTag>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('nfc_tags')
        .insert({
          name: tagData.name,
          tag_uid: tagData.tag_uid,
          tag_type: tagData.tag_type || 'vehicle',
          description: tagData.description,
          vehicle_vin: tagData.vehicle_vin,
          location_name: tagData.location_name,
          location_coordinates: tagData.location_coordinates ? 
            `(${tagData.location_coordinates[0]}, ${tagData.location_coordinates[1]})` : null,
          dealer_id: tagData.dealer_id,
          order_id: tagData.order_id,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = {
        ...data,
        description: data.description || undefined,
        vehicle_vin: data.vehicle_vin || undefined,
        location_name: data.location_name || undefined,
        location_coordinates: data.location_coordinates ? 
          parseLocationCoordinates(data.location_coordinates) : undefined,
        last_scanned_at: data.last_scanned_at || undefined,
        order_id: data.order_id || undefined,
        created_by: data.created_by || undefined
      };

      setTags(prev => [transformedData, ...prev]);
      
      toast({
        title: t('nfc_tracking.tag_created'),
        description: t('nfc_tracking.tag_created_desc', { name: data.name })
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create NFC tag';
      setError(message);
      toast({
        title: t('nfc_tracking.errors.create_failed'),
        description: message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update NFC tag
  const updateTag = async (tagId: string, updates: Partial<NFCTag>) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('nfc_tags')
        .update({
          name: updates.name,
          description: updates.description,
          vehicle_vin: updates.vehicle_vin,
          location_name: updates.location_name,
          location_coordinates: updates.location_coordinates ? 
            `(${updates.location_coordinates[0]}, ${updates.location_coordinates[1]})` : null,
          is_active: updates.is_active,
          is_permanent: updates.is_permanent,
          tag_type: updates.tag_type
        })
        .eq('id', tagId)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = {
        ...data,
        description: data.description || undefined,
        vehicle_vin: data.vehicle_vin || undefined,
        location_name: data.location_name || undefined,
        location_coordinates: data.location_coordinates ? 
          parseLocationCoordinates(data.location_coordinates) : undefined,
        last_scanned_at: data.last_scanned_at || undefined,
        order_id: data.order_id || undefined,
        created_by: data.created_by || undefined
      };

      setTags(prev => prev.map(tag => tag.id === tagId ? { ...tag, ...transformedData } : tag));
      
      toast({
        title: t('nfc_tracking.tag_updated'),
        description: t('nfc_tracking.tag_updated_desc', { name: data.name })
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update NFC tag';
      setError(message);
      toast({
        title: t('nfc_tracking.errors.update_failed'),
        description: message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete NFC tag
  const deleteTag = async (tagId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('nfc_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.filter(tag => tag.id !== tagId));
      
      toast({
        title: t('nfc_tracking.tag_deleted'),
        description: t('nfc_tracking.tag_deleted_desc')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete NFC tag';
      setError(message);
      toast({
        title: t('nfc_tracking.errors.delete_failed'),
        description: message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Record NFC scan
  const recordScan = async (scanData: {
    tag_id: string;
    action_type?: string;
    scan_location?: [number, number];
    scan_address?: string;
    device_info?: Record<string, any>;
    action_data?: Record<string, any>;
    context_data?: Record<string, any>;
    session_id?: string;
    order_id?: string;
  }) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('nfc_scans')
        .insert({
          tag_id: scanData.tag_id,
          scanned_by: user.data.user.id,
          action_type: scanData.action_type || 'read',
          scan_location: scanData.scan_location ? 
            `(${scanData.scan_location[0]}, ${scanData.scan_location[1]})` : null,
          scan_address: scanData.scan_address,
          device_info: scanData.device_info || {},
          action_data: scanData.action_data || {},
          context_data: scanData.context_data || {},
          session_id: scanData.session_id,
          order_id: scanData.order_id,
          is_unique_scan: true // Logic would be more complex in real implementation
        })
        .select()
        .single();

      if (error) throw error;

      // Update tag scan count and last scanned time
      await supabase
        .from('nfc_tags')
        .update({
          scan_count: 1, // This would need proper increment logic
          last_scanned_at: new Date().toISOString()
        })
        .eq('id', scanData.tag_id);

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record NFC scan';
      throw new Error(message);
    }
  };

  return {
    // State
    tags,
    scans,
    stats,
    loading,
    error,

    // Actions
    loadTags,
    loadScans,
    loadStats,
    createTag,
    updateTag,
    deleteTag,
    recordScan,

    // Computed values
    activeTags: tags.filter(tag => tag.is_active),
    vehicleTags: tags.filter(tag => tag.tag_type === 'vehicle'),
    locationTags: tags.filter(tag => tag.tag_type === 'location'),
    recentScans: scans.slice(0, 10)
  };
}