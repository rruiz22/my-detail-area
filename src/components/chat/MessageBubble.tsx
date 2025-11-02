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
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/hooks/useChatMessages';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
    Check,
    Copy,
    Download,
    Edit,
    FileText,
    MessageCircle,
    MoreHorizontal,
    Play,
    Reply,
    Smile,
    Trash2,
    X as XIcon
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar: boolean;
  onReply: (content: string) => void;
  onReact: (messageId: string, emoji: string) => Promise<boolean>;
  onRemoveReact: (messageId: string, emoji: string) => Promise<boolean>;
  onEdit: (messageId: string, newContent: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
  getUserName: (userId: string) => string;
  parentMessage?: ChatMessage;
  replies?: ChatMessage[];
  onScrollToMessage?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  onReply,
  onReact,
  onRemoveReact,
  onEdit,
  onDelete,
  getUserName,
  parentMessage,
  replies = [],
  onScrollToMessage
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
            className="bg-background text-foreground border-input"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEditCancel}
              className={cn(
                "h-7",
                isOwnMessage ? "text-foreground hover:bg-muted" : ""
              )}
            >
              <XIcon className="h-3 w-3 mr-1" />
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              className={cn(
                "h-7",
                isOwnMessage ? "bg-background text-foreground hover:bg-muted" : ""
              )}
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
          <div className="text-sm leading-normal font-normal">
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
        "flex group hover:bg-white/40 -mx-2 px-2 py-0.5 rounded-lg transition-colors",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[70%] space-x-2",
        isOwnMessage && "flex-row-reverse space-x-reverse"
      )}>
        {/* Avatar */}
        {showAvatar && !isOwnMessage && (
          <div className="h-7 w-7 mt-0.5 rounded-full overflow-hidden flex-shrink-0">
            <AvatarSystem
              name={message.sender?.name || 'User'}
              firstName={message.sender?.first_name}
              lastName={message.sender?.last_name}
              email={message.sender?.email}
              avatarUrl={message.sender?.avatar_url}
              seed={message.sender?.avatar_seed as any}
              size={28}
            />
          </div>
        )}

        {/* Message Content */}
        <div className={cn(
          "flex flex-col space-y-0.5",
          isOwnMessage ? "items-end" : "items-start"
        )}>
          {/* Sender Name (only if showAvatar) */}
          {showAvatar && !isOwnMessage && (
            <span className="font-medium text-foreground text-xs">
              {message.sender?.name || t('chat.unknown_user')}
            </span>
          )}

          {/* Message Bubble */}
          <div className={cn(
            "rounded-2xl px-3 py-1.5 max-w-full break-words shadow-sm",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-teal-50 text-gray-900 rounded-bl-md border border-teal-200"
          )}>
            {/* Reply indicator - Click to navigate to parent */}
            {message.parent_message_id && (
              <div
                className={cn(
                  "relative border-l-[3px] rounded-lg pl-3 pr-3 py-2.5 mb-3 text-xs cursor-pointer transition-all shadow-sm",
                  isOwnMessage
                    ? "border-blue-300 bg-blue-50/90 hover:bg-blue-100/90 hover:shadow-md"
                    : "border-emerald-400 bg-emerald-50 hover:bg-emerald-100 hover:shadow-md"
                )}
                onClick={() => {
                  if (message.parent_message_id && onScrollToMessage) {
                    onScrollToMessage(message.parent_message_id);
                  }
                }}
              >
                {/* Decorative corner */}
                <div className={cn(
                  "absolute -left-[3px] top-0 w-[3px] h-6 rounded-tl-lg",
                  isOwnMessage ? "bg-blue-400" : "bg-emerald-500"
                )} />

                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full",
                    isOwnMessage ? "bg-blue-200" : "bg-emerald-200"
                  )}>
                    <Reply className={cn(
                      "h-3 w-3",
                      isOwnMessage ? "text-blue-700" : "text-emerald-700"
                    )} />
                  </div>
                  <span className={cn(
                    "font-bold text-[11px] uppercase tracking-wide",
                    isOwnMessage ? "text-blue-700" : "text-emerald-700"
                  )}>
                    {t('chat.replying_to')}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    isOwnMessage ? "text-blue-900" : "text-emerald-900"
                  )}>
                    {parentMessage?.sender?.name || t('chat.unknown_user')}
                  </span>
                </div>
                <div className={cn(
                  "text-xs line-clamp-2 leading-relaxed pl-7",
                  isOwnMessage ? "text-blue-800/90" : "text-emerald-800/90"
                )}>
                  {parentMessage?.content || t('chat.message_not_available')}
                </div>
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

            {/* Thread indicator with hover preview */}
            {replies.length > 0 && (
              <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        // Navigate to first reply
                        if (replies[0] && onScrollToMessage) {
                          onScrollToMessage(replies[0].id);
                        }
                      }}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      {replies.length} {replies.length === 1 ? t('chat.reply') : t('chat.replies')}
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-80 p-3"
                    align={isOwnMessage ? "end" : "start"}
                    side="top"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {replies.length} {replies.length === 1 ? t('chat.reply') : t('chat.replies')}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {replies.slice(0, 3).map((reply) => (
                          <div
                            key={reply.id}
                            className="p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => {
                              if (onScrollToMessage) {
                                onScrollToMessage(reply.id);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs text-primary">
                                {reply.sender?.name || t('chat.unknown_user')}
                              </span>
                              <span className="text-[11px] text-foreground/60 font-medium">
                                {formatTime(reply.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-foreground line-clamp-2">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                        {replies.length > 3 && (
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground">
                              +{replies.length - 3} {t('chat.more_replies')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            )}
          </div>

          {/* Reactions */}
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-wrap gap-0.5 mt-0.5 items-center">
              {/* Existing Reactions */}
              {Object.entries(message.reactions).map(([emoji, userIds]) => {
                const userReacted = user?.id && userIds.includes(user.id);

                // Build tooltip content with user names
                const reactionUsers = userIds.map(id => getUserName(id));
                const tooltipText = (() => {
                  if (userReacted) {
                    const otherUsers = reactionUsers.filter(name => name !== getUserName(user.id));
                    if (otherUsers.length === 0) {
                      return t('chat.you_reacted');
                    } else if (otherUsers.length === 1) {
                      return t('chat.you_and_one_other', { name: otherUsers[0] });
                    } else {
                      return t('chat.you_and_others', { count: otherUsers.length });
                    }
                  } else {
                    if (reactionUsers.length === 1) {
                      return reactionUsers[0];
                    } else if (reactionUsers.length === 2) {
                      return `${reactionUsers[0]} ${t('chat.and')} ${reactionUsers[1]}`;
                    } else {
                      return `${reactionUsers[0]} ${t('chat.and')} ${reactionUsers.length - 1} ${t('chat.others')}`;
                    }
                  }
                })();

                return (
                  <Tooltip key={emoji}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-xs bg-muted/50 hover:bg-muted transition-colors"
                        onClick={() => handleReactionClick(emoji)}
                      >
                        {emoji} {userIds.length}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>
                );
              })}

            {/* Add Reaction Button - Always rendered, visible on hover */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs bg-muted/30 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
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
          </TooltipProvider>

          {/* Timestamp - Always visible below message */}
          <div className={cn(
            "text-[11px] text-foreground/60 font-medium mt-0.5 flex items-center gap-1",
            isOwnMessage ? "justify-end" : "justify-start"
          )}>
            <span>{formatTime(message.created_at)}</span>
            {message.is_edited && (
              <span className="italic font-semibold">({t('chat.edited')})</span>
            )}
          </div>
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
