import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export type ProductivityTodo = Database['public']['Tables']['productivity_todos']['Row'];
export type ProductivityTodoInsert = Database['public']['Tables']['productivity_todos']['Insert'];
export type ProductivityTodoUpdate = Database['public']['Tables']['productivity_todos']['Update'];

// Query keys for cache management
export const productivityTodosKeys = {
  all: ['productivity', 'todos'] as const,
  lists: () => [...productivityTodosKeys.all, 'list'] as const,
  list: (dealerId: number) => [...productivityTodosKeys.lists(), dealerId] as const,
  details: () => [...productivityTodosKeys.all, 'detail'] as const,
  detail: (id: string) => [...productivityTodosKeys.details(), id] as const,
  byOrder: (orderId: string) => [...productivityTodosKeys.all, 'by-order', orderId] as const,
};

/**
 * Enhanced ProductivityTodos Hook with TanStack Query
 *
 * Features:
 * - Automatic caching and refetching
 * - Optimistic updates for instant UI feedback
 * - Real-time subscriptions
 * - Better error handling
 * - Automatic retry on failure
 */
export const useProductivityTodos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  // Fetch todos with TanStack Query
  const {
    data: todos = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: productivityTodosKeys.list(currentDealership?.id || 0),
    queryFn: async () => {
      if (!user || !currentDealership) {
        return [];
      }

      const { data, error } = await supabase
        .from('productivity_todos')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentDealership,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Real-time subscription for live updates
  useEffect(() => {
    if (!user || !currentDealership) return;

    console.log('[ProductivityTodos] 🔴 Setting up real-time subscription');

    const channel = supabase
      .channel(`productivity_todos_${currentDealership.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productivity_todos',
          filter: `dealer_id=eq.${currentDealership.id}`
        },
        (payload: RealtimePostgresChangesPayload<ProductivityTodo>) => {
          console.log('[ProductivityTodos] 🔴 Real-time event:', payload.eventType);

          // Invalidate cache to trigger refetch
          queryClient.invalidateQueries({
            queryKey: productivityTodosKeys.list(currentDealership.id)
          });

          // Show notification for changes made by other users
          if (payload.eventType === 'INSERT' && payload.new.created_by !== user.id) {
            toast({ description: 'New task created by team member' });
          }
          if (payload.eventType === 'UPDATE' && payload.new.created_by !== user.id) {
            toast({ description: 'Task updated by team member' });
          }
        }
      )
      .subscribe((status) => {
        console.log('[ProductivityTodos] 🔴 Subscription status:', status);
      });

    return () => {
      console.log('[ProductivityTodos] 🔴 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, currentDealership, queryClient]);

  // Create todo mutation with optimistic update
  const createTodoMutation = useMutation({
    mutationFn: async (todoData: Omit<ProductivityTodoInsert, 'dealer_id' | 'created_by'>) => {
      if (!user || !currentDealership) {
        throw new Error('User or dealership not found');
      }

      const { data, error } = await supabase
        .from('productivity_todos')
        .insert({
          ...todoData,
          dealer_id: currentDealership.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: productivityTodosKeys.list(currentDealership?.id || 0)
      });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData<ProductivityTodo[]>(
        productivityTodosKeys.list(currentDealership?.id || 0)
      );

      // Optimistically update to the new value
      if (currentDealership) {
        const optimisticTodo: ProductivityTodo = {
          id: `temp-${Date.now()}`,
          ...newTodo,
          dealer_id: currentDealership.id,
          created_by: user?.id || '',
          status: newTodo.status || 'pending',
          priority: newTodo.priority || 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
          assigned_to: newTodo.assigned_to || null,
          category: newTodo.category || null,
          description: newTodo.description || null,
          due_date: newTodo.due_date || null,
          metadata: newTodo.metadata || null,
          order_id: newTodo.order_id || null,
          recurring_config: newTodo.recurring_config || null,
          tags: newTodo.tags || null,
          title: newTodo.title,
        };

        queryClient.setQueryData<ProductivityTodo[]>(
          productivityTodosKeys.list(currentDealership.id),
          (old = []) => [optimisticTodo, ...old]
        );
      }

      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      if (context?.previousTodos && currentDealership) {
        queryClient.setQueryData(
          productivityTodosKeys.list(currentDealership.id),
          context.previousTodos
        );
      }
      toast({ variant: 'destructive', description: 'Failed to create task' });
      console.error('Create todo error:', err);
    },
    onSuccess: () => {
      toast({ description: 'Task created successfully' });
    },
    onSettled: () => {
      // Always refetch after error or success
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityTodosKeys.list(currentDealership.id)
        });
      }
    },
  });

  // Update todo mutation with optimistic update
  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductivityTodoUpdate }) => {
      const { data, error } = await supabase
        .from('productivity_todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({
        queryKey: productivityTodosKeys.list(currentDealership?.id || 0)
      });

      const previousTodos = queryClient.getQueryData<ProductivityTodo[]>(
        productivityTodosKeys.list(currentDealership?.id || 0)
      );

      // Optimistically update
      if (currentDealership) {
        queryClient.setQueryData<ProductivityTodo[]>(
          productivityTodosKeys.list(currentDealership.id),
          (old = []) => old.map(todo => todo.id === id ? { ...todo, ...updates } : todo)
        );
      }

      return { previousTodos };
    },
    onError: (err, variables, context) => {
      if (context?.previousTodos && currentDealership) {
        queryClient.setQueryData(
          productivityTodosKeys.list(currentDealership.id),
          context.previousTodos
        );
      }
      toast({ variant: 'destructive', description: 'Failed to update task' });
      console.error('Update todo error:', err);
    },
    onSuccess: () => {
      toast({ description: 'Task updated successfully' });
    },
    onSettled: () => {
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityTodosKeys.list(currentDealership.id)
        });
      }
    },
  });

  // Delete todo mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('productivity_todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: productivityTodosKeys.list(currentDealership?.id || 0)
      });

      const previousTodos = queryClient.getQueryData<ProductivityTodo[]>(
        productivityTodosKeys.list(currentDealership?.id || 0)
      );

      // Optimistically remove
      if (currentDealership) {
        queryClient.setQueryData<ProductivityTodo[]>(
          productivityTodosKeys.list(currentDealership.id),
          (old = []) => old.filter(todo => todo.id !== id)
        );
      }

      return { previousTodos };
    },
    onError: (err, id, context) => {
      if (context?.previousTodos && currentDealership) {
        queryClient.setQueryData(
          productivityTodosKeys.list(currentDealership.id),
          context.previousTodos
        );
      }
      toast({ variant: 'destructive', description: 'Failed to delete task' });
      console.error('Delete todo error:', err);
    },
    onSuccess: () => {
      toast({ description: 'Task deleted successfully' });
    },
    onSettled: () => {
      if (currentDealership) {
        queryClient.invalidateQueries({
          queryKey: productivityTodosKeys.list(currentDealership.id)
        });
      }
    },
  });

  // Toggle todo status helper
  const toggleTodoStatus = useCallback(
    async (id: string) => {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
      const updates: ProductivityTodoUpdate = {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      };

      await updateTodoMutation.mutateAsync({ id, updates });
    },
    [todos, updateTodoMutation]
  );

  return {
    todos,
    loading,
    error: error ? (error as Error).message : null,
    createTodo: createTodoMutation.mutateAsync,
    updateTodo: (id: string, updates: ProductivityTodoUpdate) =>
      updateTodoMutation.mutateAsync({ id, updates }),
    deleteTodo: deleteTodoMutation.mutateAsync,
    toggleTodoStatus,
    refetch,
    // Additional state
    isCreating: createTodoMutation.isPending,
    isUpdating: updateTodoMutation.isPending,
    isDeleting: deleteTodoMutation.isPending,
  };
};
