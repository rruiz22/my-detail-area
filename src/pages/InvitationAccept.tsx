import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Mail,
  Shield
} from 'lucide-react';

interface InvitationDetails {
  id: string;
  dealer_id: number;
  email: string;
  role_name: string;
  expires_at: string;
  accepted_at?: string;
  dealership_name?: string;
  inviter_email?: string;
}

export function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthOptions, setShowAuthOptions] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    } else {
      setError(t('invitations.accept.invalid_invitation'));
      setLoading(false);
    }
  }, [token]);

  const fetchInvitationDetails = useCallback(async () => {
    if (!token) {
      console.error('❌ No token provided');
      setError(t('invitations.accept.invalid_invitation'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Searching for invitation with token:', token);

      // Use RPC function to verify invitation token (bypasses RLS)
      const { data: invitationData, error: invitationError } = await supabase
        .rpc('verify_invitation_token', {
          token_input: token
        });

      console.log('📊 Supabase RPC response:', { invitationData, invitationError });

      if (invitationError) {
        console.error('❌ Supabase RPC error:', invitationError);
        throw new Error(t('invitations.accept.database_error'));
      }

      // Handle case where no invitation is found or invalid
      if (!invitationData || !invitationData.valid) {
        console.error('❌ No invitation found for token:', token);
        console.log('💡 This could mean:');
        console.log('  - Token is invalid or malformed');
        console.log('  - Invitation was deleted');
        console.log('  - Token has expired and was cleaned up');
        console.log('  - Database connection issue');

        // Check for specific error from the RPC function
        if (invitationData && invitationData.error) {
          throw new Error(invitationData.message || t('invitations.accept.not_found'));
        }

        throw new Error(t('invitations.accept.not_found'));
      }

      const singleInvitation = invitationData.invitation;

      // Check if invitation is expired
      const expiresAt = new Date(singleInvitation.expires_at);
      const now = new Date();

      if (expiresAt < now) {
        throw new Error(t('invitations.accept.expired'));
      }

      setInvitation({
        id: singleInvitation.id,
        dealer_id: singleInvitation.dealership.id,
        email: singleInvitation.email,
        role_name: singleInvitation.role_name,
        expires_at: singleInvitation.expires_at,
        dealership_name: singleInvitation.dealership.name || t('dealerships.title'),
        inviter_email: singleInvitation.inviter.email || t('users.admin'),
      });
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  const handleAcceptInvitation = async () => {
    if (!user) {
      toast({
        title: t('invitations.accept.auth_required'),
        description: t('invitations.accept.auth_required_desc'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!invitation || !token) {
      toast({
        title: t('common.error'),
        description: t('invitations.accept.invalid_invitation'),
        variant: 'destructive',
      });
      return;
    }

    // Verify email matches
    if (invitation.email !== user.email) {
      toast({
        title: t('invitations.accept.email_not_match'),
        description: t('invitations.accept.email_not_match_desc'),
        variant: 'destructive',
      });
      return;
    }

    // Prevent double submission
    if (accepting) return;

    setAccepting(true);

    try {
      // Wait for authentication session to be established
      let attempts = 0;
      const maxAttempts = 10; // 5 seconds total (500ms * 10)

      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Session is ready, now we can accept the invitation
          const { error } = await supabase
            .rpc('accept_dealer_invitation', {
              token_input: token,
            });

          if (error) {
            console.error('Supabase RPC error:', error);
            throw new Error(error.message || 'Error accepting invitation');
          }

          toast({
            title: t('common.success'),
            description: t('invitations.accept.success_message', { dealership: invitation.dealership_name }),
          });

          // Small delay to ensure toast is visible before navigation
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);

          return; // Success - exit function
        }

        // Wait 500ms before next attempt
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      // If we got here, session never became available
      toast({
        title: t('auth.signup.account_created'),
        description: t('auth.signup.invitation_accept_error') + ' - ' + t('auth.signup.check_email_to_continue'),
        variant: 'destructive',
      });
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: t('common.error'),
        description: err.message || t('messages.error'),
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    const roleMap: Record<string, string> = {
      system_admin: t('roles.system_admin'),
      dealer_admin: t('roles.dealer_admin'),
      dealer_manager: t('roles.dealer_manager'),
      dealer_salesperson: t('roles.dealer_salesperson'),
      dealer_service_advisor: t('roles.dealer_service_advisor'),
      dealer_sales_manager: t('roles.dealer_sales_manager'),
      dealer_service_manager: t('roles.dealer_service_manager'),
      dealer_user: t('roles.dealer_user'),
      detail_super_manager: t('roles.detail_super_manager'),
      detail_admin: t('roles.detail_admin'),
    };
    return roleMap[roleName] || roleName;
  };

  const getTimeUntilExpiration = () => {
    if (!invitation) return '';

    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    const diffInHours = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return t('invitations.accept.expires_in_hours', { hours: diffInHours });
    }
    return t('invitations.accept.expires_in_days', { days: Math.ceil(diffInHours / 24) });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>{t('invitations.accept.verifying')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>{t('invitations.accept.invalid_title')}</CardTitle>
            <CardDescription>
              {error || t('invitations.accept.not_found_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              {t('invitations.accept.go_to_start')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>{t('invitations.accept.already_accepted_title')}</CardTitle>
            <CardDescription>
              {t('invitations.accept.already_accepted_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/dashboard')}
            >
              {t('invitations.accept.go_to_dashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>{t('invitations.accept.title')}</CardTitle>
          <CardDescription>
            {t('invitations.accept.subtitle')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitation.dealership_name}</p>
                <p className="text-sm text-muted-foreground">{t('invitations.accept.dealership_label')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{getRoleDisplayName(invitation.role_name)}</p>
                <p className="text-sm text-muted-foreground">{t('invitations.accept.role_label')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitation.email}</p>
                <p className="text-sm text-muted-foreground">
                  {t('invitations.accept.invited_by', { email: invitation.inviter_email })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-300">
                  {t('invitations.accept.expires_prefix')} {getTimeUntilExpiration()}
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  {t('invitations.accept.expiration_warning')}
                </p>
              </div>
            </div>
          </div>

          {/* User Authentication Check */}
          {!user ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center mb-3">
                  {t('invitations.accept.auth_instructions')}
                </p>
                <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <p>• {t('invitations.accept.step_1')} <strong>{invitation.email}</strong></p>
                  <p>• {t('invitations.accept.step_2')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="w-full"
                  onClick={() => navigate(`/auth?email=${encodeURIComponent(invitation.email)}&mode=signup&invitation=${token}`)}
                >
                  {t('invitations.accept.create_account')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/auth?email=${encodeURIComponent(invitation.email)}&mode=signin&invitation=${token}`)}
                >
                  {t('invitations.accept.sign_in')}
                </Button>
              </div>
            </div>
          ) : user.email !== invitation.email ? (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  {t('invitations.accept.email_mismatch_detail')} <strong>{invitation.email}</strong> {t('invitations.accept.but_logged_as')} <strong>{user.email}</strong>
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/auth?email=${encodeURIComponent(invitation.email)}&invitation=${token}`)}
              >
                {t('invitations.accept.switch_account')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleAcceptInvitation}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('invitations.accept.accepting')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('invitations.accept.accept_button')}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/dashboard')}
                disabled={accepting}
              >
                {t('invitations.accept.decline')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}