import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Frown,
  Heart,
  Plus,
  Smile,
  ThumbsUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Reaction {
  type: string;
  count: number;
  userReacted: boolean;
}

interface CommentReactionsProps {
  commentId: string;
  className?: string;
}

export function CommentReactions({ commentId, className }: CommentReactionsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Reaction types with emojis and icons
  const reactionTypes = [
    { type: 'like', emoji: '👍', icon: ThumbsUp, label: 'Like' },
    { type: 'love', emoji: '❤️', icon: Heart, label: 'Love' },
    { type: 'laugh', emoji: '😊', icon: Smile, label: 'Laugh' },
    { type: 'wow', emoji: '😮', icon: Plus, label: 'Wow' },
    { type: 'sad', emoji: '😢', icon: Frown, label: 'Sad' },
    { type: 'angry', emoji: '😠', icon: Frown, label: 'Angry' }
  ];

  // Fetch reactions for comment
  const fetchReactions = async () => {
    if (!commentId) return;

    try {
      // Simple query instead of RPC for better reliability
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('reaction_type, user_id')
        .eq('comment_id', commentId);

      if (error) {
        console.error('❌ Error fetching reactions:', error);
        return;
      }

      // Group reactions and check if user reacted
      const reactionMap = new Map<string, { count: number; userReacted: boolean }>();

      (data || []).forEach((reaction) => {
        const existing = reactionMap.get(reaction.reaction_type) || { count: 0, userReacted: false };
        existing.count++;
        if (reaction.user_id === user?.id) {
          existing.userReacted = true;
        }
        reactionMap.set(reaction.reaction_type, existing);
      });

      // Convert to array format
      const reactionsArray: Reaction[] = Array.from(reactionMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        userReacted: data.userReacted
      }));

      setReactions(reactionsArray);

    } catch (error) {
      console.error('❌ Error fetching reactions:', error);
    }
  };

  // Toggle reaction
  const toggleReaction = async (reactionType: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const existingReaction = reactions.find(r => r.type === reactionType && r.userReacted);

      // Get comment data for event dispatching
      const { data: commentData } = await supabase
        .from('order_comments')
        .select('order_id, comment_type')
        .eq('id', commentId)
        .single();

      const orderId = commentData?.order_id;

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType);

        if (error) throw error;

        toast.success('Reaction removed');
      } else {
        // Add reaction
        const { error } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType
          });

        if (error) throw error;

        // Dispatch event to refresh recent activity
        if (orderId) {
          window.dispatchEvent(new CustomEvent('reactionAdded', {
            detail: { orderId, commentId, reactionType }
          }));
        }

        toast.success('Reaction added');
      }

      // Refresh reactions
      await fetchReactions();

    } catch (error) {
      console.error('❌ Error toggling reaction:', error);
      toast.error('Failed to update reaction');
    } finally {
      setLoading(false);
    }
  };

  // Load reactions on mount
  useEffect(() => {
    fetchReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId]);

  if (reactions.length === 0) {
    // Show quick reaction buttons when no reactions exist
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs hover:bg-blue-50"
          onClick={() => toggleReaction('like')}
          disabled={loading}
        >
          <ThumbsUp className="h-3 w-3 mr-1" />
          Like
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs hover:bg-red-50"
          onClick={() => toggleReaction('love')}
          disabled={loading}
        >
          <Heart className="h-3 w-3 mr-1" />
          Love
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center flex-wrap gap-1 ${className}`}>
      {reactions.map((reaction) => {
        const reactionConfig = reactionTypes.find(rt => rt.type === reaction.type);
        if (!reactionConfig) return null;

        return (
          <Button
            key={reaction.type}
            variant={reaction.userReacted ? "default" : "outline"}
            size="sm"
            className={`h-6 px-2 text-xs ${
              reaction.userReacted
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            onClick={() => toggleReaction(reaction.type)}
            disabled={loading}
          >
            <span className="mr-1">{reactionConfig.emoji}</span>
            {reaction.count}
          </Button>
        );
      })}

      {/* Add more reactions button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => {
          // TODO: Show reaction picker modal
          toast.info('More reactions coming soon');
        }}
        disabled={loading}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
