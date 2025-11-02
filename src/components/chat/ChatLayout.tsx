import React, { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ChatHeader } from './ChatHeader';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
  const [showMobileConversations, setShowMobileConversations] = useState(true);
  const [participants, setParticipants] = useState<Array<{
    user_id: string;
    user_name: string;
    user_avatar_url?: string;
  }>>([]);

  const { conversations, loading: conversationsLoading, createConversation, getConversationParticipants } = useChatConversations(dealerId);
  const messagesHook = useChatMessages(selectedConversationId || '');

  // Handle conversation selection for mobile
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setShowMobileConversations(false); // Show messages on mobile
  };

  // Handle back button on mobile
  const handleBackToConversations = () => {
    setShowMobileConversations(true);
  };

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
    <Card className={cn(
      "h-full flex flex-col overflow-hidden border-0",
      className
    )}>
      {/* Desktop Layout - Resizable panels */}
      <div className="hidden md:flex flex-1 h-full min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Conversations Panel */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
            <div className="h-full flex flex-col border-r">
              <div className="p-4 border-b bg-card flex-shrink-0">
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
                  <div className="text-center text-muted-foreground px-4">
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
      </div>

      {/* Mobile Layout - Toggle between conversations and messages */}
      <div className="md:hidden flex-1 h-full flex flex-col min-h-0">
        {/* Show Conversations List */}
        {showMobileConversations && (
          <div className="h-full flex flex-col min-h-0">
            <div className="p-3 border-b bg-card flex-shrink-0">
              <h2 className="font-semibold text-foreground text-base">
                {t('chat.conversations')}
              </h2>
            </div>

            <ConversationList
              conversations={conversations}
              loading={conversationsLoading}
              selectedId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              dealerId={dealerId}
              onCreateConversation={createConversation}
            />
          </div>
        )}

        {/* Show Messages Thread */}
        {!showMobileConversations && selectedConversationId && (
          <div className="h-full flex flex-col min-h-0">
            <div className="p-3 border-b bg-card flex-shrink-0 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToConversations}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <ChatHeader
                  conversationId={selectedConversationId}
                  conversations={conversations}
                  compact
                />
              </div>
            </div>

            <MessageThread
              conversationId={selectedConversationId}
              messagesHook={messagesHook}
              participants={participants}
            />
          </div>
        )}

        {/* Empty state for mobile */}
        {!showMobileConversations && !selectedConversationId && (
          <div className="h-full flex items-center justify-center bg-muted/20 p-4">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-base font-medium mb-2">
                {t('chat.select_conversation')}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToConversations}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
