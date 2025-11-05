import { useMemo } from 'react';
import { useProductivityTodos } from './useProductivityTodos';
import { useProductivityCalendars } from './useProductivityCalendars';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'todo' | 'order';
  color: string;
  status?: string;
  priority?: string;
  description?: string;
  location?: string;
  allDay: boolean;
  metadata?: any;
  orderId?: string;
  todoId?: string;
  eventId?: string;
}

/**
 * Unified Calendar Data Hook
 * Combines events, todos, and followed orders into a single calendar view
 */
export const useCalendarData = () => {
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const { todos, loading: todosLoading } = useProductivityTodos();
  const { events, loading: eventsLoading } = useProductivityCalendars();

  // Fetch orders where user is a follower
  const {
    data: followedOrders = [],
    isLoading: ordersLoading
  } = useQuery({
    queryKey: ['followed-orders', currentDealership?.id, user?.id],
    queryFn: async () => {
      if (!user || !currentDealership) return [];

      const { data, error } = await supabase
        .from('order_followers')
        .select(`
          order_id,
          orders (
            id,
            order_number,
            customer_name,
            status,
            scheduled_date,
            due_date,
            module_type,
            total_amount,
            vehicle_make,
            vehicle_model
          )
        `)
        .eq('user_id', user.id)
        .eq('orders.dealer_id', currentDealership.id)
        .not('orders.status', 'in', '(cancelled,completed)')
        .order('orders.scheduled_date', { ascending: true });

      if (error) throw error;

      return (data || [])
        .map(item => item.orders)
        .filter(order => order && (order.scheduled_date || order.due_date));
    },
    enabled: !!user && !!currentDealership,
    staleTime: 60 * 1000, // 1 minute
  });

  // Combine all calendar items
  const calendarItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];

    // Add events
    events.forEach(event => {
      items.push({
        id: `event-${event.id}`,
        eventId: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        type: 'event',
        color: getEventColor(event.event_type),
        description: event.description || undefined,
        location: event.location || undefined,
        allDay: event.all_day,
        metadata: event,
      });
    });

    // Add todos with due dates
    todos
      .filter(todo => todo.due_date && todo.status !== 'completed' && todo.status !== 'cancelled')
      .forEach(todo => {
        const dueDate = new Date(todo.due_date!);
        items.push({
          id: `todo-${todo.id}`,
          todoId: todo.id,
          title: `📋 ${todo.title}`,
          start: dueDate,
          end: dueDate,
          type: 'todo',
          color: getPriorityColor(todo.priority),
          status: todo.status,
          priority: todo.priority,
          description: todo.description || undefined,
          allDay: true,
          metadata: todo,
        });
      });

    // Add followed orders
    followedOrders.forEach((order: any) => {
      if (!order) return;

      const startDate = new Date(order.scheduled_date || order.due_date);
      const endDate = order.scheduled_date
        ? new Date(new Date(order.scheduled_date).getTime() + 60 * 60 * 1000) // 1 hour
        : startDate;

      items.push({
        id: `order-${order.id}`,
        orderId: order.id,
        title: `${getModuleIcon(order.module_type)} ${order.customer_name || 'Order'} - ${order.order_number}`,
        start: startDate,
        end: endDate,
        type: 'order',
        color: getOrderColor(order.module_type),
        status: order.status,
        description: `${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() || undefined,
        allDay: !order.scheduled_date,
        metadata: order,
      });
    });

    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, todos, followedOrders]);

  return {
    calendarItems,
    loading: todosLoading || eventsLoading || ordersLoading,
    events,
    todos,
    followedOrders,
  };
};

// Helper functions
function getEventColor(eventType?: string | null): string {
  switch (eventType) {
    case 'meeting': return '#3B82F6'; // Blue
    case 'reminder': return '#F59E0B'; // Amber
    case 'task': return '#8B5CF6'; // Purple
    case 'appointment': return '#10B981'; // Green
    default: return '#6B7280'; // Gray
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return '#EF4444'; // Red
    case 'high': return '#F97316'; // Orange
    case 'medium': return '#F59E0B'; // Amber
    case 'low': return '#10B981'; // Green
    default: return '#6B7280'; // Gray
  }
}

function getOrderColor(moduleType?: string | null): string {
  switch (moduleType) {
    case 'sales_orders': return '#8B5CF6'; // Purple
    case 'service_orders': return '#10B981'; // Green
    case 'recon_orders': return '#F59E0B'; // Amber
    case 'car_wash': return '#06B6D4'; // Cyan
    default: return '#6B7280'; // Gray
  }
}

function getModuleIcon(moduleType?: string | null): string {
  switch (moduleType) {
    case 'sales_orders': return '🚗';
    case 'service_orders': return '🔧';
    case 'recon_orders': return '✨';
    case 'car_wash': return '💦';
    default: return '📦';
  }
}
