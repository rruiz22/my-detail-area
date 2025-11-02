// =====================================================
// INVOICE COMMENTS
// Created: 2025-11-03
// Description: Comments system for invoices
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useInvoiceComments,
  useAddInvoiceComment,
  useUpdateInvoiceComment,
  useDeleteInvoiceComment,
} from '@/hooks/useInvoiceComments';
import { useAuth } from '@/contexts/AuthContext';
import { Edit2, Lock, MessageSquare, Save, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import React, { useState } from 'react';

interface InvoiceCommentsProps {
  invoiceId: string;
  dealershipId: number;
}

export const InvoiceComments: React.FC<InvoiceCommentsProps> = ({ invoiceId, dealershipId }) => {
  const { user } = useAuth();
  const { data: comments, isLoading } = useInvoiceComments(invoiceId);
  const addComment = useAddInvoiceComment();
  const updateComment = useUpdateInvoiceComment();
  const deleteComment = useDeleteInvoiceComment();

  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    await addComment.mutateAsync({
      invoice_id: invoiceId,
      dealership_id: dealershipId,
      comment: newComment.trim(),
      is_internal: isInternal,
    });

    setNewComment('');
    setIsInternal(true);
  };

  const handleUpdateComment = async (id: string) => {
    if (!editingText.trim()) return;

    await updateComment.mutateAsync({
      id,
      comment: editingText.trim(),
      invoice_id: invoiceId,
    });

    setEditingId(null);
    setEditingText('');
  };

  const handleDeleteComment = async () => {
    if (!deletingId) return;

    await deleteComment.mutateAsync({
      id: deletingId,
      invoice_id: invoiceId,
    });

    setDeletingId(null);
  };

  const getUserName = (comment: any) => {
    if (!comment?.user) return 'Unknown User';
    const { first_name, last_name } = comment.user;
    return first_name && last_name ? `${first_name} ${last_name}` : comment.user.email;
  };

  const isOwnComment = (comment: any) => {
    return comment.user_id === user?.id;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Notes
          <Badge variant="secondary" className="ml-2">
            {comments?.length || 0} {comments?.length === 1 ? 'comment' : 'comments'}
          </Badge>
        </CardTitle>
        <CardDescription>Add internal notes or customer-visible comments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Comment */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Add Comment</Label>
            <div className="flex items-center gap-2">
              <Lock className={`h-4 w-4 ${isInternal ? 'text-orange-600' : 'text-gray-400'}`} />
              <Label htmlFor="is-internal" className="text-sm font-medium cursor-pointer">
                Internal Note
              </Label>
              <Switch
                id="is-internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
            </div>
          </div>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={isInternal ? "Add an internal note (only visible to your team)..." : "Add a comment (visible to customers)..."}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {addComment.isPending ? 'Adding...' : 'Add Comment'}
            </Button>
            {newComment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewComment('');
                  setIsInternal(true);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Comments List */}
        {!comments || comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Add the first comment above</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto pr-2">
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${comment.is_internal ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}
                    ${isOwnComment(comment) ? 'ring-2 ring-primary/20' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`
                        p-2 rounded-lg shadow-sm
                        ${comment.is_internal ? 'bg-orange-100' : 'bg-blue-100'}
                      `}>
                        {comment.is_internal ? (
                          <Lock className="h-4 w-4 text-orange-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{getUserName(comment)}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(comment.created_at), 'MMM dd, yyyy \'at\' h:mm a')}
                          </p>
                          {comment.is_edited && (
                            <Badge variant="outline" className="text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={comment.is_internal ? 'secondary' : 'default'}
                        className={`text-xs ${comment.is_internal ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}
                      >
                        {comment.is_internal ? 'Internal' : 'Public'}
                      </Badge>
                      {isOwnComment(comment) && editingId !== comment.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditingText(comment.comment);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeletingId(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Comment Text */}
                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={!editingText.trim() || updateComment.isPending}
                        >
                          <Save className="h-3 w-3 mr-2" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText('');
                          }}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-12">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteComment.isPending}
            >
              {deleteComment.isPending ? 'Deleting...' : 'Delete Comment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
