import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/usePermissions';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Plus, Wrench } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface VehicleQuickActionsProps {
  vehicle: VehicleInventory;
  canEdit: boolean;
  onOpenSalesModal?: () => void;
  onOpenServiceModal?: () => void;
  onOpenReconModal?: () => void;
}

export const VehicleQuickActions: React.FC<VehicleQuickActionsProps> = ({
  vehicle,
  canEdit,
  onOpenSalesModal,
  onOpenServiceModal,
  onOpenReconModal
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasModulePermission } = usePermissions();
  const [getReadyItem, setGetReadyItem] = useState<any | null>(null);
  const [checkingGetReady, setCheckingGetReady] = useState(false);

  // Check if vehicle is linked to Get Ready
  useEffect(() => {
    const checkGetReadyLink = async () => {
      setCheckingGetReady(true);
      try {
        const { data, error } = await supabase
          .from('get_ready_vehicles')
          .select('*')
          .or(`stock_number.eq.${vehicle.stock_number},vin.eq.${vehicle.vin}`)
          .eq('dealer_id', vehicle.dealer_id)
          .maybeSingle();

        if (!error && data) {
          setGetReadyItem(data);
        }
      } catch (error) {
        console.error('Error checking Get Ready link:', error);
      } finally {
        setCheckingGetReady(false);
      }
    };

    checkGetReadyLink();
  }, [vehicle.stock_number, vehicle.vin, vehicle.dealer_id]);

  const handleCreateOrder = (orderType: 'sales' | 'service' | 'recon') => {
    // Open the corresponding modal instead of navigating
    if (orderType === 'sales' && onOpenSalesModal) {
      onOpenSalesModal();
    } else if (orderType === 'service' && onOpenServiceModal) {
      onOpenServiceModal();
    } else if (orderType === 'recon' && onOpenReconModal) {
      onOpenReconModal();
    }
  };

  const handleGetReadyAction = () => {
    if (getReadyItem) {
      // Navigate to Get Ready with this item
      navigate('/get-ready', { state: { highlightId: getReadyItem.id } });
    } else {
      // Navigate to Get Ready to create new item
      navigate('/get-ready', {
        state: {
          prefillData: {
            stock_number: vehicle.stock_number,
            vin: vehicle.vin,
            vehicle_year: vehicle.year,
            vehicle_make: vehicle.make,
            vehicle_model: vehicle.model
          }
        }
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* Create Order Dropdown */}
      {(hasModulePermission('sales_orders', 'create_orders') ||
        hasModulePermission('service_orders', 'create_orders') ||
        hasModulePermission('recon_orders', 'create_orders')) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('stock.vehicleDetails.actions.createOrder', 'Create Order')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{t('stock.vehicleDetails.actions.selectOrderType', 'Select Order Type')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasModulePermission('sales_orders', 'create_orders') && (
              <DropdownMenuItem onClick={() => handleCreateOrder('sales')}>
                {t('stock.vehicleDetails.actions.createSalesOrder')}
              </DropdownMenuItem>
            )}
            {hasModulePermission('service_orders', 'create_orders') && (
              <DropdownMenuItem onClick={() => handleCreateOrder('service')}>
                {t('stock.vehicleDetails.actions.createServiceOrder')}
              </DropdownMenuItem>
            )}
            {hasModulePermission('recon_orders', 'create_orders') && (
              <DropdownMenuItem onClick={() => handleCreateOrder('recon')}>
                {t('stock.vehicleDetails.actions.createReconOrder')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Get Ready Button */}
      {hasModulePermission('get_ready', 'view_vehicles') && (
        <Button
          variant="outline"
          onClick={handleGetReadyAction}
          disabled={checkingGetReady}
        >
          <Wrench className="w-4 h-4 mr-2" />
          {getReadyItem
            ? t('stock.vehicleDetails.actions.viewGetReady', 'View in Get Ready')
            : t('stock.vehicleDetails.actions.linkGetReady')}
        </Button>
      )}

      {/* Edit Vehicle */}
      {canEdit && (
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          {t('stock.vehicleDetails.actions.editVehicle')}
        </Button>
      )}
    </div>
  );
};
