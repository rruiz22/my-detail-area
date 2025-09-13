import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';

export interface ProductivityCalendar {
  id: string;
  dealer_id: number;
  name: string;
  description?: string;
  color: string;
  is_default: boolean;
  calendar_type: string;
  external_calendar_id?: string;
  sync_settings: any;
  sync_enabled: boolean;
  last_sync_at?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductivityEvent {
  id: string;
  calendar_id: string;
  dealer_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  attendees: any;
  event_type: string;
  external_event_id?: string;
  order_id?: string;
  todo_id?: string;
  recurrence_rule?: string;
  metadata: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

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
      setCalendars(data?.map(cal => ({
        ...cal,
        attendees: Array.isArray(cal.attendees) ? cal.attendees : []
      })) || []);
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
      setEvents(data?.map(event => ({
        ...event,
        attendees: Array.isArray(event.attendees) ? event.attendees : []
      })) || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch events');
    }
  };

  const createCalendar = async (calendarData: Partial<ProductivityCalendar>) => {
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

  const createEvent = async (eventData: Partial<ProductivityEvent>) => {
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

  const updateCalendar = async (id: string, updates: Partial<ProductivityCalendar>) => {
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

  const updateEvent = async (id: string, updates: Partial<ProductivityEvent>) => {
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