import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Paperclip,
  Lock,
  Shield,
  AtSign,
  Clock,
  Eye,
  Reply,
  MoreHorizontal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrderComments } from '@/hooks/useOrderComments';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { FileUpload } from '@/components/attachments/FileUpload';
import { AttachmentsList } from '@/components/attachments/AttachmentsList';
import { MentionInput } from '@/components/mentions/MentionInput';
import { CommentReactions } from '@/components/reactions/CommentReactions';
import { toast } from 'sonner';

interface TeamCommunicationBlockProps {
  orderId: string;
}

export function TeamCommunicationBlock({ orderId }: TeamCommunicationBlockProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('comments');
  const [newMessage, setNewMessage] = useState('');
  const [currentMentions, setCurrentMentions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const {
    comments,
    internalNotes,
    loading: commentsLoading,
    error,
    addComment,
    commentsCount,
    internalNotesCount,
    canAccessInternal
  } = useOrderComments(orderId);

  // Handle adding comment/note
  const handleAddMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await addComment(
        newMessage.trim(),
        activeTab === 'comments' ? 'public' : 'internal'
      );
      setNewMessage('');
      toast.success(
        activeTab === 'comments'
          ? t('team_communication.comment_added', 'Comment added successfully')
          : t('team_communication.note_added', 'Internal note added successfully')
      );
    } catch (error) {
      toast.error(
        activeTab === 'comments'
          ? t('team_communication.comment_failed', 'Failed to add comment')
          : t('team_communication.note_failed', 'Failed to add internal note')
      );
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
      toast.success(t('team_communication.reply_added', 'Reply added successfully'));
    } catch (error) {
      toast.error(t('team_communication.reply_failed', 'Failed to add reply'));
    } finally {
      setLoading(false);
    }
  };

  // Start replying to a comment
  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyMessage('');
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

  const renderMessageList = (messages: any[], type: 'comments' | 'internal') => {
    if (messages.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          {type === 'comments' ? (
            <>
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('team_communication.no_comments', 'No comments yet')}</p>
              <p className="text-xs">{t('team_communication.start_conversation', 'Start the conversation')}</p>
            </>
          ) : (
            <>
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('team_communication.no_internal_notes', 'No internal notes yet')}</p>
              <p className="text-xs">{t('team_communication.add_private_notes', 'Add private notes for the detail team')}</p>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${
              type === 'internal'
                ? 'bg-amber-100/50 border border-amber-200'
                : 'bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <AvatarSystem
                name={message.userName}
                firstName={message.userFirstName}
                lastName={message.userLastName}
                email={message.userEmail}
                seed={message.avatarSeed}
                size={24}
              />
              <span className={`text-sm font-medium ${
                type === 'internal' ? 'text-amber-800' : ''
              }`}>
                {message.userName}
              </span>
              {type === 'internal' && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                  {t('team_communication.detail_team', 'Detail Team')}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <Clock className="h-3 w-3" />
                {formatTime(message.createdAt)}
              </div>
            </div>
            <p className={`text-sm whitespace-pre-wrap ${
              type === 'internal' ? 'text-amber-900' : ''
            }`}>
              {message.commentText}
            </p>

            {/* Show attachments for this comment */}
            <AttachmentsList
              orderId={orderId}
              context={type === 'internal' ? 'internal_note' : 'public_comment'}
            />

            {/* Comment Actions: Reactions + Reply */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-muted">
              <CommentReactions commentId={message.id} />

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => startReply(message.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    // TODO: Implement more actions (edit, delete, etc.)
                    toast.info('More actions coming soon');
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Reply input (shown when replying to this comment) */}
            {replyingTo === message.id && (
              <div className="ml-8 mt-2 space-y-2 border-l-2 border-muted pl-4">
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
                        handleAddReply(message.id);
                      }
                    }}
                    placeholder={t('team_communication.reply_placeholder', 'Write a reply...')}
                    className="flex-1"
                    disabled={loading || commentsLoading}
                  />
                  <Button
                    onClick={() => handleAddReply(message.id)}
                    disabled={loading || !replyMessage.trim() || commentsLoading}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setReplyingTo(null)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t('team_communication.title', 'Team Communication')}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('team_communication.comments', 'Comments')}
              {commentsCount > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {commentsCount}
                </Badge>
              )}
            </TabsTrigger>
            {canAccessInternal && (
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('team_communication.internal_notes', 'Internal Notes')}
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
                  placeholder={t('team_communication.add_comment_placeholder', 'Add comment... @mention team members')}
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

              <div className="flex items-center gap-2">
                <FileUpload
                  orderId={orderId}
                  uploadContext="public_comment"
                  onUploadComplete={() => {
                    toast.success(t('team_communication.attachment_added', 'File attached successfully'));
                  }}
                />
                <Button variant="outline" size="sm" className="text-xs">
                  <AtSign className="h-3 w-3 mr-1" />
                  {t('team_communication.mention', 'Mention')}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {error && (
              <div className="text-center py-4 text-red-600">
                <p className="text-xs">{error}</p>
              </div>
            )}

            {commentsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('team_communication.loading_comments', 'Loading comments...')}
                </p>
              </div>
            ) : (
              renderMessageList(comments, 'comments')
            )}

            {/* Comments Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{t('team_communication.comments_count', '{{count}} comments', { count: commentsCount })}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{t('team_communication.team_discussion', 'Team discussion')}</span>
              </div>
            </div>
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
                    placeholder={t('team_communication.add_internal_placeholder', 'Add internal note... @mention detail team')}
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

                <div className="flex items-center gap-2">
                  <FileUpload
                    orderId={orderId}
                    uploadContext="internal_note"
                    onUploadComplete={() => {
                      toast.success(t('team_communication.internal_attachment_added', 'Internal file attached successfully'));
                    }}
                    className="text-xs border-amber-300"
                  />
                  <Button variant="outline" size="sm" className="text-xs border-amber-300">
                    <AtSign className="h-3 w-3 mr-1" />
                    {t('team_communication.mention_team', 'Mention Team')}
                  </Button>
                </div>
              </div>

              {/* Internal Notes List */}
              {error && (
                <div className="text-center py-4 text-red-600">
                  <p className="text-xs">{error}</p>
                </div>
              )}

              {commentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('team_communication.loading_notes', 'Loading internal notes...')}
                  </p>
                </div>
              ) : (
                renderMessageList(internalNotes, 'internal')
              )}

              {/* Internal Notes Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-amber-200">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>{t('team_communication.internal_count', '{{count}} internal notes', { count: internalNotesCount })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>{t('team_communication.confidential', 'Confidential')}</span>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Access Denied Message for Internal Notes (if user can't access) */}
        {!canAccessInternal && activeTab === 'internal' && (
          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-medium mb-1">{t('team_communication.access_denied', 'Access Denied')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('team_communication.detail_access_required', 'Detail team access required')}
            </p>
            <Badge variant="secondary" className="mt-2">
              <Shield className="h-3 w-3 mr-1" />
              {t('team_communication.restricted_access', 'Restricted Access')}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}