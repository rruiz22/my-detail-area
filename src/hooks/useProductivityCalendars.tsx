import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type ProductivityCalendar = Database['public']['Tables']['productivity_calendars']['Row'];
export type ProductivityEvent = Database['public']['Tables']['productivity_events']['Row'];

export const useProductivityCalendars = () => {
  const [calendars, setCalendars] = useState<ProductivityCalendar[]>([]);
  const [events, setEvents] = useState<ProductivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();

  const fetchCalendars = async () => {
    if (!user || !currentDealership) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productivity_calendars')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCalendars(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch calendars');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!user || !currentDealership) return;

    try {
      const { data, error } = await supabase
        .from('productivity_events')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .order('start_time');

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch events');
    }
  };

  const createCalendar = async (calendarData: Omit<Database['public']['Tables']['productivity_calendars']['Insert'], 'dealer_id' | 'created_by'>) => {
    if (!user || !currentDealership) return;

    try {
      const { data, error } = await supabase
        .from('productivity_calendars')
        .insert({
          ...calendarData,
          dealer_id: currentDealership.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setCalendars(prev => [...prev, data]);
      toast.success('Calendar created successfully');
      return data;
    } catch (err: any) {
      toast.error('Failed to create calendar');
      throw err;
    }
  };

  const createEvent = async (eventData: Omit<Database['public']['Tables']['productivity_events']['Insert'], 'dealer_id' | 'created_by'>) => {
    if (!user || !currentDealership) return;

    try {
      const { data, error } = await supabase
        .from('productivity_events')
        .insert({
          ...eventData,
          dealer_id: currentDealership.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setEvents(prev => [...prev, data]);
      toast.success('Event created successfully');
      return data;
    } catch (err: any) {
      toast.error('Failed to create event');
      throw err;
    }
  };

  const updateCalendar = async (id: string, updates: Database['public']['Tables']['productivity_calendars']['Update']) => {
    try {
      const { data, error } = await supabase
        .from('productivity_calendars')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCalendars(prev => prev.map(cal => cal.id === id ? data : cal));
      toast.success('Calendar updated successfully');
      return data;
    } catch (err: any) {
      toast.error('Failed to update calendar');
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Database['public']['Tables']['productivity_events']['Update']) => {
    try {
      const { data, error } = await supabase
        .from('productivity_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setEvents(prev => prev.map(event => event.id === id ? data : event));
      toast.success('Event updated successfully');
      return data;
    } catch (err: any) {
      toast.error('Failed to update event');
      throw err;
    }
  };

  const deleteCalendar = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productivity_calendars')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      setCalendars(prev => prev.filter(cal => cal.id !== id));
      toast.success('Calendar deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete calendar');
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productivity_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEvents(prev => prev.filter(event => event.id !== id));
      toast.success('Event deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete event');
      throw err;
    }
  };

  useEffect(() => {
    fetchCalendars();
    fetchEvents();
  }, [user, currentDealership]);

  return {
    calendars,
    events,
    loading,
    error,
    createCalendar,
    createEvent,
    updateCalendar,
    updateEvent,
    deleteCalendar,
    deleteEvent,
    refetchCalendars: fetchCalendars,
    refetchEvents: fetchEvents,
  };
};