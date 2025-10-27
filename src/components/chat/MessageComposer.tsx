import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  Smile,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import EmojiPicker, { EmojiClickData, Categories, Theme } from 'emoji-picker-react';
import { useMentionDetection } from '@/hooks/useMentionDetection';
import { MentionDropdown, MentionSuggestion } from './MentionDropdown';
import './MessageComposer.css';

// File upload constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

interface MessageSendResult {
  id: string;
  success: boolean;
  error?: string;
  message?: {
    id: string;
    content: string;
    created_at: string;
  };
}

interface MessageComposerProps {
  onSendMessage: (content: string, mentions?: string[]) => Promise<MessageSendResult>;
  onSendVoiceMessage: (audioBlob: Blob, transcription?: string) => Promise<MessageSendResult>;
  onSendFileMessage: (file: File, description?: string) => Promise<MessageSendResult>;
  onTyping: (typing: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  participants?: MentionSuggestion[];
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onSendVoiceMessage,
  onSendFileMessage,
  onTyping,
  disabled = false,
  placeholder,
  participants = []
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Mention detection hook
  const { mentionQuery, mentionPosition } = useMentionDetection(message, textareaRef);

  // Show/hide mention dropdown based on query
  useEffect(() => {
    setShowMentions(mentionQuery !== null);
  }, [mentionQuery]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle typing events
  const handleTyping = useCallback((typing: boolean) => {
    onTyping(typing);
    
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  }, [onTyping]);

  // Handle message input change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    adjustTextareaHeight();
    
    if (value.trim()) {
      handleTyping(true);
    } else {
      handleTyping(false);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;
    if (sending || disabled) return;

    setSending(true);
    handleTyping(false);

    try {
      // Send text message if there's content
      if (message.trim()) {
        await onSendMessage(message.trim());
      }

      // Send attached files
      for (const file of attachedFiles) {
        await onSendFileMessage(file, message.trim());
      }

      // Clear form
      setMessage('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Don't send if mention dropdown is open (let keyboard nav handle it)
    if (showMentions) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const cursorPos = textareaRef.current?.selectionStart || message.length;
    const before = message.slice(0, cursorPos);
    const after = message.slice(cursorPos);

    setMessage(`${before}${emojiData.emoji}${after}`);
    setShowEmojiPicker(false);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Handle mention selection
  const handleMentionSelect = (mention: MentionSuggestion | null) => {
    if (!mention) {
      setShowMentions(false);
      return;
    }

    // Replace @query with @username
    const before = message.slice(0, mentionPosition);
    const after = message.slice(mentionPosition + (mentionQuery?.length || 0) + 1);
    const newMessage = `${before}@${mention.name} ${after}`;

    setMessage(newMessage);
    setShowMentions(false);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Handle file selection with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: t('chat.file_too_large', { maxSize: MAX_FILE_SIZE_MB }),
          description: `${file.name} (${formatFileSize(file.size)})`
        });
        continue;
      }

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: t('chat.invalid_file_type'),
          description: file.name
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }

    if (e.target) e.target.value = '';
  };

  // Remove attached file
  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Start voice recording with error handling
  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });

        // Validate voice message size
        if (audioBlob.size > MAX_FILE_SIZE_BYTES) {
          toast({
            variant: "destructive",
            title: t('chat.file_too_large', { maxSize: MAX_FILE_SIZE_MB })
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        await onSendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);

      // Handle permission denied
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast({
          variant: "destructive",
          title: t('chat.voice_permission_denied'),
          description: t('common.check_browser_permissions')
        });
      } else {
        toast({
          variant: "destructive",
          title: t('chat.voice_recording_error')
        });
      }
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canSend = (message.trim() || attachedFiles.length > 0) && !sending && !disabled;

  return (
    <div className="p-2 sm:p-4 space-y-2 sm:space-y-3" data-testid="message-composer">
      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2 text-sm"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <span className="truncate max-w-32">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeAttachedFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input Area */}
      <div className="flex items-end space-x-1 sm:space-x-2">
        {/* Attachment Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 sm:h-10 sm:w-10 p-0 shrink-0"
              disabled={disabled}
            >
              <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4 mr-2" />
              {t('chat.attach_image')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileText className="h-4 w-4 mr-2" />
              {t('chat.attach_file')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Message Input */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder || t('chat.type_message')}
            className="min-h-8 sm:min-h-10 max-h-24 sm:max-h-32 resize-none pr-10 text-sm"
            disabled={disabled}
            aria-label={t('chat.type_message')}
          />

          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            disabled={disabled}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            type="button"
            aria-label={t('chat.emoji.pick_reaction')}
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="emoji-picker-container"
              data-testid="emoji-picker"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                theme={Theme.LIGHT}
                searchPlaceHolder={t('chat.emoji.search')}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled={false}
                height={400}
                width={320}
                lazyLoadEmojis={true}
                categories={[
                  {
                    category: Categories.SUGGESTED,
                    name: t('chat.emoji.recent'),
                  },
                  {
                    category: Categories.SMILEYS_PEOPLE,
                    name: t('chat.emoji.smileys'),
                  },
                  {
                    category: Categories.ANIMALS_NATURE,
                    name: t('chat.emoji.animals'),
                  },
                  {
                    category: Categories.FOOD_DRINK,
                    name: t('chat.emoji.food'),
                  },
                  {
                    category: Categories.TRAVEL_PLACES,
                    name: t('chat.emoji.travel'),
                  },
                  {
                    category: Categories.ACTIVITIES,
                    name: t('chat.emoji.activities'),
                  },
                  {
                    category: Categories.OBJECTS,
                    name: t('chat.emoji.objects'),
                  },
                  {
                    category: Categories.SYMBOLS,
                    name: t('chat.emoji.symbols'),
                  },
                  {
                    category: Categories.FLAGS,
                    name: t('chat.emoji.flags'),
                  },
                ]}
              />
            </div>
          )}

          {/* Mention Dropdown */}
          {showMentions && mentionQuery !== null && (
            <MentionDropdown
              query={mentionQuery}
              participants={participants}
              onSelect={handleMentionSelect}
              position={mentionPosition}
            />
          )}
        </div>

        {/* Voice Recording Button */}
        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size="sm"
          className="h-8 w-8 sm:h-10 sm:w-10 p-0 shrink-0"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          disabled={disabled}
        >
          {isRecording ? (
            <MicOff className="h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={!canSend}
          size="sm"
          className={cn(
            "h-8 w-8 sm:h-10 sm:w-10 p-0 shrink-0 transition-all",
            canSend ? "bg-primary hover:bg-primary/90" : ""
          )}
        >
          <Send className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-2 text-sm text-destructive">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span>{t('chat.recording_hold_to_stop')}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="*/*"
      />
      
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*"
      />
    </div>
  );
};