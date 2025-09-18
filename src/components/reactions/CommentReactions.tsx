import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  ThumbsUp,
  Smile,
  Frown,
  Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
      const { data, error } = await supabase.rpc('get_comment_reactions_summary', {
        p_comment_id: commentId
      });

      if (error) {
        console.error('❌ Error fetching reactions:', error);
        return;
      }

      setReactions(data || []);

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