import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Trash2,
  RotateCcw,
  Calendar,
  User,
  Building2,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format, isAfter } from 'date-fns';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { InvitationTemplateModal } from './InvitationTemplateModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatRoleName } from '@/utils/roleUtils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Invitation {
  id: string;
  email: string;
  role_name: string;
  dealer_id: number;
  inviter_id: string;
  invitation_token: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  updated_at: string;
  dealerships?: {
    name: string;
  };
  profiles?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

type InvitationStatus = 'all' | 'pending' | 'accepted' | 'expired' | 'cancelled';

interface InvitationManagementProps {
  dealerId?: number; // Optional: filter invitations by dealer_id
}

export const InvitationManagement: React.FC<InvitationManagementProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  // State management
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<InvitationStatus>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedDealership, setSelectedDealership] = useState<number | null>(null);

  // ✅ PHASE 3: ConfirmDialog states (Team Chat style)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<Invitation | null>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);

  // Data fetching
  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);

      console.log('📥 [INVITATIONS] Starting fetch...', {
        dealerId,
        scope: dealerId ? 'dealer-specific' : 'global'
      });

      // Query with JOINs to get dealership and inviter info
      let query = supabase
        .from('dealer_invitations')
        .select(`
          *,
          dealerships!inner (
            name
          ),
          profiles!dealer_invitations_inviter_id_fkey (
            email,
            first_name,
            last_name
          )
        `);

      // Filter by dealer_id if provided (dealer-specific view)
      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('🧪 [INVITATIONS] Complete query result:', {
        hasError: !!error,
        errorMessage: error?.message,
        dataCount: data?.length || 0,
        sampleData: data?.[0], // Show first record structure
        fullSampleData: JSON.stringify(data?.[0], null, 2) // Full structure for debugging
      });

      console.log('📊 [INVITATIONS] Query result:', {
        hasError: !!error,
        errorMessage: error?.message,
        dataCount: data?.length || 0,
        data: data?.slice(0, 2) // Show first 2 for debugging
      });

      if (error) {
        console.error('❌ [INVITATIONS] Database error:', error);
        throw error;
      }

      setInvitations(data || []);

      console.log('✅ [INVITATIONS] Fetch completed:', {
        totalInvitations: data?.length || 0,
        stateUpdated: true
      });

    } catch (error: unknown) {
      console.error('💥 [INVITATIONS] Error fetching invitations:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Error loading invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast, dealerId]);

  // Filter invitations by status
  const getFilteredInvitations = () => {
    return invitations.filter(invitation => {
      const status = getInvitationStatus(invitation);

      switch (selectedStatus) {
        case 'pending':
          return status === 'pending';
        case 'accepted':
          return status === 'accepted';
        case 'expired':
          return status === 'expired';
        case 'cancelled':
          return status === 'cancelled';
        default:
          return true;
      }
    });
  };

  // Get invitation status with enhanced logic
  const getInvitationStatus = (invitation: Invitation): InvitationStatus => {
    const now = new Date();
    const isExpired = isAfter(now, new Date(invitation.expires_at));

    if (invitation.accepted_at) return 'accepted';
    if (isExpired) return 'expired';
    return 'pending';
  };

  // Get status badge color classes (soft colors)
  const getStatusBadgeClasses = (status: string): string => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 hover:bg-green-200 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200';
      case 'expired':
        return 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200';
      case 'pending':
        return 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200';
    }
  };

  // Get role badge color classes (soft colors, unique per role)
  const getRoleBadgeClasses = (roleName: string): string => {
    const lowerRoleName = roleName.toLowerCase();

    // Admin roles - Red
    if (lowerRoleName.includes('admin')) {
      return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200';
    }

    // Manager roles - Purple
    if (lowerRoleName.includes('manager')) {
      return 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200';
    }

    // Service roles - Blue
    if (lowerRoleName.includes('service') || lowerRoleName.includes('advisor')) {
      return 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200';
    }

    // Sales roles - Emerald
    if (lowerRoleName.includes('sales') || lowerRoleName.includes('salesperson')) {
      return 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200';
    }

    // Technician roles - Orange
    if (lowerRoleName.includes('technician') || lowerRoleName.includes('tech')) {
      return 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200';
    }

    // Lot/Detail roles - Cyan
    if (lowerRoleName.includes('lot') || lowerRoleName.includes('detail')) {
      return 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-200';
    }

    // Car Wash roles - Teal
    if (lowerRoleName.includes('wash') || lowerRoleName.includes('carwash')) {
      return 'bg-teal-100 hover:bg-teal-200 text-teal-700 border-teal-200';
    }

    // Default - Indigo
    return 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200';
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'expired':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  // Resend invitation
  const handleResendInvitation = useCallback(async (invitation: Invitation) => {
    try {
      console.log('🔄 [RESEND INVITATION] Starting resend process for:', {
        invitationId: invitation.id,
        email: invitation.email,
        dealership: invitation.dealerships?.name,
        role: invitation.role_name
      });

      // Extend the expiration date
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);

      console.log('📅 [RESEND INVITATION] Extending expiration to:', newExpirationDate.toISOString());

      const { error: updateError } = await supabase
        .from('dealer_invitations')
        .update({
          expires_at: newExpirationDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('❌ [RESEND INVITATION] Database update error:', updateError);
        throw updateError;
      }

      console.log('✅ [RESEND INVITATION] Database updated successfully');

      // Get current user for inviter information
      const { data: { user } } = await supabase.auth.getUser();

      const emailData = {
        invitationId: invitation.id,
        to: invitation.email,
        dealershipName: invitation.dealerships?.name || 'Dealership',
        roleName: invitation.role_name,
        inviterName: user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email?.split('@')[0] || 'Team Member',
        inviterEmail: user?.email || '',
        invitationToken: invitation.invitation_token,
        expiresAt: newExpirationDate.toISOString()
      };

      console.log('📧 [RESEND INVITATION] Sending email data:', {
        ...emailData,
        hasToken: !!emailData.invitationToken,
        hasInvitationId: !!emailData.invitationId
      });

      // Send invitation email via Edge Function (same as creation)
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: emailData
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast({
          title: t('common.success'),
          description: t('invitations.invitation_updated_email_failed'),
          variant: 'default',
        });
      } else {
        toast({
          title: t('common.success'),
          description: t('invitations.invitation_resent'),
        });
      }

      fetchInvitations();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('invitations.error_resending'),
        variant: 'destructive',
      });
    }
  }, [t, toast, fetchInvitations]);

  // Cancel invitation (removes the invitation)
  const handleCancelInvitation = useCallback(async (invitation: Invitation) => {
    // ✅ PHASE 3: Removed browser confirm(), now using ConfirmDialog
    try {
      const { error } = await supabase
        .from('dealer_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('invitations.cancelled_successfully'),
      });

      fetchInvitations();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('invitations.error_cancelling'),
        variant: 'destructive',
      });
    }
  }, [t, toast, fetchInvitations]);

  // Delete invitation permanently (hard delete)
  const handleDeleteInvitation = useCallback(async (invitation: Invitation) => {
    // ✅ PHASE 3: Removed browser confirm(), now using ConfirmDialog
    try {
      const { error } = await supabase
        .from('dealer_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('invitations.deleted_successfully'),
      });

      fetchInvitations();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('invitations.error_deleting'),
        variant: 'destructive',
      });
    }
  }, [t, toast, fetchInvitations]);

  // Get invitation stats with enhanced states
  const getInvitationStats = () => {
    const now = new Date();
    const total = invitations.length;
    const pending = invitations.filter(inv => {
      const status = getInvitationStatus(inv);
      return status === 'pending';
    }).length;
    const accepted = invitations.filter(inv => {
      const status = getInvitationStatus(inv);
      return status === 'accepted';
    }).length;
    const cancelled = 0; // Cancelled invitations are deleted from database
    const expired = invitations.filter(inv => {
      const status = getInvitationStatus(inv);
      return status === 'expired';
    }).length;

    return { total, pending, accepted, cancelled, expired };
  };

  const stats = getInvitationStats();
  const filteredInvitations = getFilteredInvitations();

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard module="users" permission="edit">
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t('invitations.title', 'Invitations')}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('invitations.description', 'Manage user invitations and track their status')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Invitations */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('invitations.stats.total')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Mail className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('invitations.stats.pending')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.pending}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="h-7 w-7 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accepted Invitations */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('invitations.stats.accepted')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.accepted}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expired Invitations */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('invitations.stats.expired')}</p>
                  <p className="text-3xl font-bold mt-2">{stats.expired}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <XCircle className="h-7 w-7 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as InvitationStatus)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({stats.expired})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="mt-6">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="font-semibold">{t('invitations.table.invitee')}</TableHead>
                      <TableHead className="font-semibold">{t('invitations.table.role')}</TableHead>
                      <TableHead className="font-semibold">{t('invitations.table.dealership')}</TableHead>
                      <TableHead className="font-semibold">{t('invitations.table.inviter')}</TableHead>
                      <TableHead className="font-semibold">{t('invitations.table.status')}</TableHead>
                      <TableHead className="font-semibold">{t('invitations.table.sent')}</TableHead>
                      <TableHead className="font-semibold">{t('invitations.table.expires')}</TableHead>
                      <TableHead className="text-right font-semibold">{t('invitations.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Mail className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('invitations.table.no_invitations')}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvitations.map((invitation) => {
                        const status = getInvitationStatus(invitation);

                        return (
                          <TableRow key={invitation.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-gray-100">
                                  <AvatarFallback className="text-sm font-semibold">
                                    {invitation.email.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">{invitation.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${getRoleBadgeClasses(invitation.role_name)}`}>
                                {t(`roles.${invitation.role_name}`, formatRoleName(invitation.role_name))}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{invitation.dealerships?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {invitation.profiles?.first_name ?
                                    `${invitation.profiles.first_name} ${invitation.profiles.last_name || ''}`.trim() :
                                    invitation.profiles?.email || 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border w-fit ${getStatusBadgeClasses(status)}`}>
                                {getStatusIcon(status)}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {status === 'expired' ? (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                    Expired
                                  </div>
                                ) : (
                                  format(new Date(invitation.expires_at), 'MMM dd, yyyy')
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                {/* Resend button - show for pending and expired invitations */}
                                {(status === 'pending' || status === 'expired') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvitation(invitation)}
                                    className="h-8 w-8 p-0"
                                    title={t('invitations.resend_invitation')}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Cancel button - only for pending invitations */}
                                {status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setInvitationToCancel(invitation);
                                      setCancelDialogOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                    title={t('invitations.cancel_invitation')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Delete button - for all except accepted */}
                                {status !== 'accepted' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setInvitationToDelete(invitation);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    title={t('invitations.delete_invitation')}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <DealerInvitationModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          dealerId={dealerId || selectedDealership || null}
          onInvitationSent={() => {
            fetchInvitations();
            setIsInviteModalOpen(false);
          }}
        />

        <InvitationTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
        />

        {/* ✅ PHASE 3: ConfirmDialog components (Team Chat style) */}
        <ConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          title={t('invitations.confirm_cancel')}
          description={t('invitations.confirm_cancel_desc')}
          confirmText={t('common.yes')}
          cancelText={t('common.no')}
          onConfirm={() => {
            if (invitationToCancel) {
              handleCancelInvitation(invitationToCancel);
            }
          }}
          variant="destructive"
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t('invitations.confirm_delete')}
          description={t('invitations.confirm_delete_desc')}
          confirmText={t('common.yes')}
          cancelText={t('common.no')}
          onConfirm={() => {
            if (invitationToDelete) {
              handleDeleteInvitation(invitationToDelete);
            }
          }}
          variant="destructive"
        />
      </div>
    </PermissionGuard>
  );
};
