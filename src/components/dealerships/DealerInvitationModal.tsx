import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Mail, UserPlus, Send } from 'lucide-react';

interface DealerInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealerId: number;
  onInvitationSent?: () => void;
}

const DEALER_ROLES = [
  { 
    value: 'dealer_user', 
    label: 'Usuario Básico', 
    description: 'Acceso de lectura a módulos básicos' 
  },
  { 
    value: 'dealer_salesperson', 
    label: 'Vendedor', 
    description: 'Gestión de órdenes de venta' 
  },
  { 
    value: 'dealer_service_advisor', 
    label: 'Asesor de Servicio', 
    description: 'Gestión de órdenes de servicio' 
  },
  { 
    value: 'dealer_sales_manager', 
    label: 'Gerente de Ventas', 
    description: 'Administración completa de ventas' 
  },
  { 
    value: 'dealer_service_manager', 
    label: 'Gerente de Servicio', 
    description: 'Administración completa de servicio' 
  },
  { 
    value: 'dealer_manager', 
    label: 'Gerente General', 
    description: 'Administración general del concesionario' 
  },
  { 
    value: 'dealer_admin', 
    label: 'Administrador', 
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
  
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'Usuario no autenticado',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create dealer invitation using RPC function
      const { data: invitationToken, error } = await supabase
        .rpc('create_dealer_invitation', {
          p_dealer_id: dealerId,
          p_email: email,
          p_role_name: selectedRole,
        });

      if (error) throw error;

      // In a real application, you would send an email with the invitation link
      const invitationLink = `${window.location.origin}/invitation/${invitationToken}`;
      
      console.log('Invitation created:', invitationLink);

      toast({
        title: '¡Invitación enviada!',
        description: `Se ha enviado una invitación a ${email}`,
      });

      // Reset form
      setEmail('');
      setSelectedRole('');
      onInvitationSent?.();
      onClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al enviar la invitación',
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
      onClose();
    }
  };

  const selectedRoleInfo = DEALER_ROLES.find(role => role.value === selectedRole);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invitar Usuario al Concesionario
          </DialogTitle>
          <DialogDescription>
            Envía una invitación para que un usuario se una a este concesionario con el rol específico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Dirección de Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
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
            <Label htmlFor="role">Rol Asignado *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol para el usuario" />
              </SelectTrigger>
              <SelectContent>
                {DEALER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.label}</span>
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
                  <strong>{selectedRoleInfo.label}:</strong> {selectedRoleInfo.description}
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
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !email || !selectedRole}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};