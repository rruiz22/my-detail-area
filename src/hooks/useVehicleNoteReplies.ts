import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface NoteReply {
  id: string;
  note_id: string;
  dealer_id: number;
  content: string;
  author_id: string;
  created_at: string;
  // Joined data
  author_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface CreateReplyInput {
  note_id: string;
  content: string;
}

/**
 * Hook to fetch replies for a note
 */
export function useNoteReplies(noteId: string | null) {
  return useQuery({
    queryKey: ['note-replies', noteId],
    queryFn: async (): Promise<NoteReply[]> => {
      if (!noteId) return [];

      const { data, error } = await supabase
        .from('vehicle_note_replies')
        .select(`
          *,
          author_profile:profiles!author_id(
            first_name,
            last_name,
            email
          )
        `)
        .eq('note_id', noteId)
        .order('created_at', { ascending: true }); // Chronological order for replies

      if (error) {
        console.error('Error fetching note replies:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!noteId,
  });
}

/**
 * Hook to create a reply
 */
export function useCreateReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();

  return useMutation({
    mutationFn: async (input: CreateReplyInput) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to create replies');
      }

      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('vehicle_note_replies')
        .insert({
          note_id: input.note_id,
          dealer_id: currentDealership.id,
          content: input.content,
          author_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating reply:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note-replies', data.note_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-notes'] }); // Refresh notes list to update reply count
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Auto-refresh activity log
    },
  });
}

/**
 * Hook to delete a reply
 */
export function useDeleteReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, noteId }: { replyId: string; noteId: string }) => {
      const { error } = await supabase
        .from('vehicle_note_replies')
        .delete()
        .eq('id', replyId);

      if (error) {
        console.error('Error deleting reply:', error);
        throw error;
      }

      return { replyId, noteId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note-replies', data.noteId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-notes'] }); // Refresh notes list
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Auto-refresh activity log
    },
  });
}

/**
 * Hook to get reply count for a note
 */
export function useReplyCount(noteId: string | null) {
  return useQuery({
    queryKey: ['note-reply-count', noteId],
    queryFn: async (): Promise<number> => {
      if (!noteId) return 0;

      const { count, error } = await supabase
        .from('vehicle_note_replies')
        .select('*', { count: 'exact', head: true })
        .eq('note_id', noteId);

      if (error) {
        console.error('Error fetching reply count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!noteId,
  });
}
