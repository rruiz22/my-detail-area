import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';

export interface OrderComment {
  id: string;
  orderId: string;
  userId: string;
  commentText: string;
  commentType: 'public' | 'internal';
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
  // User profile data
  userName: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userType: string;
  avatarSeed?: string;
  // Threading data
  replies?: OrderComment[];
  isReply: boolean;
}

export interface OrderCommentsHookResult {
  comments: OrderComment[];
  internalNotes: OrderComment[];
  loading: boolean;
  error: string | null;
  addComment: (text: string, type: 'public' | 'internal', parentId?: string) => Promise<string>;
  refreshComments: () => Promise<void>;
  commentsCount: number;
  internalNotesCount: number;
  canAccessInternal: boolean;
}

export const useOrderComments = (orderId: string): OrderCommentsHookResult => {
  const [allComments, setAllComments] = useState<OrderComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { enhancedUser } = usePermissions();

  // Check if user can access internal notes based on custom role permissions
  const canAccessInternal = (() => {
    if (!user || !enhancedUser) return false;

    // System admins always have access
    if ((enhancedUser as any).is_system_admin) return true;

    // Check if any of user's custom roles has can_access_internal_notes permission
    const customRoles = (enhancedUser as any).custom_roles;
    if (customRoles && Array.isArray(customRoles)) {
      return customRoles.some((role: any) => {
        // Check granularPermissions (JSONB)
        const granPerms = role.granularPermissions;
        if (granPerms && typeof granPerms === 'object') {
          return granPerms.can_access_internal_notes === true;
        }
        return false;
      });
    }

    return false;
  })();

  // Debug permissions
  const customRoles = (enhancedUser as any)?.custom_roles;
  console.log('🔐 Internal notes access check:', {
    userId: user?.id,
    customRolesCount: customRoles?.length || 0,
    isSystemAdmin: (enhancedUser as any)?.is_system_admin,
    rolePermissions: customRoles?.map((r: any) => ({
      role: r.display_name,
      hasGranular: !!r.granularPermissions,
      canAccessInternal: r.granularPermissions?.can_access_internal_notes
    })),
    canAccessInternal
  });

  // Organize threading structure for comments and notes
  const organizeThreading = useCallback((comments: OrderComment[]): OrderComment[] => {
    // Separate parent comments from replies
    const parentComments = comments.filter(c => !c.parentCommentId);
    const repliesMap = new Map<string, OrderComment[]>();

    // Group replies by parent comment id
    comments
      .filter(c => c.parentCommentId)
      .forEach(reply => {
        const parentId = reply.parentCommentId!;
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, []);
        }
        repliesMap.get(parentId)!.push(reply);
      });

    // Attach replies to parent comments
    const threaded = parentComments.map(parent => ({
      ...parent,
      replies: repliesMap.get(parent.id) || []
    }));

    return threaded;
  }, []);

  // Separate comments by type (only parent comments, replies are nested)
  const comments = allComments.filter(c => c.commentType === 'public' && !c.parentCommentId);
  const internalNotes = allComments.filter(c => c.commentType === 'internal' && !c.parentCommentId);

  // Fetch comments from database
  const fetchComments = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`💬 Fetching comments for order: ${orderId}`);

      // Get comments data including parent_comment_id for threading
      const { data: commentsData, error: commentsError } = await supabase
        .from('order_comments')
        .select(`
          id,
          order_id,
          user_id,
          comment_text,
          comment_type,
          parent_comment_id,
          created_at,
          updated_at
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('❌ Error fetching comments:', commentsError);
        setError('Failed to load comments');
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        console.log('📊 No comments found for this order');
        setAllComments([]);
        return;
      }

      // Get user IDs for profiles lookup
      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      // Get profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          user_type,
          avatar_seed,
          avatar_variant
        `)
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        setError('Failed to load user profiles');
        return;
      }

      // Create lookup map for profiles
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      // Transform and combine data
      const transformedComments: OrderComment[] = commentsData
        .map(commentData => {
          const profile = profilesMap.get(commentData.user_id);
          if (!profile) {
            console.warn(`⚠️ Profile not found for user_id: ${commentData.user_id}`);
            return null;
          }

          return {
            id: commentData.id,
            orderId: commentData.order_id,
            userId: commentData.user_id,
            commentText: commentData.comment_text,
            commentType: commentData.comment_type as 'public' | 'internal',
            parentCommentId: commentData.parent_comment_id,
            createdAt: commentData.created_at,
            updatedAt: commentData.updated_at,
            userName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
            userFirstName: profile.first_name || '',
            userLastName: profile.last_name || '',
            userEmail: profile.email || '',
            userType: profile.user_type || 'regular',
            avatarSeed: profile.avatar_seed,
            isReply: !!commentData.parent_comment_id,
            replies: [] // Will be populated in threading logic
          };
        })
        .filter(Boolean) as OrderComment[];

      // Organize threading structure
      const organizedComments = organizeThreading(transformedComments);

      console.log(`✅ Loaded ${transformedComments.length} comments/notes with threading`);
      setAllComments(organizedComments);

    } catch (err) {
      console.error('❌ Unexpected error fetching comments:', err);
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Add a new comment or internal note - returns comment.id for attachment linking
  const addComment = useCallback(async (text: string, type: 'public' | 'internal', parentId?: string): Promise<string> => {
    if (!user || !orderId || !text.trim()) {
      throw new Error('Missing required parameters');
    }

    // Check permissions for internal notes
    if (type === 'internal' && !canAccessInternal) {
      throw new Error('Insufficient permissions for internal notes');
    }

    try {
      console.log(`💬 Adding ${type} to order ${orderId}${parentId ? ` (reply to ${parentId})` : ''}`);

      const { data, error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: user.id,
          comment_text: text.trim(),
          comment_type: type,
          parent_comment_id: parentId || null
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error adding ${type}:`, error);
        throw error;
      }

      const commentId = data.id;
      console.log(`✅ ${type} added successfully${parentId ? ' as reply' : ''} - ID: ${commentId}`);

      // Refresh comments to get the new one with profile data
      await fetchComments();

      // Dispatch custom event to notify other components (like RecentActivityBlock)
      window.dispatchEvent(new CustomEvent('orderCommentAdded', {
        detail: { orderId, commentId, type: 'comment_added' }
      }));

      return commentId;

    } catch (err) {
      console.error(`❌ Failed to add ${type}:`, err);
      throw err;
    }
  }, [user, orderId, canAccessInternal, fetchComments]);

  // Initialize data and set up real-time subscription
  useEffect(() => {
    fetchComments();

    // Set up real-time subscription for comments
    const subscription = supabase
      .channel(`order-comments-${orderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_comments',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        console.log('📡 Real-time comment update:', payload.eventType);
        // Refresh comments when changes occur
        fetchComments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, fetchComments]);

  return {
    comments,
    internalNotes,
    loading,
    error,
    addComment,
    refreshComments: fetchComments,
    commentsCount: comments.length,
    internalNotesCount: internalNotes.length,
    canAccessInternal
  };
};
