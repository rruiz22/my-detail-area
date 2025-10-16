import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

export type ProductivityCalendar = Database['public']['Tables']['productivity_calendars']['Row'];
export type ProductivityEvent = Database['public']['Tables']['productivity_events']['Row'];
export type ProductivityCalendarInsert = Database['public']['Tables']['productivity_calendars']['Insert'];
export type ProductivityEventInsert = Database['public']['Tables']['productivity_events']['Insert'];
export type ProductivityEventUpdate = Database['public']['Tables']['productivity_events']['Update'];

// Query keys for cache management
export const productivityCalendarsKeys = {
  all: ['productivity', 'calendars'] as const,
  lists: () => [...productivityCalendarsKeys.all, 'list'] as const,
  list: (dealerId: number) => [...productivityCalendarsKeys.lists(), dealerId] as const,
  events: {
    all: ['productivity', 'events'] as const,
    lists: () => [...productivityCalendarsKeys.events.all, 'list'] as const,
    list: (dealerId: number) => [...productivityCalendarsKeys.events.lists(), dealerId] as const,
    byCalendar: (calendarId: string) => [...productivityCalendarsKeys.events.all, 'by-calendar', calendarId] as const,
    byOrder: (orderId: string) => [...productivityCalendarsKeys.events.all, 'by-order', orderId] as const,
  },
};

/**
 * Enhanced ProductivityCalendars Hook with TanStack Query
 *
 * Features:
 * - Automatic caching and refetching
 * - Optimistic updates for instant UI feedback
 * - Real-time subscriptions for calendars and events
 * - Better error handling
 * - Automatic retry on failure
 */
