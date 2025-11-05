import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useToast } from '@/hooks/use-toast';

export interface ProductivityNote {
  id: string;
  dealer_id: number;
  created_by: string;
  title: string | null;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateNoteData {
  title?: string;
  content: string;
  color?: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';
  is_pinned?: boolean;
  tags?: string[];
}

export const useProductivityNotes = () => {
  const [notes, setNotes] = useState<ProductivityNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const { toast } = useToast();

  // Fetch notes
  const fetchNotes = async () => {
    if (!user || !currentDealership) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productivity_notes')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('created_by', user.id)
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [user, currentDealership]);

  // Create note
  const createNote = async (noteData: CreateNoteData) => {
    if (!user || !currentDealership) return;

    try {
      const { data, error } = await supabase
        .from('productivity_notes')
        .insert({
          dealer_id: currentDealership.id,
          created_by: user.id,
          title: noteData.title || null,
          content: noteData.content,
          color: noteData.color || 'yellow',
          is_pinned: noteData.is_pinned || false,
          tags: noteData.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      toast({
        title: 'Success',
        description: 'Note created successfully',
      });

      return data;
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update note
  const updateNote = async (id: string, updates: Partial<CreateNoteData>) => {
    try {
      const { data, error } = await supabase
        .from('productivity_notes')
        .update({
          title: updates.title,
          content: updates.content,
          color: updates.color,
          is_pinned: updates.is_pinned,
          tags: updates.tags,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev =>
        prev.map(note => (note.id === id ? data : note))
      );

      toast({
        title: 'Success',
        description: 'Note updated successfully',
      });

      return data;
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Toggle pin
  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const { data, error } = await supabase
        .from('productivity_notes')
        .update({ is_pinned: !currentPinned })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev =>
        prev.map(note => (note.id === id ? data : note))
      );

      return data;
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast({
        title: 'Error',
        description: 'Failed to pin/unpin note',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete note (soft delete)
  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productivity_notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));

      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Search notes
  const searchNotes = async (searchTerm: string) => {
    if (!user || !currentDealership) return [];

    try {
      const { data, error } = await supabase
        .from('productivity_notes')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('created_by', user.id)
        .is('deleted_at', null)
        .textSearch('search_vector', searchTerm)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error searching notes:', error);
      return [];
    }
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    togglePin,
    deleteNote,
    searchNotes,
    refetch: fetchNotes,
  };
};
