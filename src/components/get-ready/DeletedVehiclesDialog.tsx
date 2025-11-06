import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Undo2, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';

interface DeletedVehicle {
  id: string;
  stock_number: string;
  vin: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim?: string;
  workflow_type: string;
  deleted_at: string;
  deleted_by: string;
}

interface DeletedVehiclesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletedVehiclesDialog({ open, onOpenChange }: DeletedVehiclesDialogProps) {
  const { t, i18n } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return enUS;
    }
  };

  // Fetch deleted vehicles
  const { data: deletedVehicles, isLoading, refetch } = useQuery<DeletedVehicle[]>({
    queryKey: ['deleted-vehicles', currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data as DeletedVehicle[];
    },
    enabled: open && !!currentDealership?.id,
    staleTime: 0, // Always fetch fresh data when dialog opens
  });

  // Restore vehicle mutation
  const restoreMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { data, error } = await supabase.rpc('restore_vehicle', {
        p_vehicle_id: vehicleId,
        p_user_id: user?.id,
      });

      if (error) throw error;

      // Check function result
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to restore vehicle');
      }

      return data;
    },
    onMutate: async (vehicleId) => {
      setRestoringId(vehicleId);
    },
    onSuccess: () => {
      // Invalidate queries to refresh both deleted and active vehicles
      queryClient.invalidateQueries({ queryKey: ['deleted-vehicles'] });
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast({ description: t('get_ready.deleted_vehicles.restore_success') });
      setRestoringId(null);
    },
    onError: (error: Error) => {
      console.error('Failed to restore vehicle:', error);
      toast({ variant: 'destructive', description: error.message || t('get_ready.deleted_vehicles.restore_failed') });
      setRestoringId(null);
    },
  });

  const handleRestore = (vehicleId: string) => {
    restoreMutation.mutate(vehicleId);
  };

  const handleRefresh = () => {
    refetch();
    toast({ description: t('common.data_refreshed') });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t('get_ready.deleted_vehicles.title')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.deleted_vehicles.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            {t('get_ready.deleted_vehicles.count', { count: deletedVehicles?.length || 0 })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.actions.refresh')}
          </Button>
        </div>

        <ScrollArea className="h-[50vh] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deletedVehicles && deletedVehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('get_ready.table.vehicle_stock')}</TableHead>
                  <TableHead>{t('get_ready.table.vin')}</TableHead>
                  <TableHead>{t('get_ready.table.workflow')}</TableHead>
                  <TableHead>{t('get_ready.deleted_vehicles.deleted_at')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {vehicle.stock_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {vehicle.vin?.slice(-8)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {vehicle.workflow_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(vehicle.deleted_at), {
                          addSuffix: true,
                          locale: getLocale(),
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(vehicle.id)}
                        disabled={restoringId === vehicle.id}
                      >
                        <Undo2 className={`h-4 w-4 mr-2 ${restoringId === vehicle.id ? 'animate-spin' : ''}`} />
                        {restoringId === vehicle.id
                          ? t('get_ready.deleted_vehicles.restoring')
                          : t('get_ready.deleted_vehicles.restore')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Trash2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">{t('get_ready.deleted_vehicles.empty')}</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
