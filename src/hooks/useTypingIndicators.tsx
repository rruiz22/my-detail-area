import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingIndicator {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  updated_at: string;
}

interface UseTypingIndicatorsReturn {
  typingUsers: string[];
  setIsTyping: (conversationId: string, typing: boolean) => Promise<void>;
  getTypingUsersProfiles: () => Promise<Record<string, { name: string; avatar_url?: string }>>;
}

export const useTypingIndicators = (conversationId?: string): UseTypingIndicatorsReturn => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const TYPING_TIMEOUT = 3000; // 3 seconds

  // Set typing status
  const setIsTyping = useCallback(async (convId: string, typing: boolean) => {
    if (!user?.id || !convId) return;

    try {
      if (typing) {
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Insert or update typing indicator
        await supabase
          .from('chat_typing_indicators')
          .upsert({
            user_id: user.id,
            conversation_id: convId,
            is_typing: true
          });

        // Set timeout to automatically stop typing
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(convId, false);
        }, TYPING_TIMEOUT);
      } else {
        // Clear timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Update typing indicator to false
        await supabase
          .from('chat_typing_indicators')
          .upsert({
            user_id: user.id,
            conversation_id: convId,
            is_typing: false
          });
      }
    } catch (err) {
      console.error('Error updating typing status:', err);
    }
  }, [user?.id]);

  // Get typing users profiles
  const getTypingUsersProfiles = useCallback(async () => {
    if (typingUsers.length === 0) return {};

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', typingUsers);

      return profiles?.reduce((acc, profile) => {
        acc[profile.id] = {
          name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : profile.email,
          avatar_url: undefined
        };
        return acc;
      }, {} as Record<string, { name: string; avatar_url?: string }>) || {};
    } catch (err) {
      console.error('Error fetching typing users profiles:', err);
      return {};
    }
  }, [typingUsers]);

  // Subscribe to typing indicators for the conversation
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const typingSubscription = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Typing indicator change:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const indicator = payload.new as TypingIndicator;
            
            // Don't show own typing
            if (indicator.user_id === user.id) return;
            
            setTypingUsers(prev => {
              if (indicator.is_typing) {
                return [...new Set([...prev, indicator.user_id])];
              } else {
                return prev.filter(id => id !== indicator.user_id);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(typingSubscription);
    };
  }, [conversationId, user?.id]);

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (user?.id && conversationId) {
        setIsTyping(conversationId, false);
      }
    };
  }, [user?.id, conversationId, setIsTyping]);

  return {
    typingUsers,
    setIsTyping,
    getTypingUsersProfiles
  };
};