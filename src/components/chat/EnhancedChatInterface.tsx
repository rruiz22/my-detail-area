import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Reply,
  Edit3,
  Trash2,
  Pin,
  Search,
  Users,
  Settings,
  Video,
  Phone,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Image,
  File,
  Calendar,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Hash,
  AtSign
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'system';
  metadata?: {
    file_url?: string;
    file_name?: string;
    file_size?: number;
    voice_duration?: number;
    mentions?: string[];
    thread_count?: number;
    reactions?: Record<string, string[]>;
  };
  parent_message_id?: string;
  is_edited?: boolean;
  is_pinned?: boolean;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen?: string;
  typing?: boolean;
}

interface EnhancedChatInterfaceProps {
  conversationId: string;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  currentUserId: string;
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file' | 'voice' | 'system', metadata?: ChatMessage['metadata']) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  className?: string;
  showParticipants?: boolean;
  allowVoice?: boolean;
  allowFiles?: boolean;
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  conversationId,
  messages,
  participants,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReaction,
  className = '',
  showParticipants = true,
  allowVoice = true,
  allowFiles = true
}) => {
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const mentions = extractMentions(newMessage);
    const metadata = mentions.length > 0 ? { mentions } : undefined;

    if (replyingTo) {
      onSendMessage(newMessage, 'text', { 
        ...metadata, 
        parent_message_id: replyingTo.id 
      });
      setReplyingTo(null);
    } else {
      onSendMessage(newMessage, 'text', metadata);
    }

    setNewMessage('');
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Mock file upload - in real implementation, upload to storage first
    const fileMetadata = {
      file_name: file.name,
      file_size: file.size,
      file_url: URL.createObjectURL(file)
    };

    onSendMessage(
      file.type.startsWith('image/') ? 'Image uploaded' : 'File uploaded',
      file.type.startsWith('image/') ? 'image' : 'file',
      fileMetadata
    );
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    // Voice recording implementation would go here
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    // Stop recording and send voice message
    onSendMessage('Voice message', 'voice', {
      voice_duration: 15000, // Mock duration
      file_url: 'mock-voice-url'
    });
  };

  const filteredMessages = messages.filter(message =>
    searchQuery === '' || 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMessages = groupMessagesByDate(filteredMessages);

  const getDeliveryStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent': return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default: return <Clock className="h-3 w-3 text-gray-300" />;
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.user_id === currentUserId;
    const participant = participants.find(p => p.id === message.user_id);

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
      >
        {!isOwn && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={participant?.avatar} />
            <AvatarFallback>
              {participant?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1 max-w-[70%]`}>
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {participant?.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </span>
              {participant?.status === 'online' && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          )}

          <div className={`relative p-3 rounded-lg max-w-full ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}>
            {message.parent_message_id && (
              <div className="mb-2 p-2 bg-black/10 rounded text-xs opacity-75">
                <Reply className="h-3 w-3 inline mr-1" />
                Replying to previous message
              </div>
            )}

            {message.message_type === 'text' && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {renderMessageContent(message.content)}
              </p>
            )}

            {message.message_type === 'image' && message.metadata?.file_url && (
              <div className="space-y-2">
                <img 
                  src={message.metadata.file_url} 
                  alt={message.metadata.file_name}
                  className="max-w-full h-auto rounded"
                />
                <p className="text-sm">{message.content}</p>
              </div>
            )}

            {message.message_type === 'file' && message.metadata && (
              <div className="flex items-center gap-2 p-2 bg-black/10 rounded">
                <File className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.metadata.file_name}
                  </p>
                  <p className="text-xs opacity-75">
                    {formatFileSize(message.metadata.file_size || 0)}
                  </p>
                </div>
              </div>
            )}

            {message.message_type === 'voice' && message.metadata && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <div className="flex-1 h-2 bg-black/20 rounded-full">
                  <div className="h-full w-1/3 bg-white rounded-full" />
                </div>
                <span className="text-xs">
                  {Math.floor((message.metadata.voice_duration || 0) / 1000)}s
                </span>
              </div>
            )}

            {message.is_edited && (
              <span className="text-xs opacity-50 ml-2">(edited)</span>
            )}

            {isOwn && (
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs opacity-50">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                {getDeliveryStatusIcon(message.delivery_status)}
              </div>
            )}

            {/* Message reactions */}
            {message.metadata?.reactions && Object.keys(message.metadata.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(message.metadata.reactions).map(([emoji, users]) => (
                  <Badge 
                    key={emoji} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={() => onReaction?.(message.id, emoji)}
                  >
                    {emoji} {users.length}
                  </Badge>
                ))}
              </div>
            )}

            {/* Message actions (shown on hover) */}
            <div className={`absolute top-0 ${isOwn ? 'left-0' : 'right-0'} transform ${isOwn ? '-translate-x-full' : 'translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border rounded-lg shadow-sm p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(message)}
                  className="h-6 w-6 p-0"
                >
                  <Reply className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReaction?.(message.id, '👍')}
                  className="h-6 w-6 p-0"
                >
                  <Smile className="h-3 w-3" />
                </Button>
                {isOwn && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMessage(message.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMessage?.(message.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {message.metadata?.thread_count && message.metadata.thread_count > 0 && (
            <Button variant="ghost" size="sm" className="mt-1 text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {message.metadata.thread_count} replies
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  const renderMessageContent = (content: string) => {
    // Simple mention highlighting
    return content.replace(/@(\w+)/g, '<span class="bg-blue-100 text-blue-800 px-1 rounded">@$1</span>');
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {participants.slice(0, 3).map((participant) => (
                  <Avatar key={participant.id} className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>
                      {participant.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {participants.length > 3 && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                    +{participants.length - 3}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium">
                  {participants.length === 2 
                    ? participants.find(p => p.id !== currentUserId)?.name
                    : `${participants.length} participants`}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {typingUsers.length > 0 && (
                    <span>{typingUsers.join(', ')} typing...</span>
                  )}
                  <span>
                    {participants.filter(p => p.status === 'online').length} online
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('chat.search_messages', 'Search messages...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Pin className="h-4 w-4 mr-2" />
                    {t('chat.pin_conversation', 'Pin Conversation')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('chat.conversation_settings', 'Settings')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <Badge variant="outline" className="text-xs">
                    {date}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {dateMessages.map(renderMessage)}
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Reply Banner */}
        {replyingTo && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Replying to {participants.find(p => p.id === replyingTo.user_id)?.name}
                </span>
                <span className="text-sm text-gray-500 truncate max-w-48">
                  {replyingTo.content}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-end gap-2">
            {allowFiles && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,*"
                />
              </>
            )}

            <div className="flex-1 relative">
              <Input
                placeholder={t('chat.type_message', 'Type a message...')}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            {allowVoice && (
              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="sm"
                onMouseDown={startVoiceRecording}
                onMouseUp={stopVoiceRecording}
                onMouseLeave={stopVoiceRecording}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}

            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <>
          <Separator orientation="vertical" />
          <div className="w-64 border-l border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('chat.participants', 'Participants')} ({participants.length})
                </h4>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>
                            {participant.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          participant.status === 'online' ? 'bg-green-500' :
                          participant.status === 'away' ? 'bg-yellow-500' :
                          participant.status === 'busy' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {participant.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {participant.status === 'online' 
                            ? t('chat.online', 'Online')
                            : participant.last_seen 
                            ? `Last seen ${formatDistanceToNow(new Date(participant.last_seen), { addSuffix: true })}`
                            : t('chat.offline', 'Offline')
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper functions
const groupMessagesByDate = (messages: ChatMessage[]) => {
  const groups: Record<string, ChatMessage[]> = {};
  
  messages.forEach(message => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });
  
  return groups;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};