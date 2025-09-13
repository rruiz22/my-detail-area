import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type ProductivityTodo = Database['public']['Tables']['productivity_todos']['Row'];

export const useProductivityTodos = () => {
  const [todos, setTodos] = useState<ProductivityTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();

  const fetchTodos = async () => {
    if (!user || !currentDealership) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productivity_todos')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async (todoData: Omit<Database['public']['Tables']['productivity_todos']['Insert'], 'dealer_id' | 'created_by'>) => {
    if (!user || !currentDealership) return;

    try {
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
      setTodos(prev => [data, ...prev]);
      toast.success('Todo created successfully');
      return data;
    } catch (err: any) {
      toast.error('Failed to create todo');
      throw err;
    }
  };

  const updateTodo = async (id: string, updates: Database['public']['Tables']['productivity_todos']['Update']) => {
    try {
      const { data, error } = await supabase
        .from('productivity_todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTodos(prev => prev.map(todo => todo.id === id ? data : todo));
      toast.success('Todo updated successfully');
      return data;
    } catch (err: any) {
      toast.error('Failed to update todo');
      throw err;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productivity_todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTodos(prev => prev.filter(todo => todo.id !== id));
      toast.success('Todo deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete todo');
      throw err;
    }
  };

  const toggleTodoStatus = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    const updates: Database['public']['Tables']['productivity_todos']['Update'] = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    };

    await updateTodo(id, updates);
  };

  useEffect(() => {
    fetchTodos();
  }, [user, currentDealership]);

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoStatus,
    refetch: fetchTodos,
  };
};