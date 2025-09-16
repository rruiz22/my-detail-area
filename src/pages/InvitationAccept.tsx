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

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    } else {
      setError('Token de invitación no válido');
      setLoading(false);
    }
  }, [token, fetchInvitationDetails]);

  const fetchInvitationDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch invitation details
      const { data: invitationData, error: invitationError } = await supabase
        .from('dealer_invitations')
        .select(`
          id,
          dealer_id,
          email,
          role_name,
          expires_at,
          accepted_at,
          inviter_id
        `)
        .eq('invitation_token', token)
        .single();

      if (invitationError) throw invitationError;

      if (!invitationData) {
        throw new Error(t('invitations.accept.not_found'));
      }

      // Check if invitation is expired
      const expiresAt = new Date(invitationData.expires_at);
      const now = new Date();

      if (expiresAt < now) {
        throw new Error(t('invitations.accept.expired'));
      }

      // Fetch dealership details
      const { data: dealershipData } = await supabase
        .from('dealerships')
        .select('name')
        .eq('id', invitationData.dealer_id)
        .single();

      // Fetch inviter details
      const { data: inviterData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', invitationData.inviter_id)
        .single();

      setInvitation({
        ...invitationData,
        dealership_name: dealershipData?.name || t('dealerships.title'),
        inviter_email: inviterData?.email || t('users.admin'),
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

    if (!invitation) return;

    // Verify email matches
    if (invitation.email !== user.email) {
      toast({
        title: t('invitations.accept.email_not_match'),
        description: t('invitations.accept.email_not_match_desc'),
        variant: 'destructive',
      });
      return;
    }

    setAccepting(true);

    try {
      const { error } = await supabase
        .rpc('accept_dealer_invitation', {
          p_invitation_token: token!,
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('invitations.accept.success_message', { dealership: invitation.dealership_name }),
      });

      // Redirect to dealership dashboard
      navigate('/dashboard');
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
      dealer_user: t('invitations.dealer_user'),
      dealer_salesperson: t('invitations.dealer_salesperson'),
      dealer_service_advisor: t('invitations.dealer_service_advisor'),
      dealer_sales_manager: t('invitations.dealer_sales_manager'),
      dealer_service_manager: t('invitations.dealer_service_manager'),
      dealer_manager: t('invitations.dealer_manager'),
      dealer_admin: t('invitations.dealer_admin'),
    };
    return roleMap[roleName] || roleName;
  };

  const getTimeUntilExpiration = () => {
    if (!invitation) return '';
    
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    const diffInHours = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} horas`;
    }
    return `${Math.ceil(diffInHours / 24)} días`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Verificando invitación...</p>
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
            <CardTitle>Invitación No Válida</CardTitle>
            <CardDescription>
              {error || 'No se pudo encontrar la invitación'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Ir al Inicio
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
            <CardTitle>Invitación Ya Aceptada</CardTitle>
            <CardDescription>
              Esta invitación ya ha sido aceptada anteriormente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/dashboard')}
            >
              Ir al Dashboard
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
          <CardTitle>Invitación al Concesionario</CardTitle>
          <CardDescription>
            Has sido invitado a unirte a un concesionario
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitation.dealership_name}</p>
                <p className="text-sm text-muted-foreground">Concesionario</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{getRoleDisplayName(invitation.role_name)}</p>
                <p className="text-sm text-muted-foreground">Rol asignado</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitation.email}</p>
                <p className="text-sm text-muted-foreground">
                  Invitado por {invitation.inviter_email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-300">
                  Expira en {getTimeUntilExpiration()}
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Esta invitación tiene fecha límite
                </p>
              </div>
            </div>
          </div>

          {/* User Authentication Check */}
          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Debes iniciar sesión con el email <strong>{invitation.email}</strong> para aceptar esta invitación
              </p>
              <Button 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Iniciar Sesión
              </Button>
            </div>
          ) : user.email !== invitation.email ? (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  Esta invitación fue enviada a <strong>{invitation.email}</strong> pero has iniciado sesión con <strong>{user.email}</strong>
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Cambiar de Cuenta
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
                    Aceptando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aceptar Invitación
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/dashboard')}
                disabled={accepting}
              >
                Declinar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}