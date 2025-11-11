import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { pushNotificationHelper } from '@/services/pushNotificationHelper';
import { createCommentNotification } from '@/utils/notificationHelper';
import { extractMentions, resolveMentionsToUserIds, createMentionNotifications } from '@/utils/mentionUtils';
import { slackNotificationService } from '@/services/slackNotificationService';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  deleteComment: (commentId: string) => Promise<void>;
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
  const { toast } = useToast();
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

      // 🎯 PROCESS @MENTIONS (if any)
      const mentions = extractMentions(text);
      if (mentions.length > 0) {
        console.log(`🔔 Detected ${mentions.length} mentions:`, mentions);

        // Get order data for mention notifications
        const { data: orderData } = await supabase
          .from('orders')
          .select('order_number, custom_order_number, dealer_id, order_type')
          .eq('id', orderId)
          .single();

        if (orderData) {
          // Resolve mentions to user IDs
          const mentionedUserIds = await resolveMentionsToUserIds(mentions, orderData.dealer_id);

          if (mentionedUserIds.length > 0) {
            const userName = enhancedUser?.first_name
              ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
              : user.email || 'Someone';

            const orderNumber = orderData.custom_order_number || orderData.order_number || orderId;

            const getNotificationModule = (orderType: string): 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' => {
              const mapping: Record<string, 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash'> = {
                'sales': 'sales_orders',
                'service': 'service_orders',
                'recon': 'recon_orders',
                'carwash': 'car_wash'
              };
              return mapping[orderType] || 'sales_orders';
            };

            const notifModule = getNotificationModule(orderData.order_type || 'sales');

            // Create mention notifications (fire-and-forget)
            void createMentionNotifications(mentionedUserIds, {
              orderId,
              dealerId: orderData.dealer_id,
              module: notifModule,
              entityName: orderNumber,
              mentionerName: userName,
              commentPreview: text.trim().substring(0, 100)
            }).catch(err => console.error('[OrderComments] Failed to create mention notifications:', err));
          }
        }
      }

      // Refresh comments to get the new one with profile data
      await fetchComments();

      // Send push notification to order followers (fire-and-forget, non-blocking)
      if (type === 'public') {
        const userName = enhancedUser?.first_name
          ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
          : user.email || 'Someone';

        // Get order number for notification (fire-and-forget)
        supabase
          .from('orders')
          .select('order_number, custom_order_number, assigned_group_id, dealer_id, order_type')
          .eq('id', orderId)
          .single()
          .then(async ({ data: orderData }) => {
            if (orderData) {
              const orderNumber = orderData.custom_order_number || orderData.order_number || orderId;

              // Map order_type to notification module
              const getNotificationModule = (orderType: string): 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' => {
                const mapping: Record<string, 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash'> = {
                  'sales': 'sales_orders',
                  'service': 'service_orders',
                  'recon': 'recon_orders',
                  'carwash': 'car_wash'
                };
                return mapping[orderType] || 'sales_orders';
              };

              const notifModule = getNotificationModule(orderData.order_type || 'sales');

              // 🔔 NOTIFICATION: Comment Added (in-app notification, dynamic module)
              if (orderData.assigned_group_id && orderData.assigned_group_id !== user.id) {
                void createCommentNotification({
                  userId: orderData.assigned_group_id,
                  dealerId: orderData.dealer_id,
                  module: notifModule,
                  entityType: notifModule.replace('_orders', '_order').replace('car_wash', 'carwash_order'),
                  entityId: orderId,
                  entityName: orderNumber,
                  commenterName: userName,
                  commentPreview: text.trim().substring(0, 100),
                  actionUrl: `/${notifModule.replace('_orders', '').replace('car_wash', 'carwash')}?order=${orderId}#comments`,
                  priority: 'normal'
                }).catch(err =>
                  console.error('[OrderComments] Failed to create comment notification:', err)
                );
              }

              // Show toast notification (fixed: removed .loading() method that doesn't exist)
              // toast.loading('📲 Sending push notification to followers...', { id: 'push-notif' });

              const result = await pushNotificationHelper.notifyNewComment(
                orderId,
                orderNumber,
                userName,
                text.trim()
              );

              // Show appropriate message based on result
              if (result && result.message) {
                if (result.message.includes('No active push notification tokens')) {
                  // User hasn't enabled push notifications - this is normal
                  console.log('ℹ️ User has not enabled push notifications (normal)');
                } else if (result.message.includes('not available') || result.message.includes('not deployed')) {
                  toast({ description: 'ℹ️ Push notifications not configured' });
                } else if (result.sent > 0) {
                  toast({ description: `✅ Push notification sent to ${result.sent} device${result.sent > 1 ? 's' : ''}` });
                }
              } else if (result && result.sent > 0) {
                toast({ description: `✅ Push notification sent to ${result.sent} device${result.sent > 1 ? 's' : ''}` });
              }

              // 📤 SLACK NOTIFICATION: Comment Added
              void slackNotificationService.isEnabled(
                orderData.dealer_id,
                notifModule,
                'comment_added'
              ).then(async (slackEnabled) => {
                if (slackEnabled) {
                  console.log('📤 Slack enabled for comment, sending notification...');

                  // Get shortLink from QR data
                  let shortLink: string | undefined = undefined;
                  try {
                    const { data: qrData } = await supabase
                      .from('order_qr_codes')
                      .select('short_link')
                      .eq('order_id', orderId)
                      .single();
                    shortLink = qrData?.short_link || `${window.location.origin}/orders/${orderId}`;
                  } catch (error) {
                    console.warn('Failed to fetch short link:', error);
                    shortLink = `${window.location.origin}/orders/${orderId}`;
                  }

                  await slackNotificationService.sendNotification({
                    orderId,
                    dealerId: orderData.dealer_id,
                    module: notifModule,
                    eventType: 'comment_added',
                    eventData: {
                      orderNumber: orderNumber,
                      commenterName: userName,
                      commentPreview: text.trim().substring(0, 100),
                      shortLink: shortLink || `${window.location.origin}/orders/${orderId}`
                    }
                  });
                }
              }).catch((error) => {
                console.error('❌ [Slack] Failed to send comment notification:', error);
              });
            }
          })
          .catch((notifError) => {
            console.error('❌ Push notification failed (non-critical):', notifError);
            toast({ variant: 'destructive', description: '⚠️ Push notification failed (comment saved)' });
          });
      }

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

  // Delete comment (soft delete or hard delete)
  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🗑️ Deleting comment:', commentId);

      // First, get the comment to check its type before deleting
      const { data: commentData, error: fetchError } = await supabase
        .from('order_comments')
        .select('comment_type, comment_text')
        .eq('id', commentId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch comment before deletion:', fetchError);
        throw fetchError;
      }

      const commentType = commentData.comment_type; // 'public' or 'internal'
      const isInternalNote = commentType === 'internal';

      // Delete the comment from database
      const { error: deleteError } = await supabase
        .from('order_comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) {
        console.error('❌ Failed to delete comment:', deleteError);
        throw deleteError;
      }

      // Create activity log entry with appropriate action based on type
      const action = isInternalNote ? 'internal_note_deleted' : 'comment_deleted';
      const description = isInternalNote ? 'Deleted an internal note' : 'Deleted a comment';

      const { error: activityError } = await supabase
        .from('order_activities')
        .insert({
          order_id: orderId,
          user_id: user.id,
          action: action,
          description: description,
          action_type: isInternalNote ? 'internal_note' : 'comment',
          old_value: null,
          new_value: null,
          field_name: null,
          metadata: {
            comment_id: commentId,
            comment_type: commentType
          }
        });

      if (activityError) {
        console.error('⚠️ Failed to log comment deletion activity:', activityError);
      }

      // Dispatch event to refresh recent activity
      window.dispatchEvent(new CustomEvent('orderCommentDeleted', {
        detail: { orderId, commentId, commentType }
      }));

      console.log(`✅ ${isInternalNote ? 'Internal note' : 'Comment'} deleted successfully`);

      // Refresh comments list
      await fetchComments();
    } catch (err) {
      console.error('❌ Error deleting comment:', err);
      throw err;
    }
  }, [user, orderId, fetchComments]);

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
    deleteComment,
    refreshComments: fetchComments,
    commentsCount: comments.length,
    internalNotesCount: internalNotes.length,
    canAccessInternal
  };
};
