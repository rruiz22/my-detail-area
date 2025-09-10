import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Users,
  AtSign,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Comment {
  id: string;
  message: string;
  user_name: string;
  created_at: string;
  user_id: string;
  mentions?: string[];
}

interface PublicCommentsBlockProps {
  orderId: string;
}

export function PublicCommentsBlock({ orderId }: PublicCommentsBlockProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [orderId]);

  const fetchComments = async () => {
    try {
      // Use existing comments table structure (mock for now)
      const mockComments: Comment[] = [
        {
          id: '1',
          message: 'Vehicle has been prepped and is ready for service',
          user_name: 'John Smith',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          user_id: 'user1'
        },
        {
          id: '2', 
          message: 'Customer requested expedited timeline for completion',
          user_name: 'Sarah Johnson',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          user_id: 'user2'
        }
      ];
      
      setComments(mockComments);
      
      // TODO: Replace with actual database query once order_comments table is created
      // const { data, error } = await supabase
      //   .from('order_comments')
      //   .select('*')
      //   .eq('order_id', orderId)
      //   .eq('is_internal', false)
      //   .order('created_at', { ascending: true });
      
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newMessage.trim() || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: user.id,
          comment_text: newMessage.trim(),
          comment_type: 'public'
        })
        .select()
        .single();

      if (error) throw error;

      const meta: any = (user as any)?.user_metadata || {};
      const displayName = meta.first_name && meta.last_name
        ? `${meta.first_name} ${meta.last_name}`
        : (user.email?.split('@')[0] || 'User');

      const added: Comment = {
        id: data.id,
        message: data.comment_text,
        user_name: displayName,
        created_at: data.created_at,
        user_id: data.user_id
      };

      setComments(prev => [...prev, added]);
      setNewMessage('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Team Communication
          <Badge variant="outline" className="text-xs">Public</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Message Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add comment... @mention team members"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={addComment}
              disabled={loading || !newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Paperclip className="h-3 w-3 mr-1" />
              Attach
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <AtSign className="h-3 w-3 mr-1" />
              Mention
            </Button>
          </div>
        </div>

        {/* Comments Thread */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">Start the conversation</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {comment.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{comment.user_name}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(comment.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{comments.length} comments</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>Public discussion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}