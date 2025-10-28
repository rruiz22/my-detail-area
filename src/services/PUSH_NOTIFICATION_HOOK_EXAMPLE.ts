/**
 * Real-World Custom Hook Example: useOrderActions
 *
 * This file demonstrates how to integrate the pushNotificationHelper service
 * into a custom React hook that handles all order-related actions.
 *
 * This is a REFERENCE IMPLEMENTATION showing best practices for:
 * - Type safety with TypeScript
 * - Error handling patterns
 * - Non-blocking notification sends
 * - Integration with Supabase
 * - Toast notifications for user feedback
 * - Proper separation of concerns
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { pushNotificationHelper } from './pushNotificationHelper';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  id: string;
  order_number: string;
  status: string;
  dealer_id: number;
  customer_name: string;
  vin?: string;
  assigned_to?: string;
}

interface OrderComment {
  id: string;
  order_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
}

interface UseOrderActionsResult {
  // State
  isUpdating: boolean;
  error: Error | null;

  // Order actions
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<boolean>;
  assignUserToOrder: (orderId: string, userId: string) => Promise<boolean>;

  // Communication actions
  addComment: (orderId: string, content: string) => Promise<OrderComment | null>;
  uploadAttachment: (orderId: string, file: File) => Promise<OrderAttachment | null>;

  // Notification actions (direct access if needed)
  sendCustomNotification: (
    userId: string,
    title: string,
    body: string,
    url?: string
  ) => Promise<void>;
}

// ============================================================================
// CUSTOM HOOK: useOrderActions
// ============================================================================

/**
 * Custom hook for handling order-related actions with integrated notifications
 *
 * This hook encapsulates all order actions and automatically sends appropriate
 * push notifications to relevant users (followers, assignees, etc).
 *
 * @example
 * ```typescript
 * const { updateOrderStatus, addComment, isUpdating } = useOrderActions(order);
 *
 * // Update status - automatically notifies followers
 * await updateOrderStatus(order.id, 'In Progress');
 *
 * // Add comment - automatically notifies followers
 * await addComment(order.id, 'Vehicle is ready for inspection');
 * ```
 */
