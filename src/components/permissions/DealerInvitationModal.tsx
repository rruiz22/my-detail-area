import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface DealerInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealerId: number;
  onInvitationSent: () => void;
}

const DEALER_ROLES = [
  { value: 'dealer_user', label: 'Usuario Básico' },
  { value: 'dealer_salesperson', label: 'Vendedor' },
  { value: 'dealer_service_advisor', label: 'Asesor de Servicio' },
  { value: 'dealer_manager', label: 'Gerente' },
  { value: 'dealer_admin', label: 'Administrador' },
];

export const DealerInvitationModal: React.FC<DealerInvitationModalProps> = ({
  isOpen,
  onClose,
  dealerId,
  onInvitationSent,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !selectedRole) {
      toast({
        title: t('common.error'),
        description: 'Por favor complete todos los campos',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_dealer_invitation', {
        p_dealer_id: dealerId,
        p_email: email,
        p_role_name: selectedRole,
      });

      if (error) throw error;

      toast({
        title: 'Invitación enviada',
        description: `Se ha enviado una invitación a ${email}`,
      });

      setEmail('');
      setSelectedRole('');
      onInvitationSent();
      onClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error al enviar la invitación',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSelectedRole('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {DEALER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};