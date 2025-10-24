import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { TypingIndicator } from './TypingIndicator';
import { DateSeparator } from './DateSeparator';
import { UseChatMessagesReturn, ChatMessage } from '@/hooks/useChatMessages';
import { useTranslation } from 'react-i18next';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { MessageCircle } from 'lucide-react';

interface MessageThreadProps {
  conversationId: string;
  messagesHook: UseChatMessagesReturn;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversationId,
  messagesHook
}) => {
  const { t } = useTranslation();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    sendVoiceMessage,
    sendFileMessage,
    loadMore,
    typingUsers,
    setIsTyping,
    markAsRead,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage
  } = messagesHook;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage?.is_own_message) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [conversationId, messages.length, markAsRead]);

  const formatDateSeparator = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return t('chat.today');
    } else if (isYesterday(messageDate)) {
      return t('chat.yesterday');
    } else {
      return format(messageDate, 'MMMM d, yyyy');
    }
  };

  const shouldShowDateSeparator = (currentMessage: ChatMessage, previousMessage: ChatMessage | null) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at);
    const previousDate = new Date(previousMessage.created_at);
    
    return !isSameDay(currentDate, previousDate);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30 animate-pulse" />
            <p>{t('chat.loading_messages')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-destructive">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">{t('chat.error_loading')}</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full" data-testid="message-thread">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="py-4 space-y-1">
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center py-2">
              <button
                onClick={loadMore}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                {loading ? t('chat.loading') : t('chat.load_more_messages')}
              </button>
            </div>
          )}

          {/* No Messages State */}
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">{t('chat.no_messages')}</h3>
              <p className="text-sm">{t('chat.start_conversation')}</p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => {
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
            const showAvatar = !previousMessage || 
                              previousMessage.user_id !== message.user_id ||
                              showDateSeparator;

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <DateSeparator date={formatDateSeparator(message.created_at)} />
                )}
                
                <MessageBubble
                  message={message}
                  showAvatar={showAvatar}
                  onReply={(content) => {
                    // TODO: Implement reply functionality
                  }}
                  onReact={addReaction}
                  onRemoveReact={removeReaction}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                />
              </React.Fragment>
            );
          })}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Composer */}
      <div className="border-t bg-background">
        <MessageComposer
          onSendMessage={sendMessage}
          onSendVoiceMessage={sendVoiceMessage}
          onSendFileMessage={sendFileMessage}
          onTyping={setIsTyping}
          disabled={loading}
        />
      </div>
    </div>
  );
};