export function useOrderActions(order: Order | null): UseOrderActionsResult {
  const { user, dealershipId } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ============================================================================
  // ORDER STATUS UPDATE
  // ============================================================================

  /**
   * Update order status and notify all followers
   *
   * Flow:
   * 1. Update order in database
   * 2. Show success toast to user
   * 3. Send push notifications to followers (non-blocking)
   * 4. Return success status
   */
  const updateOrderStatus = async (
    orderId: string,
    newStatus: string
  ): Promise<boolean> => {
    if (!user || !order) {
      toast({
        title: 'Error',
        description: 'User or order not available',
        variant: 'destructive',
      });
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      console.log('[useOrderActions] Updating order status:', {
        orderId,
        newStatus,
        previousStatus: order.status,
      });

      // 1. Update database
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 2. Show success message to user immediately
      toast({
        title: 'Status Updated',
        description: `Order ${order.order_number} status changed to ${newStatus}`,
      });

      // 3. Send notifications to followers (non-blocking)
      // This runs in background and doesn't block the UI
      pushNotificationHelper
        .notifyOrderStatusChange(
          orderId,
          order.order_number,
          newStatus,
          `${user.firstName} ${user.lastName}`
        )
        .catch((notifError) => {
          // Log notification failures but don't show to user
          console.error('[useOrderActions] Notification failed:', notifError);
        });

      console.log('[useOrderActions] Order status updated successfully');
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('[useOrderActions] Status update failed:', error);
      setError(error);

      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update order status',
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================================
  // ORDER ASSIGNMENT
  // ============================================================================

  /**
   * Assign user to order and notify them
   *
   * Flow:
   * 1. Create assignment record
   * 2. Auto-follow the assigned user
   * 3. Show success toast
   * 4. Send notification to assigned user (non-blocking)
   */
  const assignUserToOrder = async (
    orderId: string,
    assigneeUserId: string
  ): Promise<boolean> => {
    if (!user || !dealershipId || !order) {
      toast({
        title: 'Error',
        description: 'Required information not available',
        variant: 'destructive',
      });
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      console.log('[useOrderActions] Assigning user to order:', {
        orderId,
        assigneeUserId,
        assignedBy: user.id,
      });

      // 1. Create assignment record
      const { error: assignError } = await supabase.from('order_assignments').insert({
        order_id: orderId,
        user_id: assigneeUserId,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      });

      if (assignError) throw assignError;

      // 2. Auto-follow the assigned user
      const { error: followError } = await supabase.from('entity_followers').insert({
        entity_type: 'order',
        entity_id: orderId,
        user_id: assigneeUserId,
        dealer_id: dealershipId,
        follow_type: 'assigned',
        notification_level: 'all',
        followed_by: user.id,
        is_active: true,
        auto_added_reason: 'User assigned to order',
      });

      if (followError) {
        // Don't fail if follower already exists
        if (!followError.message.includes('duplicate')) {
          throw followError;
        }
      }

      // 3. Show success message
      toast({
        title: 'User Assigned',
        description: 'User has been assigned to this order',
      });

      // 4. Notify assigned user (non-blocking)
      pushNotificationHelper
        .notifyOrderAssignment(
          assigneeUserId,
          dealershipId,
          orderId,
          order.order_number,
          `${user.firstName} ${user.lastName}`
        )
        .catch((notifError) => {
          console.error('[useOrderActions] Assignment notification failed:', notifError);
        });

      console.log('[useOrderActions] User assigned successfully');
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('[useOrderActions] Assignment failed:', error);
      setError(error);

      toast({
        title: 'Assignment Failed',
        description: error.message || 'Failed to assign user to order',
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================================
  // ADD COMMENT
  // ============================================================================

  /**
   * Add comment to order and notify followers
   *
   * Flow:
   * 1. Insert comment into database
   * 2. Show success toast
   * 3. Send notifications to followers (non-blocking)
   * 4. Return created comment
   */
  const addComment = async (
    orderId: string,
    content: string
  ): Promise<OrderComment | null> => {
    if (!user || !order) {
      toast({
        title: 'Error',
        description: 'User or order not available',
        variant: 'destructive',
      });
      return null;
    }

    if (!content.trim()) {
      toast({
        title: 'Invalid Comment',
        description: 'Comment cannot be empty',
        variant: 'destructive',
      });
      return null;
    }

    setIsUpdating(true);
    setError(null);

    try {
      console.log('[useOrderActions] Adding comment to order:', {
        orderId,
        contentLength: content.length,
      });

      // 1. Insert comment
      const { data: comment, error: insertError } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: user.id,
          content: content.trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Show success message
      toast({
        title: 'Comment Added',
        description: 'Your comment has been posted',
      });

      // 3. Notify followers (non-blocking)
      pushNotificationHelper
        .notifyNewComment(
          orderId,
          order.order_number,
          `${user.firstName} ${user.lastName}`,
          content
        )
        .catch((notifError) => {
          console.error('[useOrderActions] Comment notification failed:', notifError);
        });

      console.log('[useOrderActions] Comment added successfully');
      return comment as OrderComment;
    } catch (err) {
      const error = err as Error;
      console.error('[useOrderActions] Add comment failed:', error);
      setError(error);

      toast({
        title: 'Comment Failed',
        description: error.message || 'Failed to add comment',
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================================
  // UPLOAD ATTACHMENT
  // ============================================================================

  /**
   * Upload attachment to order and notify followers
   *
   * Flow:
   * 1. Upload file to Supabase Storage
   * 2. Create attachment record in database
   * 3. Show success toast
   * 4. Send notifications to followers (non-blocking)
   * 5. Return attachment record
   */
  const uploadAttachment = async (
    orderId: string,
    file: File
  ): Promise<OrderAttachment | null> => {
    if (!user || !order) {
      toast({
        title: 'Error',
        description: 'User or order not available',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return null;
    }

    setIsUpdating(true);
    setError(null);

    try {
      console.log('[useOrderActions] Uploading attachment:', {
        orderId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // 1. Upload to storage
      const filePath = `${orderId}/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Create attachment record
      const { data: attachment, error: dbError } = await supabase
        .from('order_attachments')
        .insert({
          order_id: orderId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Show success message
      toast({
        title: 'File Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      // 4. Notify followers (non-blocking)
      pushNotificationHelper
        .notifyNewAttachment(
          orderId,
          order.order_number,
          `${user.firstName} ${user.lastName}`,
          file.name
        )
        .catch((notifError) => {
          console.error('[useOrderActions] Attachment notification failed:', notifError);
        });

      console.log('[useOrderActions] Attachment uploaded successfully');
      return attachment as OrderAttachment;
    } catch (err) {
      const error = err as Error;
      console.error('[useOrderActions] Upload failed:', error);
      setError(error);

      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================================
  // CUSTOM NOTIFICATION
  // ============================================================================

  /**
   * Send custom notification (for advanced use cases)
   *
   * Use this when the convenience methods don't fit your needs
   */
  const sendCustomNotification = async (
    userId: string,
    title: string,
    body: string,
    url?: string
  ): Promise<void> => {
    if (!dealershipId) {
      console.error('[useOrderActions] Cannot send notification: dealership ID not available');
      return;
    }

    try {
      await pushNotificationHelper.sendNotification({
        userId,
        dealerId: dealershipId,
        title,
        body,
        url,
        data: {
          customNotification: true,
          sentBy: user?.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[useOrderActions] Custom notification failed:', err);
    }
  };

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================

  return {
    // State
    isUpdating,
    error,

    // Actions
    updateOrderStatus,
    assignUserToOrder,
    addComment,
    uploadAttachment,
    sendCustomNotification,
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Using in a component
 *
 * ```typescript
 * function OrderDetailPage() {
 *   const { order } = useOrder(orderId);
 *   const {
 *     updateOrderStatus,
 *     addComment,
 *     uploadAttachment,
 *     isUpdating
 *   } = useOrderActions(order);
 *
 *   const handleStatusChange = async (newStatus: string) => {
 *     const success = await updateOrderStatus(order.id, newStatus);
 *     if (success) {
 *       // Refresh order data
 *       refetchOrder();
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <StatusDropdown
 *         value={order.status}
 *         onChange={handleStatusChange}
 *         disabled={isUpdating}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Example 2: Comment form integration
 *
 * ```typescript
 * function CommentForm({ orderId }) {
 *   const { order } = useOrder(orderId);
 *   const { addComment, isUpdating } = useOrderActions(order);
 *   const [text, setText] = useState('');
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     const comment = await addComment(orderId, text);
 *     if (comment) {
 *       setText('');
 *       // Comment added and followers notified automatically
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <textarea value={text} onChange={e => setText(e.target.value)} />
 *       <button type="submit" disabled={isUpdating}>
 *         Post Comment
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */

/**
 * Example 3: File upload with drag & drop
 *
 * ```typescript
 * function AttachmentDropzone({ orderId }) {
 *   const { order } = useOrder(orderId);
 *   const { uploadAttachment, isUpdating } = useOrderActions(order);
 *
 *   const handleDrop = async (files: File[]) => {
 *     for (const file of files) {
 *       const attachment = await uploadAttachment(orderId, file);
 *       if (attachment) {
 *         // File uploaded and followers notified automatically
 *       }
 *     }
 *   };
 *
 *   return (
 *     <Dropzone onDrop={handleDrop} disabled={isUpdating}>
 *       Drop files here
 *     </Dropzone>
 *   );
 * }
 * ```
 */