export const useProductivityCalendars = () => {
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  // Fetch calendars with TanStack Query
  const {
    data: calendars = [],
    isLoading: calendarsLoading,
    error: calendarsError
  } = useQuery({
    queryKey: productivityCalendarsKeys.list(currentDealership?.id || 0),
    queryFn: async () => {
      if (!user || !currentDealership) {
        return [];
      }

      const { data, error } = await supabase
        .from('productivity_calendars')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentDealership,
    staleTime: 60 * 1000, // Calendars rarely change, 1 minute fresh
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch events with TanStack Query
  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError
  } = useQuery({
    queryKey: productivityCalendarsKeys.events.list(currentDealership?.id || 0),
    queryFn: async () => {
      if (!user || !currentDealership) {
        return [];
      }

      const { data, error } = await supabase
        .from('productivity_events')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .order('start_time');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentDealership,
    staleTime: 30 * 1000, // Events change more often, 30 seconds fresh
    gcTime: 5 * 60 * 1000,
  });

  // Real-time subscription for calendars
  useEffect(() => {
    if (!user || !currentDealership) return;

    console.log('[ProductivityCalendars] 🔴 Setting up calendars real-time subscription');

    const channel = supabase
      .channel(`productivity_calendars_${currentDealership.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productivity_calendars',
          filter: `dealer_id=eq.${currentDealership.id}`
        },
        (payload: RealtimePostgresChangesPayload<ProductivityCalendar>) => {
          console.log('[ProductivityCalendars] 🔴 Calendar event:', payload.eventType);

          queryClient.invalidateQueries({
            queryKey: productivityCalendarsKeys.list(currentDealership.id)
          });

          if (payload.eventType === 'INSERT' && payload.new.created_by !== user.id) {
            toast.info(`New calendar created: ${payload.new.name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentDealership, queryClient]);

  // Real-time subscription for events
  useEffect(() => {
    if (!user || !currentDealership) return;

    console.log('[ProductivityCalendars] 🔴 Setting up events real-time subscription');

    const channel = supabase
      .channel(`productivity_events_${currentDealership.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productivity_events',
          filter: `dealer_id=eq.${currentDealership.id}`
        },
        (payload: RealtimePostgresChangesPayload<ProductivityEvent>) => {
          console.log('[ProductivityCalendars] 🔴 Event event:', payload.eventType);

          queryClient.invalidateQueries({
            queryKey: productivityCalendarsKeys.events.list(currentDealership.id)
          });

          if (payload.eventType === 'INSERT' && payload.new.created_by !== user.id) {
            toast.info(`New event: ${payload.new.title}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentDealership, queryClient]);

  // Create calendar mutation
  const createCalendarMutation = useMutation({
    mutationFn: async (calendarData: Omit<ProductivityCalendarInsert, 'dealer_id' | 'created_by'>) => {
      if (!user || !currentDealership) {
        throw new Error('User or dealership not found');
      }

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
      return data;
    },
    onSuccess: (data) => {
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityCalendarsKeys.list(currentDealership.id)
        });
      }
      toast.success('Calendar created successfully');
    },
    onError: (err) => {
      toast.error('Failed to create calendar');
      console.error('Create calendar error:', err);
    },
  });

  // Create event mutation with optimistic update
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Omit<ProductivityEventInsert, 'dealer_id' | 'created_by'>) => {
      if (!user || !currentDealership) {
        throw new Error('User or dealership not found');
      }

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
      return data;
    },
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({
        queryKey: productivityCalendarsKeys.events.list(currentDealership?.id || 0)
      });

      const previousEvents = queryClient.getQueryData<ProductivityEvent[]>(
        productivityCalendarsKeys.events.list(currentDealership?.id || 0)
      );

      // Optimistically add event
      if (currentDealership) {
        const optimisticEvent: ProductivityEvent = {
          id: `temp-${Date.now()}`,
          ...newEvent,
          dealer_id: currentDealership.id,
          created_by: user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          all_day: newEvent.all_day || false,
          attendees: newEvent.attendees || null,
          description: newEvent.description || null,
          event_type: newEvent.event_type || null,
          external_event_id: newEvent.external_event_id || null,
          location: newEvent.location || null,
          metadata: newEvent.metadata || null,
          order_id: newEvent.order_id || null,
          recurrence_rule: newEvent.recurrence_rule || null,
          todo_id: newEvent.todo_id || null,
          calendar_id: newEvent.calendar_id,
          end_time: newEvent.end_time,
          start_time: newEvent.start_time,
          title: newEvent.title,
        };

        queryClient.setQueryData<ProductivityEvent[]>(
          productivityCalendarsKeys.events.list(currentDealership.id),
          (old = []) => [...old, optimisticEvent].sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          )
        );
      }

      return { previousEvents };
    },
    onError: (err, newEvent, context) => {
      if (context?.previousEvents && currentDealership) {
        queryClient.setQueryData(
          productivityCalendarsKeys.events.list(currentDealership.id),
          context.previousEvents
        );
      }
      toast.error('Failed to create event');
      console.error('Create event error:', err);
    },
    onSuccess: () => {
      toast.success('Event created successfully');
    },
    onSettled: () => {
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityCalendarsKeys.events.list(currentDealership.id)
        });
      }
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductivityEventUpdate }) => {
      const { data, error } = await supabase
        .from('productivity_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({
        queryKey: productivityCalendarsKeys.events.list(currentDealership?.id || 0)
      });

      const previousEvents = queryClient.getQueryData<ProductivityEvent[]>(
        productivityCalendarsKeys.events.list(currentDealership?.id || 0)
      );

      // Optimistically update
      if (currentDealership) {
        queryClient.setQueryData<ProductivityEvent[]>(
          productivityCalendarsKeys.events.list(currentDealership.id),
          (old = []) => old.map(event => event.id === id ? { ...event, ...updates } : event)
        );
      }

      return { previousEvents };
    },
    onError: (err, variables, context) => {
      if (context?.previousEvents && currentDealership) {
        queryClient.setQueryData(
          productivityCalendarsKeys.events.list(currentDealership.id),
          context.previousEvents
        );
      }
      toast.error('Failed to update event');
      console.error('Update event error:', err);
    },
    onSuccess: () => {
      toast.success('Event updated successfully');
    },
    onSettled: () => {
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityCalendarsKeys.events.list(currentDealership.id)
        });
      }
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('productivity_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: productivityCalendarsKeys.events.list(currentDealership?.id || 0)
      });

      const previousEvents = queryClient.getQueryData<ProductivityEvent[]>(
        productivityCalendarsKeys.events.list(currentDealership?.id || 0)
      );

      // Optimistically remove
      if (currentDealership) {
        queryClient.setQueryData<ProductivityEvent[]>(
          productivityCalendarsKeys.events.list(currentDealership.id),
          (old = []) => old.filter(event => event.id !== id)
        );
      }

      return { previousEvents };
    },
    onError: (err, id, context) => {
      if (context?.previousEvents && currentDealership) {
        queryClient.setQueryData(
          productivityCalendarsKeys.events.list(currentDealership.id),
          context.previousEvents
        );
      }
      toast.error('Failed to delete event');
      console.error('Delete event error:', err);
    },
    onSuccess: () => {
      toast.success('Event deleted successfully');
    },
    onSettled: () => {
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityCalendarsKeys.events.list(currentDealership.id)
        });
      }
    },
  });

  return {
    // Calendars
    calendars,
    calendarsLoading,
    calendarsError: calendarsError ? (calendarsError as Error).message : null,
    createCalendar: createCalendarMutation.mutateAsync,

    // Events
    events,
    eventsLoading,
    eventsError: eventsError ? (eventsError as Error).message : null,
    createEvent: createEventMutation.mutateAsync,
    updateEvent: (id: string, updates: ProductivityEventUpdate) =>
      updateEventMutation.mutateAsync({ id, updates }),
    deleteEvent: deleteEventMutation.mutateAsync,

    // Combined loading state
    loading: calendarsLoading || eventsLoading,
    error: calendarsError || eventsError ?
      ((calendarsError || eventsError) as Error).message : null,

    // Mutation states
    isCreatingCalendar: createCalendarMutation.isPending,
    isCreatingEvent: createEventMutation.isPending,
    isUpdatingEvent: updateEventMutation.isPending,
    isDeletingEvent: deleteEventMutation.isPending,
  };
};
