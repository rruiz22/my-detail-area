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
  dealer?: {
    name: string;
  };
  inviter?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

type InvitationStatus = 'all' | 'pending' | 'accepted' | 'expired';

export const InvitationManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // State management
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<InvitationStatus>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedDealership, setSelectedDealership] = useState<number | null>(null);

  // Data fetching
  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
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
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
    } catch (error: unknown) {
      console.error('Error fetching invitations:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Error loading invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  // Filter invitations by status
  const getFilteredInvitations = () => {
    const now = new Date();
    
    return invitations.filter(invitation => {
      const isExpired = isAfter(now, new Date(invitation.expires_at));
      const isAccepted = !!invitation.accepted_at;
      
      switch (selectedStatus) {
        case 'pending':
          return !isAccepted && !isExpired;
        case 'accepted':
          return isAccepted;
        case 'expired':
          return isExpired && !isAccepted;
        default:
          return true;
      }
    });
  };

  // Get invitation status
  const getInvitationStatus = (invitation: Invitation) => {
    const now = new Date();
    const isExpired = isAfter(now, new Date(invitation.expires_at));
    
    if (invitation.accepted_at) return 'accepted';
    if (isExpired) return 'expired';
    return 'pending';
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  // Resend invitation
  const handleResendInvitation = useCallback(async (invitation: Invitation) => {
    try {
      // Extend the expiration date
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);

      const { error: updateError } = await supabase
        .from('dealer_invitations')
        .update({
          expires_at: newExpirationDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Get current user for inviter information
      const { data: { user } } = await supabase.auth.getUser();

      // Send invitation email via Edge Function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitationId: invitation.id,
          to: invitation.email,
          dealershipName: invitation.dealer?.name || 'Dealership',
          roleName: invitation.role_name,
          inviterName: user?.user_metadata?.first_name && user?.user_metadata?.last_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
            : user?.email?.split('@')[0] || 'Team Member',
          inviterEmail: user?.email || '',
          invitationToken: invitation.invitation_token,
          expiresAt: newExpirationDate.toISOString()
        }
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

  // Cancel invitation
  const handleCancelInvitation = useCallback(async (invitation: Invitation) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const { error } = await supabase
        .from('dealer_invitations')
        .update({
          expires_at: new Date().toISOString(), // Set to now to expire it
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Invitation cancelled successfully',
      });

      fetchInvitations();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Error cancelling invitation',
        variant: 'destructive',
      });
    }
  }, [t, toast, fetchInvitations]);

  // Get invitation stats
  const getInvitationStats = () => {
    const now = new Date();
    const total = invitations.length;
    const pending = invitations.filter(inv => 
      !inv.accepted_at && !isAfter(now, new Date(inv.expires_at))
    ).length;
    const accepted = invitations.filter(inv => !!inv.accepted_at).length;
    const expired = invitations.filter(inv => 
      !inv.accepted_at && isAfter(now, new Date(inv.expires_at))
    ).length;

    return { total, pending, accepted, expired };
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
    <PermissionGuard module="users" permission="write">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Invitation Management</h2>
            <p className="text-muted-foreground">
              Manage user invitations and track their status
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Templates
            </Button>
            <Button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Invitation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expired</p>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invitee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Dealership</TableHead>
                      <TableHead>Inviter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Mail className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No invitations found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvitations.map((invitation) => {
                        const status = getInvitationStatus(invitation);
                        
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {invitation.email.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{invitation.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{invitation.role_name}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{invitation.dealer?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {invitation.inviter?.first_name || invitation.inviter?.email || 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(status)} className="flex items-center gap-1 w-fit">
                                {getStatusIcon(status)}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Badge>
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
                                {status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvitation(invitation)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                                {(status === 'expired' || status === 'pending') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvitation(invitation)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                {status !== 'accepted' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelInvitation(invitation)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
          dealerId={selectedDealership || 1}
          onInvitationSent={() => {
            fetchInvitations();
            setIsInviteModalOpen(false);
          }}
        />

        <InvitationTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      </div>
    </PermissionGuard>
  );
};