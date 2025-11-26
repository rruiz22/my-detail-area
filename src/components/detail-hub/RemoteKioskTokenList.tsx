/**
 * RemoteKioskTokenList Component
 *
 * Displays remote kiosk tokens in a table with:
 * - Status filtering tabs (All, Active, Expired, Revoked, Used)
 * - Search by employee name/number
 * - Checkbox selection for batch operations
 * - Row actions (View Details, Copy URL, Revoke, Delete)
 * - Batch actions toolbar
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search,
  Copy,
  Eye,
  XCircle,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  useRemoteKioskTokens,
  useRevokeToken,
  useDeleteToken,
  useBatchRevokeTokens,
  useBatchDeleteTokens,
  type TokenStatus,
  type RemoteKioskToken
} from '@/hooks/useRemoteKioskTokens';

interface RemoteKioskTokenListProps {
  onViewDetails?: (token: RemoteKioskToken) => void;
}

export function RemoteKioskTokenList({ onViewDetails }: RemoteKioskTokenListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [selectedStatus, setSelectedStatus] = useState<TokenStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  // Confirm dialogs
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchRevokeDialogOpen, setBatchRevokeDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<RemoteKioskToken | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<RemoteKioskToken | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Queries and mutations
  const { data: tokens = [], isLoading, refetch } = useRemoteKioskTokens({
    status: selectedStatus,
    search: searchQuery
  });
  const { mutate: revokeToken, isPending: isRevoking } = useRevokeToken();
  const { mutate: deleteToken, isPending: isDeleting } = useDeleteToken();
  const { mutate: batchRevoke, isPending: isBatchRevoking } = useBatchRevokeTokens();
  const { mutate: batchDelete, isPending: isBatchDeleting } = useBatchDeleteTokens();

  // Filtered tokens (already filtered by hook, this is for UI display)
  const filteredTokens = useMemo(() => tokens, [tokens]);

  // Selection handlers
  const toggleSelection = (tokenId: string) => {
    setSelectedTokens(prev =>
      prev.includes(tokenId)
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTokens.length === filteredTokens.length) {
      setSelectedTokens([]);
    } else {
      setSelectedTokens(filteredTokens.map(t => t.id));
    }
  };

  const clearSelection = () => setSelectedTokens([]);

  // Copy URL to clipboard
  const handleCopyUrl = async (token: RemoteKioskToken) => {
    try {
      await navigator.clipboard.writeText(token.full_url);
      toast({
        title: t('remote_kiosk_management.messages.url_copied'),
        description: t('remote_kiosk_management.messages.url_copied_success')
      });
    } catch (error) {
      toast({
        title: t('remote_kiosk_management.messages.copy_failed'),
        description: t('remote_kiosk_management.messages.copy_failed_message'),
        variant: 'destructive'
      });
    }
  };

  // Revoke handlers
  const handleRevokeClick = (token: RemoteKioskToken) => {
    setTokenToRevoke(token);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = () => {
    if (!tokenToRevoke) return;

    revokeToken(
      { tokenId: tokenToRevoke.id, reason: revokeReason },
      {
        onSuccess: () => {
          setRevokeDialogOpen(false);
          setTokenToRevoke(null);
          setRevokeReason('');
          refetch();
        }
      }
    );
  };

  // Delete handlers
  const handleDeleteClick = (token: RemoteKioskToken) => {
    setTokenToDelete(token);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!tokenToDelete) return;

    deleteToken(tokenToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setTokenToDelete(null);
        refetch();
      }
    });
  };

  // Batch handlers
  const handleBatchRevokeConfirm = () => {
    batchRevoke(
      { tokenIds: selectedTokens, reason: revokeReason },
      {
        onSuccess: () => {
          setBatchRevokeDialogOpen(false);
          clearSelection();
          setRevokeReason('');
          refetch();
        }
      }
    );
  };

  const handleBatchDeleteConfirm = () => {
    batchDelete(selectedTokens, {
      onSuccess: () => {
        setBatchDeleteDialogOpen(false);
        clearSelection();
        refetch();
      }
    });
  };

  // Status badge helper
  const getStatusBadge = (token: RemoteKioskToken) => {
    switch (token.status) {
      case 'active':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('remote_kiosk_management.status.active')}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            {t('remote_kiosk_management.status.expired')}
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {t('remote_kiosk_management.status.revoked')}
          </Badge>
        );
      case 'used':
        return (
          <Badge variant="outline">
            {t('remote_kiosk_management.status.used')}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format expiration
  const formatExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);

    if (expiration < now) {
      return <span className="text-red-600">{t('remote_kiosk_management.expires_in.expired')}</span>;
    }

    return (
      <span className="text-gray-600">
        {formatDistanceToNow(expiration, { addSuffix: true })}
      </span>
    );
  };

  return (
    <>
      <Card className="card-enhanced">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t('remote_kiosk_management.title')}
            </CardTitle>
            {selectedTokens.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {t('remote_kiosk_management.table.selected_count', { count: selectedTokens.length })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchRevokeDialogOpen(true)}
                  disabled={isBatchRevoking}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t('remote_kiosk_management.actions.batch_revoke')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBatchDeleteDialogOpen(true)}
                  disabled={isBatchDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('remote_kiosk_management.actions.batch_delete')}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('remote_kiosk_management.filters.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as TokenStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">{t('remote_kiosk_management.status.all')}</TabsTrigger>
              <TabsTrigger value="active">{t('remote_kiosk_management.status.active')}</TabsTrigger>
              <TabsTrigger value="expired">{t('remote_kiosk_management.status.expired')}</TabsTrigger>
              <TabsTrigger value="revoked">{t('remote_kiosk_management.status.revoked')}</TabsTrigger>
              <TabsTrigger value="used">{t('remote_kiosk_management.status.used')}</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">{t('remote_kiosk_management.table.no_tokens')}</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedTokens.length === filteredTokens.length && filteredTokens.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead>{t('remote_kiosk_management.table.employee')}</TableHead>
                        <TableHead>{t('remote_kiosk_management.table.created_by')}</TableHead>
                        <TableHead>{t('remote_kiosk_management.status.active')}</TableHead>
                        <TableHead>{t('remote_kiosk_management.table.expires')}</TableHead>
                        <TableHead>{t('remote_kiosk_management.table.uses')}</TableHead>
                        <TableHead>{t('remote_kiosk_management.table.last_used')}</TableHead>
                        <TableHead className="text-right">{t('remote_kiosk_management.table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTokens.map((token) => (
                        <TableRow key={token.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedTokens.includes(token.id)}
                              onChange={() => toggleSelection(token.id)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {token.employee?.fallback_photo_url ? (
                                  <AvatarImage src={token.employee.fallback_photo_url} />
                                ) : (
                                  <AvatarFallback>
                                    <User className="h-4 w-4" />
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {token.employee?.first_name} {token.employee?.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  #{token.employee?.employee_number}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {token.creator?.first_name} {token.creator?.last_name}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(token)}</TableCell>
                          <TableCell>{formatExpiration(token.expires_at)}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {token.current_uses} / {token.max_uses}
                            </span>
                          </TableCell>
                          <TableCell>
                            {token.last_used_at ? (
                              <span className="text-sm text-gray-600">
                                {formatDistanceToNow(new Date(token.last_used_at), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onViewDetails && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewDetails(token)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyUrl(token)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {token.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeClick(token)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(token)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Revoke Token Dialog */}
      <ConfirmDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        title={t('remote_kiosk_management.confirm.revoke_title')}
        description={t('remote_kiosk_management.confirm.revoke_message')}
        confirmText={t('remote_kiosk_management.confirm.revoke_button')}
        onConfirm={handleRevokeConfirm}
        loading={isRevoking}
        variant="destructive"
      >
        <div className="space-y-2 mt-4">
          <Label>{t('remote_kiosk_management.confirm.revoke_reason_label')}</Label>
          <Textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder={t('remote_kiosk_management.confirm.revoke_reason_placeholder')}
            rows={3}
          />
        </div>
      </ConfirmDialog>

      {/* Delete Token Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('remote_kiosk_management.confirm.delete_title')}
        description={t('remote_kiosk_management.confirm.delete_message')}
        confirmText={t('remote_kiosk_management.confirm.delete_button')}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Batch Revoke Dialog */}
      <ConfirmDialog
        open={batchRevokeDialogOpen}
        onOpenChange={setBatchRevokeDialogOpen}
        title={t('remote_kiosk_management.confirm.batch_revoke_title', { count: selectedTokens.length })}
        description={t('remote_kiosk_management.confirm.batch_revoke_message')}
        confirmText={t('remote_kiosk_management.confirm.batch_revoke_button')}
        onConfirm={handleBatchRevokeConfirm}
        loading={isBatchRevoking}
        variant="destructive"
      >
        <div className="space-y-2 mt-4">
          <Label>{t('remote_kiosk_management.confirm.revoke_reason_label')}</Label>
          <Textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder={t('remote_kiosk_management.confirm.revoke_reason_placeholder')}
            rows={3}
          />
        </div>
      </ConfirmDialog>

      {/* Batch Delete Dialog */}
      <ConfirmDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        title={t('remote_kiosk_management.confirm.batch_delete_title', { count: selectedTokens.length })}
        description={t('remote_kiosk_management.confirm.batch_delete_message')}
        confirmText={t('remote_kiosk_management.confirm.batch_delete_button')}
        onConfirm={handleBatchDeleteConfirm}
        loading={isBatchDeleting}
        variant="destructive"
      />
    </>
  );
}
