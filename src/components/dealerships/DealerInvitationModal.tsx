import React, { useState } from 'react';
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
    value: 'dealer_user', 
    key: 'dealer_user',
    description: 'Acceso de lectura a módulos básicos' 
  },
  { 
    value: 'dealer_salesperson', 
    key: 'dealer_salesperson',
    description: 'Gestión de órdenes de venta' 
  },
  { 
    value: 'dealer_service_advisor', 
    key: 'dealer_service_advisor',
    description: 'Gestión de órdenes de servicio' 
  },
  { 
    value: 'dealer_sales_manager', 
    key: 'dealer_sales_manager',
    description: 'Administración completa de ventas' 
  },
  { 
    value: 'dealer_service_manager', 
    key: 'dealer_service_manager',
    description: 'Administración completa de servicio' 
  },
  { 
    value: 'dealer_manager', 
    key: 'dealer_manager',
    description: 'Administración general del concesionario' 
  },
  { 
    value: 'dealer_admin', 
    key: 'dealer_admin',
    description: 'Acceso completo al concesionario' 
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
      const { data: invitationToken, error } = await supabase
        .rpc('create_dealer_invitation', {
          p_dealer_id: selectedDealerId,
          p_email: email,
          p_role_name: selectedRole,
        });

      if (error) throw error;

      // In a real application, you would send an email with the invitation link
      const invitationLink = `${window.location.origin}/invitation/${invitationToken}`;
      
      console.log('Invitation created:', invitationLink);

      toast({
        title: t('common.success'),
        description: t('invitations.invitation_sent'),
      });

      // Reset form
      setEmail('');
      setSelectedRole('');
      setSelectedDealerId(dealerId || null);
      onInvitationSent?.();
      onClose();
    } catch (error: any) {
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