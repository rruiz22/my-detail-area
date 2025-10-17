import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateReply,
  useDeleteReply,
  useNoteReplies,
} from '@/hooks/useVehicleNoteReplies';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NoteRepliesProps {
  noteId: string;
  className?: string;
}

export function NoteReplies({ noteId, className }: NoteRepliesProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: replies = [], isLoading } = useNoteReplies(noteId);
  const createReply = useCreateReply();
  const deleteReply = useDeleteReply();

  const [replyContent, setReplyContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      toast({
        title: t('get_ready.notes.replies.error'),
        description: t('get_ready.notes.replies.content_required'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createReply.mutateAsync({
        note_id: noteId,
        content: replyContent.trim(),
      });

      setReplyContent('');
      toast({
        title: t('get_ready.notes.replies.created'),
        description: t('get_ready.notes.replies.created_success'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.notes.replies.create_error'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm(t('get_ready.notes.replies.confirm_delete'))) return;

    try {
      await deleteReply.mutateAsync({ replyId, noteId });

      toast({
        title: t('get_ready.notes.replies.deleted'),
        description: t('get_ready.notes.replies.deleted_success'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.notes.replies.delete_error'),
        variant: 'destructive',
      });
    }
  };

  const formatUserName = (reply: typeof replies[0]) => {
    if (!reply.author_profile) return 'Unknown';
    const { first_name, last_name, email } = reply.author_profile;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return email.split('@')[0];
  };

  const getInitials = (reply: typeof replies[0]) => {
    if (!reply.author_profile) return 'U';
    const { first_name, last_name } = reply.author_profile;
    return `${first_name?.[0] || ''}${last_name?.[0] || ''}`.toUpperCase() || 'U';
  };

  if (!isExpanded && replies.length === 0) {
    // Show collapsed button
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="h-3 w-3 mr-1.5" />
        {t('get_ready.notes.replies.add_reply')}
      </Button>
    );
  }

  return (
    <div className={cn('mt-3 pl-4 border-l-2 border-gray-200 space-y-3', className)}>
      {/* Toggle button with count */}
      {replies.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="h-3 w-3 mr-1.5" />
          {isExpanded
            ? t('get_ready.notes.replies.hide_replies', { count: replies.length })
            : t('get_ready.notes.replies.show_replies', { count: replies.length })}
        </Button>
      )}

      {/* Replies list */}
      {isExpanded && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="flex gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      {getInitials(reply)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{formatUserName(reply)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                      {reply.content}
                    </p>
                  </div>

                  {/* Delete button (only for author) */}
                  {user?.id === reply.author_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => handleDeleteReply(reply.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div className="flex gap-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t('get_ready.notes.replies.reply_placeholder')}
              rows={2}
              className="resize-none text-xs"
            />
            <Button
              size="sm"
              onClick={handleSubmitReply}
              disabled={createReply.isPending || !replyContent.trim()}
              className="flex-shrink-0"
            >
              {createReply.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
