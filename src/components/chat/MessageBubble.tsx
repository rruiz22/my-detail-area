import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Reply, 
  MoreHorizontal, 
  Copy, 
  Edit, 
  Trash2, 
  Download,
  Play,
  Pause,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { ChatMessage } from '@/hooks/useChatMessages';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar: boolean;
  onReply: (content: string) => void;
  onReact: (emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  onReply,
  onReact
}) => {
  const { t } = useTranslation();
  const isOwnMessage = message.is_own_message;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="text-sm leading-relaxed">
            {message.content}
          </div>
        );

      case 'voice':
        return (
          <div className="flex items-center space-x-3 min-w-48">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
            >
              <Play className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full">
                <div className="h-1 bg-primary rounded-full w-1/3" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {message.voice_duration_ms ? 
                  `${Math.ceil(message.voice_duration_ms / 1000)}s` : 
                  '0s'
                }
              </div>
            </div>
            {message.voice_transcription && (
              <div className="text-xs text-muted-foreground italic border-l pl-2 ml-2">
                "{message.voice_transcription}"
              </div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center space-x-3 p-2 border rounded-lg bg-muted/50">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.file_name || 'Unknown file'}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.file_size ? 
                  `${(message.file_size / 1024).toFixed(1)} KB` : 
                  'Unknown size'
                }
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {message.file_url && (
              <div className="relative max-w-sm">
                <img
                  src={message.file_url}
                  alt={message.file_name || 'Image'}
                  className="rounded-lg max-h-64 w-auto"
                  loading="lazy"
                />
              </div>
            )}
            {message.content && (
              <div className="text-sm">
                {message.content}
              </div>
            )}
          </div>
        );

      case 'system':
        return (
          <div className="text-xs text-muted-foreground italic text-center py-2">
            {message.content}
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            {t('chat.unsupported_message_type')}
          </div>
        );
    }
  };

  // System messages are centered
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted px-3 py-1 rounded-full">
          {renderMessageContent()}
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex group hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[70%] space-x-3",
        isOwnMessage && "flex-row-reverse space-x-reverse"
      )}>
        {/* Avatar */}
        {showAvatar && !isOwnMessage && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={message.sender?.avatar_url} />
            <AvatarFallback className="text-xs">
              {message.sender?.name ? getInitials(message.sender.name) : 'U'}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message Content */}
        <div className={cn(
          "flex flex-col space-y-1",
          isOwnMessage ? "items-end" : "items-start"
        )}>
          {/* Sender Name & Time */}
          {showAvatar && (
            <div className={cn(
              "flex items-center space-x-2 text-xs",
              isOwnMessage && "flex-row-reverse space-x-reverse"
            )}>
              {!isOwnMessage && (
                <span className="font-medium text-foreground">
                  {message.sender?.name || t('chat.unknown_user')}
                </span>
              )}
              <span className="text-muted-foreground">
                {formatTime(message.created_at)}
              </span>
              {message.is_edited && (
                <Badge variant="secondary" className="text-xs h-4 px-1">
                  {t('chat.edited')}
                </Badge>
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div className={cn(
            "rounded-2xl px-4 py-2 max-w-full break-words",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          )}>
            {/* Reply indicator */}
            {message.parent_message_id && (
              <div className="border-l-2 border-muted-foreground/30 pl-2 mb-2 text-xs opacity-70">
                {t('chat.replying_to')}...
              </div>
            )}

            {/* Mentions */}
            {message.is_mentioned && (
              <div className="mb-1">
                <Badge variant="secondary" className="text-xs h-5">
                  {t('chat.mentioned_you')}
                </Badge>
              </div>
            )}

            {renderMessageContent()}

            {/* Thread indicator */}
            {message.thread_count > 0 && (
              <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  {message.thread_count} {t('chat.replies')}
                </Button>
              </div>
            )}
          </div>

          {/* Reactions */}
          {Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs bg-muted/50 hover:bg-muted"
                  onClick={() => onReact(emoji)}
                >
                  {emoji} {userIds.length}
                </Button>
              ))}
            </div>
          )}

          {/* Only show timestamp without avatar for subsequent messages */}
          {!showAvatar && (
            <div className={cn(
              "text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
              isOwnMessage ? "text-right" : "text-left"
            )}>
              {formatTime(message.created_at)}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start mt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
              <DropdownMenuItem onClick={() => onReply('')}>
                <Reply className="h-4 w-4 mr-2" />
                {t('chat.reply')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                {t('chat.copy')}
              </DropdownMenuItem>
              {isOwnMessage && (
                <>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('chat.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('chat.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Spacer for alignment when no avatar */}
        {!showAvatar && isOwnMessage && (
          <div className="w-8" />
        )}
      </div>
    </div>
  );
};