import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Reply, 
  MoreHorizontal, 
  ThumbsUp, 
  Heart, 
  Smile, 
  Play, 
  Pause,
  Volume2,
  Download,
  Lock,
  Edit,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { MessageReactions } from './MessageReactions';
import { VoicePlayer } from './VoicePlayer';

interface Message {
  id: string;
  order_id: string;
  parent_message_id?: string;
  user_id: string;
  message_type: 'text' | 'voice' | 'file' | 'system_update';
  content?: string;
  voice_file_path?: string;
  voice_duration_ms?: number;
  voice_transcription?: string;
  attachments: any[];
  mentions: string[];
  reactions: Record<string, string[]>;
  is_edited: boolean;
  edited_at?: string;
  reply_count: number;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
  replies?: Message[];
}

interface MessageThreadProps {
  messages: Message[];
  onReply: (messageId: string, content: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  loading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isDetailUser?: boolean;
}

export function MessageThread({
  messages,
  onReply,
  onReaction,
  loading,
  onLoadMore,
  hasMore,
  isDetailUser = false
}: MessageThreadProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReply = (messageId: string) => {
    if (replyContent.trim()) {
      onReply(messageId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const toggleThread = (messageId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedThreads(newExpanded);
  };

  const renderMessage = (message: Message, isReply = false, depth = 0) => {
    const isSystemMessage = message.message_type === 'system_update';
    const isVoiceMessage = message.message_type === 'voice';
    const isFileMessage = message.message_type === 'file';
    const hasReplies = message.reply_count > 0;
    const isExpanded = expandedThreads.has(message.id);

    return (
      <div
        key={message.id}
        className={`group relative ${isReply ? `ml-${Math.min(depth * 6, 12)} border-l-2 border-muted pl-4` : ''}`}
      >
        <Card className={`p-4 ${isSystemMessage ? 'bg-muted/50' : ''} ${message.is_internal && !isDetailUser ? 'hidden' : ''}`}>
          <div className="flex gap-3">
            {/* Avatar */}
            {!isSystemMessage && (
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={message.user_avatar} />
                <AvatarFallback className="text-xs">
                  {message.user_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                {!isSystemMessage && (
                  <>
                    <span className="font-medium text-sm">{message.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                    {message.is_edited && (
                      <Badge variant="outline" className="text-xs">
                        {t('communication.edited')}
                      </Badge>
                    )}
                    {message.is_internal && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {t('communication.internal')}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                {/* Text Content */}
                {message.content && (
                  <div className="text-sm leading-relaxed">
                    {message.content}
                  </div>
                )}

                {/* Voice Message */}
                {isVoiceMessage && (
                  <div className="space-y-2">
                    <VoicePlayer
                      audioUrl={message.voice_file_path}
                      duration={message.voice_duration_ms}
                    />
                    {message.voice_transcription && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2 border-primary">
                        <div className="font-medium mb-1">{t('communication.transcription')}:</div>
                        {message.voice_transcription}
                      </div>
                    )}
                  </div>
                )}

                {/* File Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="space-y-2">
                    {message.attachments.map((attachment: any, index: number) => (
                      <Card key={index} className="p-3 border border-dashed">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                            {attachment.type?.startsWith('image/') ? '🖼️' : '📎'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{attachment.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {attachment.size && `${(attachment.size / 1024).toFixed(1)} KB`}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(message.reactions).length > 0 && (
                  <MessageReactions
                    reactions={message.reactions}
                    onReaction={(emoji) => onReaction(message.id, emoji)}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(message.id)}
                  className="h-8 px-2"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  {t('communication.reply')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReaction(message.id, '👍')}
                  className="h-8 px-2"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </div>

              {/* Reply Interface */}
              {replyingTo === message.id && (
                <div className="mt-3 p-3 bg-muted/50 rounded border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('communication.reply_placeholder')}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleReply(message.id);
                        }
                      }}
                    />
                    <Button size="sm" onClick={() => handleReply(message.id)}>
                      {t('communication.send')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setReplyingTo(null)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Thread Toggle */}
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleThread(message.id)}
                  className="mt-2 text-xs text-primary"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {isExpanded ? t('communication.hide_replies') : 
                    t('communication.show_replies', { count: message.reply_count })}
                </Button>
              )}

              {/* Nested Replies */}
              {isExpanded && message.replies && (
                <div className="mt-3 space-y-3">
                  {message.replies.map(reply => renderMessage(reply, true, depth + 1))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">{t('communication.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading ? t('communication.loading') : t('communication.load_more')}
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('communication.no_messages')}</p>
          </div>
        ) : (
          messages.map(message => renderMessage(message))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}