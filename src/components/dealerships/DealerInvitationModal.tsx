import React, { useState, useEffect, useCallback } from 'react';
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

interface CustomRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
}

// LEGACY: Hardcoded roles - Replaced with dealer_custom_roles system
// Roles are now loaded dynamically from dealer_custom_roles table per dealership
// Each dealership creates their own custom roles via the Roles tab
// const DEALER_ROLES = [
//   { value: 'dealer_user', key: 'dealer_user', description: 'Standard user access to dealership modules' },
//   { value: 'dealer_salesperson', key: 'dealer_salesperson', description: 'Sales representative with order management access' },
//   { value: 'dealer_service_advisor', key: 'dealer_service_advisor', description: 'Service advisor with service order access' },
//   { value: 'dealer_sales_manager', key: 'dealer_sales_manager', description: 'Sales manager with sales team oversight' },
//   { value: 'dealer_service_manager', key: 'dealer_service_manager', description: 'Service manager with service team oversight' },
//   { value: 'dealer_manager', key: 'dealer_manager', description: 'General manager with extended permissions' },
//   { value: 'dealer_admin', key: 'dealer_admin', description: 'Full administrative access to dealership' },
// ];

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
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

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

  // Fetch custom roles for the selected dealership
  const fetchCustomRoles = useCallback(async () => {
    if (!selectedDealerId) {
      setCustomRoles([]);
      return;
    }

    try {
      setLoadingRoles(true);
      console.log('🔍 [CUSTOM ROLES] Fetching for dealer:', selectedDealerId);

      const { data, error } = await supabase
        .from('dealer_custom_roles')
        .select('id, role_name, display_name, description')
        .eq('dealer_id', selectedDealerId)
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      console.log('✅ [CUSTOM ROLES] Loaded:', data?.length || 0, 'roles');
      setCustomRoles(data || []);
    } catch (error) {
      console.error('❌ [CUSTOM ROLES] Error:', error);
      setCustomRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedDealerId]);

  // Load custom roles when modal opens or dealer changes
  useEffect(() => {
    if (isOpen && selectedDealerId) {
      fetchCustomRoles();
    }
  }, [isOpen, selectedDealerId, fetchCustomRoles]);

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
      console.log('🎯 [INVITE RPC] Response type:', typeof invitationResponse);

      // ✅ FIX: Parse the JSON response from the RPC function
      // The RPC returns a JSON object as a string, so we need to parse it
      // If it's already an object (Supabase may auto-parse), use it directly
      const invitationData = typeof invitationResponse === 'string'
        ? JSON.parse(invitationResponse)
        : invitationResponse;

      console.log('📋 [INVITE DATA] Parsed invitation data:', {
        id: invitationData.id,
        token: invitationData.token,
        email: invitationData.email,
        role_name: invitationData.role_name,
        expires_at: invitationData.expires_at,
        hasId: !!invitationData.id,
        hasToken: !!invitationData.token,
        tokenLength: invitationData.token?.length
      });

      // Get dealership and inviter information for email
      const { data: dealershipData } = await supabase
        .from('dealerships')
        .select('name')
        .eq('id', selectedDealerId)
        .single();

      const dealershipName = dealershipData?.name || 'Dealership';

      // Get role display name from custom roles
      const selectedRoleData = customRoles.find(role => role.role_name === selectedRole);
      const roleDisplayName = selectedRoleData?.display_name || selectedRole;

      // Prepare email data
      const emailData = {
        invitationId: invitationData.id,
        to: email,
        dealershipName,
        roleName: roleDisplayName,
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

      // Send invitation email via Edge Function
      console.log('📤 [EMAIL] Invoking send-invitation-email function...');
      const { data: emailResult, error: emailError} = await supabase.functions.invoke('send-invitation-email', {
        body: emailData
      });

      console.log('📬 [EMAIL] Edge function response:', {
        hasError: !!emailError,
        errorMessage: emailError?.message,
        emailResultSuccess: emailResult?.success,
        emailId: emailResult?.emailId
      });

      if (emailError) {
        console.error('❌ [EMAIL] Error sending invitation email:', emailError);
        // Still show success for invitation creation, but warn about email
        toast({
          title: t('invitations.invitation_created'),
          description: t('invitations.invitation_created_email_failed') + ': ' + (emailError.message || 'Unknown error'),
          variant: 'default',
        });
      } else if (!emailResult?.success) {
        console.error('❌ [EMAIL] Email function returned non-success:', emailResult);
        toast({
          title: t('invitations.invitation_created'),
          description: t('invitations.invitation_created_email_failed') + ': ' + (emailResult?.error || 'Unknown error'),
          variant: 'default',
        });
      } else {
        console.log('✅ [EMAIL] Invitation email sent successfully!');
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

  // Find selected role info from custom roles instead of hardcoded DEALER_ROLES
  const selectedRoleInfo = customRoles.find(role => role.role_name === selectedRole);

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
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
              disabled={loading || loadingRoles || !selectedDealerId}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingRoles
                    ? t('common.loading')
                    : customRoles.length === 0
                      ? 'No custom roles available'
                      : t('invitations.select_role')
                } />
              </SelectTrigger>
              <SelectContent>
                {loadingRoles ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </div>
                ) : customRoles.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No custom roles created yet. Create roles first in Roles tab.
                  </div>
                ) : (
                  customRoles.map((role) => (
                    <SelectItem key={role.id} value={role.role_name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.display_name}</span>
                        {role.description && (
                          <span className="text-xs text-muted-foreground">
                            {role.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedRoleInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedRoleInfo.display_name}:</strong>{' '}
                  {selectedRoleInfo.description || 'No description'}
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