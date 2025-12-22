import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Lock, MessageSquare, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  comment_text: string;
  comment_type: 'public' | 'internal';
  created_at: string;
  user_id: string;
  user_name?: string;
}

interface OrderCommentsProps {
  orderId: string;
  isDetailUser?: boolean;
}

export function OrderComments({ orderId, isDetailUser = false }: OrderCommentsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'public' | 'internal'>('public');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [orderId, loadComments]);

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('order_comments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user names separately
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      // 🔧 FIX: Use RPC to bypass RLS caching issue
      const { data: allProfiles } = await supabase.rpc('get_dealer_user_profiles');
      const profiles = allProfiles?.filter(p => userIds.includes(p.id));

      const profileMap = profiles?.reduce((acc: any, profile) => {
        acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User';
        return acc;
      }, {}) || {};

      const formattedComments: Comment[] = data?.map(comment => ({
        ...comment,
        comment_type: comment.comment_type as 'public' | 'internal',
        user_name: profileMap[comment.user_id] || 'Unknown User'
      })) || [];

      setComments(formattedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({ variant: 'destructive', description: t('messages.error_loading_comments') });
    }
  }, [orderId, t]);

  const addComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: userData.user.id,
          comment_text: newComment.trim(),
          comment_type: commentType,
        });

      if (error) throw error;

      setNewComment('');
      await loadComments();
      toast({ description: t('messages.comment_added_successfully') });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ variant: 'destructive', description: t('messages.error_adding_comment') });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-semibold">{t('orders.comments')}</h3>
        </div>

        {/* Comments List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-muted pl-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {comment.user_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{comment.user_name}</span>
                <Badge
                  variant={comment.comment_type === 'internal' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {comment.comment_type === 'internal' && <Lock className="w-3 h-3 mr-1" />}
                  {t(`comments.${comment.comment_type}`)}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className="text-sm">{comment.comment_text}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              {t('orders.no_comments')}
            </p>
          )}
        </div>

        {/* Add Comment Form */}
        <div className="border-t pt-4 space-y-3">
          <Textarea
            placeholder={t('orders.add_comment_placeholder')}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={commentType === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommentType('public')}
              >
                {t('comments.public')}
              </Button>
              {isDetailUser && (
                <Button
                  variant={commentType === 'internal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentType('internal')}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  {t('comments.internal')}
                </Button>
              )}
            </div>

            <Button
              onClick={addComment}
              disabled={loading || !newComment.trim()}
              size="sm"
            >
              <Send className="w-4 h-4 mr-1" />
              {loading ? t('common.adding') : t('common.add')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
