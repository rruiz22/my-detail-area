import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  AtSign, 
  Bold, 
  Italic, 
  Lock,
  X,
  ImageIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MentionPicker } from './MentionPicker';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MessageComposerProps {
  onSendMessage: (content: string, type: 'public' | 'internal', mentions: string[], attachments: File[]) => void;
  mentionUsers: User[];
  isDetailUser?: boolean;
}

export function MessageComposer({ 
  onSendMessage, 
  mentionUsers, 
  isDetailUser = false 
}: MessageComposerProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'public' | 'internal'>('public');
  const [showMentions, setShowMentions] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    
    onSendMessage(content, messageType, mentions, attachments);
    
    // Reset form
    setContent('');
    setMentions([]);
    setAttachments([]);
    setMessageType('public');
    setIsComposing(false);
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Handle @ mentions
    if (e.key === '@' || (e.key === '2' && e.shiftKey)) {
      setShowMentions(true);
    }
  };

  const handleMention = (user: User) => {
    if (!mentions.includes(user.id)) {
      setMentions([...mentions, user.id]);
    }
    
    // Insert mention in text
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBefore = content.substring(0, cursorPosition);
    const textAfter = content.substring(cursorPosition);
    const mentionText = `@${user.name} `;
    
    setContent(textBefore + mentionText + textAfter);
    setShowMentions(false);
    
    // Move cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = cursorPosition + mentionText.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 5 - attachments.length);
    setAttachments([...attachments, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const removeMention = (userId: string) => {
    setMentions(mentions.filter(id => id !== userId));
  };

  return (
    <div className="p-4 bg-background border-t">
      {/* Mentions and Type Badges */}
      {(mentions.length > 0 || messageType === 'internal') && (
        <div className="flex flex-wrap gap-2 mb-3">
          {mentions.map(userId => {
            const user = mentionUsers.find(u => u.id === userId);
            return user ? (
              <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                {user.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => removeMention(userId)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ) : null;
          })}
          
          {messageType === 'internal' && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {t('communication.internal_message')}
            </Badge>
          )}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((file, index) => (
            <Badge key={index} variant="outline" className="flex items-center gap-2 p-2">
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              <span className="text-xs max-w-20 truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0"
                onClick={() => removeAttachment(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Main Composer */}
      <div className="space-y-3">
        {/* Text Area */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder={t('communication.message_placeholder')}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsComposing(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none pr-12"
            onFocus={() => setIsComposing(true)}
            onBlur={() => setIsComposing(content.length > 0)}
          />
          
          {/* Character count and formatting */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {content.length}/2000
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Attachment Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 5}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            {/* Mention Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMentions(!showMentions)}
            >
              <AtSign className="w-4 h-4" />
            </Button>

            {/* Emoji Button */}
            <Button variant="ghost" size="sm">
              <Smile className="w-4 h-4" />
            </Button>

            {/* Message Type Toggle */}
            <div className="flex gap-1 ml-2">
              <Button
                variant={messageType === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType('public')}
              >
                {t('communication.public')}
              </Button>
              {isDetailUser && (
                <Button
                  variant={messageType === 'internal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMessageType('internal')}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  {t('communication.internal')}
                </Button>
              )}
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!content.trim() && attachments.length === 0}
            className="min-w-[80px]"
          >
            <Send className="w-4 h-4 mr-1" />
            {t('communication.send')}
          </Button>
        </div>
      </div>

      {/* Mention Picker */}
      {showMentions && (
        <div className="mt-3">
          <MentionPicker
            users={mentionUsers}
            onSelect={handleMention}
            onClose={() => setShowMentions(false)}
          />
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
}