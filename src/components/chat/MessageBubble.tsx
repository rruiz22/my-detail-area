import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Image as ImageIcon,
  Smile,
  Check,
  X as XIcon
} from 'lucide-react';
import { ChatMessage } from '@/hooks/useChatMessages';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar: boolean;
  onReply: (content: string) => void;
  onReact: (messageId: string, emoji: string) => Promise<boolean>;
  onRemoveReact: (messageId: string, emoji: string) => Promise<boolean>;
  onEdit: (messageId: string, newContent: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  onReply,
  onReact,
  onRemoveReact,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const isOwnMessage = message.is_own_message;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  // Handle emoji picker selection
  const handleEmojiClick = async (emojiData: EmojiClickData) => {
    const success = await onReact(message.id, emojiData.emoji);
    if (success) {
      setShowEmojiPicker(false);
    } else {
      toast({
        variant: "destructive",
        title: t('chat.reaction_error')
      });
    }
  };

  // Toggle reaction (add/remove)
  const handleReactionClick = async (emoji: string) => {
    if (!user?.id) return;

    const userReacted = message.reactions[emoji]?.includes(user.id);

    if (userReacted) {
      await onRemoveReact(message.id, emoji);
    } else {
      await onReact(message.id, emoji);
    }
  };

  // Handle edit message
  const handleEditSave = async () => {
    if (!editedContent.trim() || editedContent === message.content) {
      setIsEditing(false);
      return;
    }

    const success = await onEdit(message.id, editedContent.trim());
    if (success) {
      setIsEditing(false);
      toast({
        title: t('chat.message_updated')
      });
    } else {
      toast({
        variant: "destructive",
        title: t('chat.edit_error')
      });
    }
  };

  const handleEditCancel = () => {
    setEditedContent(message.content || '');
    setIsEditing(false);
  };

  // Handle delete message
  const handleDeleteConfirm = async () => {
    const success = await onDelete(message.id);
    if (success) {
      setShowDeleteDialog(false);
      toast({
        title: t('chat.message_deleted')
      });
    } else {
      toast({
        variant: "destructive",
        title: t('chat.delete_error')
      });
    }
  };

  // Handle copy message
  const handleCopyMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast({
        title: t('chat.message_copied')
      });
    }
  };

  const renderMessageContent = () => {
    // Edit mode for text messages
    if (isEditing && message.message_type === 'text') {
      return (
        <div className="space-y-2">
          <Input
            ref={editInputRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEditSave();
              } else if (e.key === 'Escape') {
                handleEditCancel();
              }
            }}
            className="bg-background"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEditCancel}
              className="h-7"
            >
              <XIcon className="h-3 w-3 mr-1" />
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              className="h-7"
            >
              <Check className="h-3 w-3 mr-1" />
              {t('common.save')}
            </Button>
          </div>
        </div>
      );
    }

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
          {(Object.keys(message.reactions).length > 0 || showEmojiPicker) && (
            <div className="flex flex-wrap gap-1 mt-1 items-center">
              {Object.entries(message.reactions).map(([emoji, userIds]) => {
                const userReacted = user?.id && userIds.includes(user.id);
                return (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-xs transition-colors",
                      userReacted
                        ? "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => handleReactionClick(emoji)}
                  >
                    {emoji} {userIds.length}
                  </Button>
                );
              })}

              {/* Add Reaction Button */}
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs bg-muted/30 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Smile className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    lazyLoadEmojis={true}
                  />
                </PopoverContent>
              </Popover>
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
              <DropdownMenuItem onClick={handleCopyMessage}>
                <Copy className="h-4 w-4 mr-2" />
                {t('chat.copy')}
              </DropdownMenuItem>
              {isOwnMessage && message.message_type === 'text' && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('chat.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chat.delete_message_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('chat.delete_message_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('chat.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};