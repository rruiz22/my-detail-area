import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';

export interface ProductivityTodo {
  id: string;
  dealer_id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  completed_at?: string;
  assigned_to?: string;
  created_by: string;
  order_id?: string;
  category: string;
  tags: string[];
  recurring_config: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

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

  const createTodo = async (todoData: Partial<ProductivityTodo>) => {
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

  const updateTodo = async (id: string, updates: Partial<ProductivityTodo>) => {
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
    const updates: Partial<ProductivityTodo> = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
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