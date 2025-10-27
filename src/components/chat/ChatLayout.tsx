import React, { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ChatHeader } from './ChatHeader';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatLayoutProps {
  dealerId: number;
  className?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  dealerId,
  className = ''
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{
    user_id: string;
    user_name: string;
    user_avatar_url?: string;
  }>>([]);

  const { conversations, loading: conversationsLoading, createConversation, getConversationParticipants } = useChatConversations(dealerId);
  const messagesHook = useChatMessages(selectedConversationId || '');

  // Fetch participants when conversation changes
  useEffect(() => {
    const fetchParticipants = async () => {
      if (selectedConversationId && getConversationParticipants) {
        try {
          const conversationParticipants = await getConversationParticipants(selectedConversationId);
          setParticipants(conversationParticipants || []);
        } catch (error) {
          console.error('Error fetching participants:', error);
          setParticipants([]);
        }
      } else {
        setParticipants([]);
      }
    };

    fetchParticipants();
  }, [selectedConversationId, getConversationParticipants]);

  if (!user) {
    return (
      <Card className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('chat.auth_required')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`h-[calc(100vh-12rem)] min-h-[500px] max-h-[900px] overflow-hidden ${className}`}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Conversations Panel */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
          <div className="h-full flex flex-col border-r">
            <div className="p-4 border-b bg-card">
              <h2 className="font-semibold text-foreground">
                {t('chat.conversations')}
              </h2>
            </div>
            
            <ConversationList
              conversations={conversations}
              loading={conversationsLoading}
              selectedId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              dealerId={dealerId}
              onCreateConversation={createConversation}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Messages Panel */}
        <ResizablePanel defaultSize={70}>
          <div className="h-full flex flex-col">
            {selectedConversationId ? (
              <>
                <ChatHeader 
                  conversationId={selectedConversationId}
                  conversations={conversations}
                />
                <MessageThread
                  conversationId={selectedConversationId}
                  messagesHook={messagesHook}
                  participants={participants}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">
                    {t('chat.select_conversation')}
                  </h3>
                  <p className="text-sm">
                    {t('chat.select_conversation_desc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
};