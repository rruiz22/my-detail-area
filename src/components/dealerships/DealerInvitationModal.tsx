import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, UserPlus, Send, Building2 } from 'lucide-react';

interface DealerInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealerId?: number | null; // Optional now
  onInvitationSent?: () => void;
}

const DEALER_ROLES = [
  {
    value: 'viewer',
    key: 'viewer',
    description: 'Read-only access to basic modules'
  },
  {
    value: 'dealer_user',
    key: 'dealer_user',
    description: 'Standard user access to dealership modules'
  },
  {
    value: 'dealer_manager',
    key: 'dealer_manager',
    description: 'Manager access with extended permissions'
  },
  {
    value: 'dealer_admin',
    key: 'dealer_admin',
    description: 'Full administrative access to dealership'
  },
];

export const DealerInvitationModal: React.FC<DealerInvitationModalProps> = ({
  isOpen,
  onClose,
  dealerId,
  onInvitationSent,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { dealerships, loading: dealershipsLoading } = useAccessibleDealerships();
  
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(dealerId || null);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens/closes or dealerId prop changes
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [INVITE MODAL] Opening modal with:', {
        providedDealerId: dealerId,
        dealershipsCount: dealerships.length,
        dealershipsLoading,
        dealershipsNames: dealerships.map(d => d.name)
      });
      setEmail('');
      setSelectedRole('');
      setSelectedDealerId(dealerId || null);
    }
  }, [isOpen, dealerId, dealerships, dealershipsLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !selectedRole || !selectedDealerId) {
      toast({
        title: t('common.error'),
        description: t('messages.required_field'),
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: t('common.error'),
        description: t('invitations.accept.auth_required_desc'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create dealer invitation using RPC function
      const { data: invitationResponse, error } = await supabase
        .rpc('create_dealer_invitation', {
          p_dealer_id: selectedDealerId,
          p_email: email,
          p_role_name: selectedRole,
        });

      if (error) throw error;

      console.log('🎯 [INVITE RPC] Response from create_dealer_invitation:', invitationResponse);

      // Parse the JSON response from the RPC function
      const invitationData = invitationResponse;

      // Get dealership and inviter information for email
      const { data: dealershipData } = await supabase
        .from('dealerships')
        .select('name')
        .eq('id', selectedDealerId)
        .single();

      const dealershipName = dealershipData?.name || 'Dealership';
      const roleName = DEALER_ROLES.find(role => role.value === selectedRole)?.key || selectedRole;

      // Prepare email data
      const emailData = {
        invitationId: invitationData.id,
        to: email,
        dealershipName,
        roleName: t(`roles.${roleName}`, roleName),
        inviterName: user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email?.split('@')[0] || 'Team Member',
        inviterEmail: user?.email || '',
        invitationToken: invitationData.token,
        expiresAt: invitationData.expires_at
      };

      console.log('📧 [INVITE EMAIL] Sending invitation data:', {
        ...emailData,
        invitationId: emailData.invitationId,
        to: emailData.to,
        dealershipName: emailData.dealershipName,
        roleName: emailData.roleName,
        inviterName: emailData.inviterName,
        inviterEmail: emailData.inviterEmail,
        hasToken: !!emailData.invitationToken,
        expiresAt: emailData.expiresAt
      });

      // Send invitation email via DEBUG Edge Function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invitation-email-debug', {
        body: emailData
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Still show success for invitation creation, but warn about email
        toast({
          title: t('common.success'),
          description: t('invitations.invitation_created_email_failed'),
          variant: 'default',
        });
      } else {
        toast({
          title: t('common.success'),
          description: t('invitations.invitation_sent'),
        });
      }

      // Reset form
      setEmail('');
      setSelectedRole('');
      setSelectedDealerId(dealerId || null);
      onInvitationSent?.();
      onClose();
    } catch (error: Error | unknown) {
      console.error('Error sending invitation:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('messages.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setSelectedRole('');
      setSelectedDealerId(dealerId || null);
      onClose();
    }
  };

  const getDealershipName = () => {
    if (!selectedDealerId) return 'No dealership selected';
    const dealership = dealerships.find(d => d.id === selectedDealerId);
    return dealership?.name || `Dealership #${selectedDealerId}`;
  };

  const selectedRoleInfo = DEALER_ROLES.find(role => role.value === selectedRole);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('invitations.send_invitation')}
          </DialogTitle>
          <DialogDescription>
            {selectedDealerId 
              ? t('invitations.invite_user_to', { dealership: getDealershipName() })
              : 'Invite a user to join a dealership'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dealership Selection */}
          {dealerId ? (
            <div className="space-y-2">
              <Label>{t('dealerships.dealership')} *</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getDealershipName()}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="dealership">{t('dealerships.select_dealership')} *</Label>
              <Select 
                value={selectedDealerId?.toString() || ''} 
                onValueChange={(value) => setSelectedDealerId(parseInt(value))}
                disabled={loading || dealershipsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dealerships.select_dealership')} />
                </SelectTrigger>
                <SelectContent>
                  {dealerships.map((dealership) => (
                    <SelectItem key={dealership.id} value={dealership.id.toString()}>
                      {dealership.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('invitations.email')} *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={t('invitations.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El usuario recibirá un enlace de invitación en este email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('invitations.role')} *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={t('invitations.select_role')} />
              </SelectTrigger>
              <SelectContent>
                {DEALER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t(`invitations.${role.key}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {role.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoleInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{t(`invitations.${selectedRoleInfo.key}`)}:</strong> {selectedRoleInfo.description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !email || !selectedRole || !selectedDealerId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('invitations.sending')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('invitations.send')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};