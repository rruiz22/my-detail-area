import { AttachmentsList } from '@/components/attachments/AttachmentsList';
import { FileSelector } from '@/components/attachments/FileSelector';
import { MentionInput } from '@/components/mentions/MentionInput';
import { CommentReactions } from '@/components/reactions/CommentReactions';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useAttachments } from '@/hooks/useAttachments';
import { useOrderComments } from '@/hooks/useOrderComments';
import {
    AtSign,
    Clock,
    Eye,
    Lock,
    MessageSquare,
    MoreHorizontal,
    Reply,
    Send,
    Shield,
    Trash2
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface TeamCommunicationBlockProps {
  orderId: string;
}

export function TeamCommunicationBlock({ orderId }: TeamCommunicationBlockProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('comments');
  const [newMessage, setNewMessage] = useState('');
  const [currentMentions, setCurrentMentions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Separate attachments for Comments and Internal Notes
  const commentsAttachments = useAttachments(orderId);
  const internalAttachments = useAttachments(orderId);

  const {
    comments,
    internalNotes,
    loading: commentsLoading,
    error,
    addComment,
    deleteComment,
    commentsCount,
    internalNotesCount,
    canAccessInternal
  } = useOrderComments(orderId);

  // Ensure activeTab is 'comments' if user doesn't have access to internal notes
  React.useEffect(() => {
    if (!canAccessInternal && activeTab === 'internal') {
      setActiveTab('comments');
    }
  }, [canAccessInternal, activeTab]);

  // Handle adding comment/note with attachments - ENTERPRISE ORDER
  const handleAddMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const currentAttachments = activeTab === 'comments' ? commentsAttachments : internalAttachments;

      // 1. Create comment FIRST to get comment.id
      const commentId = await addComment(
        newMessage.trim(),
        activeTab === 'comments' ? 'public' : 'internal'
      );

      console.log(`✅ Comment created with ID: ${commentId}`);

      // 2. Upload selected files LINKED to the comment (if any)
      if (currentAttachments.selectedFiles.length > 0) {
        console.log(`📎 Uploading ${currentAttachments.selectedFiles.length} files linked to comment ${commentId}...`);
        await currentAttachments.uploadSelectedFiles(
          activeTab === 'comments' ? 'public_comment' : 'internal_note',
          commentId  // Link files to this comment
        );

        // Wait for real-time to propagate (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Dispatch event to force immediate refresh
        window.dispatchEvent(new CustomEvent('attachmentUploaded', {
          detail: { orderId, commentId }
        }));

        console.log('📡 Attachment upload completed, event dispatched');
      }

      // 3. Clear message and files AFTER everything completes
      setNewMessage('');
      currentAttachments.clearFiles();

      toast({
        description: activeTab === 'comments'
          ? t('order_comments.comment_added', 'Comment added successfully')
          : t('order_comments.note_added', 'Internal note added successfully')
      });
    } catch (error) {
      console.error('❌ Failed to add message with attachments:', error);
      toast({
        variant: 'destructive',
        description: activeTab === 'comments'
          ? t('order_comments.comment_failed', 'Failed to add comment')
          : t('order_comments.note_failed', 'Failed to add internal note')
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle adding reply
  const handleAddReply = async (parentId: string) => {
    if (!replyMessage.trim()) return;

    setLoading(true);
    try {
      await addComment(
        replyMessage.trim(),
        activeTab === 'comments' ? 'public' : 'internal',
        parentId
      );
      setReplyMessage('');
      setReplyingTo(null);
      toast({ description: t('order_comments.reply_added', 'Reply added successfully') });
    } catch (error) {
      toast({ variant: 'destructive', description: t('order_comments.reply_failed', 'Failed to add reply') });
    } finally {
      setLoading(false);
    }
  };

  // Start replying to a comment
  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyMessage('');
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  // Confirm and delete comment
  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await deleteComment(commentToDelete);
      toast({
        description: activeTab === 'comments'
          ? t('order_comments.comment_deleted', 'Comment deleted successfully')
          : t('order_comments.note_deleted', 'Internal note deleted successfully')
      });
    } catch (error) {
      console.error('❌ Failed to delete comment:', error);
      toast({ variant: 'destructive', description: t('order_comments.delete_failed', 'Failed to delete comment') });
    } finally {
      setCommentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderMessageList = (messages: Array<Record<string, unknown>>, type: 'comments' | 'internal') => {
    if (messages.length === 0) {
      return (
        <div className="text-center py-8 px-4 rounded-xl bg-muted/40 border-2 border-dashed">
          {type === 'comments' ? (
            <>
              <div className="p-3 rounded-lg bg-muted/60 w-fit mx-auto mb-3">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">{t('order_comments.no_comments', 'No comments yet')}</p>
              <p className="text-xs text-muted-foreground">{t('order_comments.start_conversation', 'Start the conversation')}</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-lg bg-amber-100/60 w-fit mx-auto mb-3">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-sm font-medium mb-1">{t('order_comments.no_internal_notes', 'No internal notes yet')}</p>
              <p className="text-xs text-muted-foreground">{t('order_comments.add_private_notes', 'Add private notes for the detail team')}</p>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {messages.map((message) => (
          <div key={message.id as string} className="space-y-2">
            {/* Parent Comment/Note */}
            <div className={`p-2.5 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-3 ${
              type === 'internal'
                ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-400'
                : 'bg-gradient-to-br from-background to-muted/30 border-primary'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <AvatarSystem
                  name={message.userName as string}
                  firstName={message.userFirstName as string}
                  lastName={message.userLastName as string}
                  email={message.userEmail as string}
                  seed={message.avatarSeed as number}
                  size={26}
                  className="ring-1 ring-primary/10"
                />
                <span className={`text-sm font-bold ${
                  type === 'internal' ? 'text-amber-900' : 'text-foreground'
                }`}>
                  {message.userName as string}
                </span>
                {type === 'internal' && (
                  <Badge variant="outline" className="text-xs leading-none py-0.5 px-1.5 font-medium border-amber-400 text-amber-800 bg-amber-50">
                    {t('order_comments.detail_team', 'Detail Team')}
                  </Badge>
                )}
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 text-xs font-medium text-muted-foreground ml-auto">
                  <Clock className="h-3 w-3" />
                  {formatTime(message.createdAt as string)}
                </div>
              </div>
              <p className={`text-sm font-medium whitespace-pre-wrap ${
                type === 'internal' ? 'text-amber-900' : 'text-foreground'
              }`}>
                {message.commentText as string}
              </p>

              {/* Show attachments for this comment */}
              <AttachmentsList
                orderId={orderId}
                commentId={message.id as string}
                context={type === 'internal' ? 'internal_note' : 'public_comment'}
              />

              {/* Comment Actions: Reactions + Reply */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                <CommentReactions commentId={message.id as string} />

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    onClick={() => startReply(message.id as string)}
                  >
                    <Reply className="h-3.5 w-3.5 mr-1" />
                    Reply
                  </Button>

                  {/* Show More menu only if user is author */}
                  {user?.id === message.userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => openDeleteDialog(message.id as string)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          {t('order_comments.delete', 'Delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Reply input (shown when replying to this comment) */}
              {replyingTo === message.id && (
                <div className="mt-2 border-l-2 border-primary pl-3 bg-muted/20 rounded-r-lg p-2">
                  <div className="flex gap-2">
                    <MentionInput
                      value={replyMessage}
                      onChange={(value, mentions) => {
                        setReplyMessage(value);
                        setCurrentMentions(mentions);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddReply(message.id as string);
                        }
                      }}
                      placeholder={t('order_comments.reply_placeholder', 'Write a reply...')}
                      className="flex-1 text-xs"
                      disabled={loading || commentsLoading}
                    />
                    <Button
                      onClick={() => handleAddReply(message.id as string)}
                      disabled={loading || !replyMessage.trim() || commentsLoading}
                      size="sm"
                      className="h-8"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setReplyingTo(null)}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Threaded Replies */}
            {message.replies && (message.replies as Array<Record<string, unknown>>).length > 0 && (
              <div className={`ml-6 space-y-1.5 border-l-2 pl-3 ${
                type === 'internal' ? 'border-amber-300' : 'border-primary/40'
              }`}>
                {(message.replies as Array<Record<string, unknown>>).map((reply) => (
                  <div key={reply.id as string} className={`p-2 rounded-lg shadow-sm border-l-2 ${
                    type === 'internal'
                      ? 'bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-300'
                      : 'bg-gradient-to-br from-muted/30 to-muted/50 border-primary/30'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="secondary" className="text-xs leading-none py-0.5 px-1.5 font-medium">
                        Reply
                      </Badge>
                      <AvatarSystem
                        name={reply.userName as string}
                        firstName={reply.userFirstName as string}
                        lastName={reply.userLastName as string}
                        email={reply.userEmail as string}
                        seed={reply.avatarSeed as number}
                        size={22}
                        className="ring-1 ring-primary/10"
                      />
                      <span className={`text-xs font-bold ${
                        type === 'internal' ? 'text-amber-800' : 'text-foreground'
                      }`}>
                        {reply.userName as string}
                      </span>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 text-xs font-medium text-muted-foreground ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatTime(reply.createdAt as string)}
                      </div>
                    </div>
                    <p className={`text-xs font-medium whitespace-pre-wrap ${
                      type === 'internal' ? 'text-amber-900' : 'text-foreground'
                    }`}>
                      {reply.commentText as string}
                    </p>

                    {/* Reply actions */}
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/30">
                      <CommentReactions commentId={reply.id as string} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-4 bg-gradient-to-br from-background to-muted/20">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold">{t('order_comments.title', 'Order Comments')}</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${canAccessInternal ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('order_comments.comments', 'Comments')}
              {commentsCount > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {commentsCount}
                </Badge>
              )}
            </TabsTrigger>
            {canAccessInternal && (
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('order_comments.internal_notes', 'Internal Notes')}
                {internalNotesCount > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1 bg-amber-100 text-amber-800">
                    {internalNotesCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="comments" className="space-y-4 mt-4">
            {/* Comments Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <MentionInput
                  value={newMessage}
                  onChange={(value, mentions) => {
                    setNewMessage(value);
                    setCurrentMentions(mentions);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder={t('order_comments.add_comment_placeholder', 'Add comment... @mention team members')}
                  className="flex-1"
                  disabled={loading || commentsLoading}
                />
                <Button
                  onClick={handleAddMessage}
                  disabled={loading || !newMessage.trim() || commentsLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <FileSelector
                      selectedFiles={commentsAttachments.selectedFiles}
                      onFilesSelected={commentsAttachments.addFiles}
                      onFilesSelectedWithValidation={commentsAttachments.addFilesWithValidation}
                      onRemoveFile={commentsAttachments.removeFile}
                      disabled={loading || commentsLoading}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="text-xs flex-shrink-0">
                    <AtSign className="h-3 w-3 mr-1" />
                    {t('order_comments.mention', 'Mention')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {error && (
              <div className="text-center py-6 px-4 rounded-xl bg-red-50 border-2 border-red-200">
                <div className="p-3 rounded-lg bg-red-100 w-fit mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
            )}

            {commentsLoading ? (
              <div className="text-center py-6 px-3 rounded-xl bg-muted/40 border">
                <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-xs font-medium text-muted-foreground mt-3">
                  {t('order_comments.loading_comments', 'Loading comments...')}
                </p>
              </div>
            ) : (
              renderMessageList(comments, 'comments')
            )}

            {/* Comments Footer */}
            {commentsCount > 0 && (
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground pt-3 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{t('order_comments.comments_count', '{{count}} comments', { count: commentsCount })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{t('order_comments.team_discussion', 'Team discussion')}</span>
                </div>
              </div>
            )}
          </TabsContent>

          {canAccessInternal && (
            <TabsContent value="internal" className="space-y-4 mt-4">
              {/* Internal Notes Input */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <MentionInput
                    value={newMessage}
                    onChange={(value, mentions) => {
                      setNewMessage(value);
                      setCurrentMentions(mentions);
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={t('order_comments.add_internal_placeholder', 'Add internal note... @mention detail team')}
                    className="flex-1 border-amber-300"
                    disabled={loading || commentsLoading}
                  />
                  <Button
                    onClick={handleAddMessage}
                    disabled={loading || !newMessage.trim() || commentsLoading}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <FileSelector
                        selectedFiles={internalAttachments.selectedFiles}
                        onFilesSelected={internalAttachments.addFiles}
                        onFilesSelectedWithValidation={internalAttachments.addFilesWithValidation}
                        onRemoveFile={internalAttachments.removeFile}
                        disabled={loading || commentsLoading}
                        className="border-amber-300"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-amber-300 flex-shrink-0">
                      <AtSign className="h-3 w-3 mr-1" />
                      {t('order_comments.mention_team', 'Mention Team')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Internal Notes List */}
              {error && (
                <div className="text-center py-6 px-4 rounded-xl bg-red-50 border-2 border-red-200">
                  <div className="p-3 rounded-lg bg-red-100 w-fit mx-auto mb-3">
                    <Lock className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              )}

              {commentsLoading ? (
                <div className="text-center py-6 px-3 rounded-xl bg-amber-50/60 border-2 border-amber-200">
                  <div className="animate-spin w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-xs font-medium text-amber-800 mt-3">
                    {t('order_comments.loading_notes', 'Loading internal notes...')}
                  </p>
                </div>
              ) : (
                renderMessageList(internalNotes, 'internal')
              )}

              {/* Internal Notes Footer */}
              {internalNotesCount > 0 && (
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground pt-3 border-t border-amber-300">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    <span>{t('order_comments.internal_count', '{{count}} internal notes', { count: internalNotesCount })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>{t('order_comments.confidential', 'Confidential')}</span>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Access Denied Message for Internal Notes (if user can't access) */}
        {!canAccessInternal && activeTab === 'internal' && (
          <div className="text-center py-8 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/40">
            <div className="p-4 rounded-lg bg-amber-100 w-fit mx-auto mb-4">
              <Lock className="h-12 w-12 text-amber-600" />
            </div>
            <h4 className="font-bold text-lg mb-2">{t('order_comments.access_denied', 'Access Denied')}</h4>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t('order_comments.detail_access_required', 'Detail team access required')}
            </p>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 font-medium">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              {t('order_comments.restricted_access', 'Restricted Access')}
            </Badge>
          </div>
        )}
      </CardContent>

      {/* Delete Comment Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('order_comments.confirm_delete_title', 'Delete Comment')}
        description={t('order_comments.confirm_delete_description', 'Are you sure you want to delete this comment? This action cannot be undone.')}
        confirmText={t('order_comments.delete_confirm', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteComment}
        variant="destructive"
      />
    </Card>
  );
}
