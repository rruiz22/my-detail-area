import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { useUserPresence } from '@/hooks/useUserPresence';
import { supabase } from '@/integrations/supabase/client';

interface ActiveChat {
  conversationId: string;
  entityType?: string;
  entityId?: string;
  participantName?: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface GlobalChatContextType {
  // Chat state
  isFloatingChatOpen: boolean;
  setIsFloatingChatOpen: (open: boolean) => void;
  activeChats: ActiveChat[];
  
  // Quick actions
  openContextualChat: (entityType: string, entityId: string, participantId?: string) => void;
  openDirectMessage: (userId: string) => void;
  sendQuickSMS: (phone: string, message: string, entityType?: string, entityId?: string) => Promise<void>;
  
  // Notifications
  totalUnreadCount: number;
  notificationGroups: any[];
  
  // Presence
  teamPresence: any[];
  userStatus: any;
  
  // Loading states
  loading: boolean;
}

const GlobalChatContext = createContext<GlobalChatContextType | undefined>(undefined);

interface GlobalChatProviderProps {
  children: ReactNode;
  dealerId?: number;
}

export function GlobalChatProvider({ children, dealerId }: GlobalChatProviderProps) {
  const { user } = useAuth();
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [loading, setLoading] = useState(true);

  // Hook integrations
  const { conversations, createConversation } = useChatConversations();
  const { groupedNotifications, unreadCount } = useSmartNotifications(dealerId);
  const { usersPresence, myPresence } = useUserPresence(dealerId);

  const openContextualChat = async (entityType: string, entityId: string, participantId?: string) => {
    if (!dealerId || !user?.id) {
      console.warn('Cannot open contextual chat: Missing dealerId or user');
      return;
    }

    try {
      // Create or find existing conversation
      let conversationName = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Discussion`;
      
      if (entityType === 'order') {
        // Get order details for better naming
        const { data: order } = await supabase
          .from('orders')
          .select('order_number, customer_name')
          .eq('id', entityId)
          .single();
        
        if (order) {
          conversationName = `Order ${order.order_number}`;
        }
      }

      const conversation = await createConversation({
        name: conversationName,
        conversation_type: 'group',
        is_private: false,
        participant_ids: [],
        dealer_id: dealerId
      });

      if (conversation) {
        // Add to active chats
        const newActiveChat: ActiveChat = {
          conversationId: conversation.id,
          entityType,
          entityId,
          participantName: conversationName,
          unreadCount: 0
        };

        setActiveChats(prev => {
          const exists = prev.find(chat => chat.conversationId === conversation.id);
          if (exists) return prev;
          return [...prev, newActiveChat];
        });

        // Open floating chat
        setIsFloatingChatOpen(true);
      }
    } catch (error) {
      console.error('Error opening contextual chat:', error);
    }
  };

  const openDirectMessage = async (userId: string) => {
    if (!dealerId || !user?.id) {
      console.warn('Cannot open direct message: Missing dealerId or user');
      return;
    }

    try {
      // Get user profile for naming
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Direct Message';

      const conversation = await createConversation({
        name: userName,
        conversation_type: 'direct',
        is_private: true,
        participant_ids: [userId],
        dealer_id: dealerId
      });

      if (conversation) {
        const newActiveChat: ActiveChat = {
          conversationId: conversation.id,
          participantName: userName,
          unreadCount: 0
        };

        setActiveChats(prev => {
          const exists = prev.find(chat => chat.conversationId === conversation.id);
          if (exists) return prev;
          return [...prev, newActiveChat];
        });

        setIsFloatingChatOpen(true);
      }
    } catch (error) {
      console.error('Error opening direct message:', error);
    }
  };

  const sendQuickSMS = async (
    phone: string, 
    message: string, 
    entityType?: string, 
    entityId?: string
  ) => {
    if (!dealerId) {
      console.warn('Cannot send SMS: Missing dealerId');
      throw new Error('Dealer ID required for SMS');
    }

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: phone,
          message,
          entityType,
          entityId,
          dealerId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  };

  // Load active conversations on mount
  useEffect(() => {
    if (!conversations.length) return;

    const recentConversations = conversations
      .slice(0, 5)
      .map(conv => ({
        conversationId: conv.id,
        participantName: conv.name || 'Unknown',
        unreadCount: conv.unread_count || 0,
        lastMessage: conv.other_participant?.name || ''
      }));

    setActiveChats(recentConversations);
    setLoading(false);
  }, [conversations]);

  // Keyboard shortcut for opening chat
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsFloatingChatOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  const value: GlobalChatContextType = {
    // Chat state
    isFloatingChatOpen,
    setIsFloatingChatOpen,
    activeChats,
    
    // Quick actions
    openContextualChat,
    openDirectMessage,
    sendQuickSMS,
    
    // Notifications
    totalUnreadCount: unreadCount,
    notificationGroups: groupedNotifications,
    
    // Presence
    teamPresence: usersPresence,
    userStatus: myPresence,
    
    // Loading
    loading
  };

  return (
    <GlobalChatContext.Provider value={value}>
      {children}
    </GlobalChatContext.Provider>
  );
}

export function useGlobalChat() {
  const context = useContext(GlobalChatContext);
  if (context === undefined) {
    throw new Error('useGlobalChat must be used within a GlobalChatProvider');
  }
  return context;
}