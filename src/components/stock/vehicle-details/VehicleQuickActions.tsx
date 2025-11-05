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
import { useVehicleStatus } from '@/hooks/useVehicleStatus';
import { Edit, Plus, Settings, Wrench } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GetReadyStepBadge } from './GetReadyStepBadge';
import { ReconStatusBadge } from './ReconStatusBadge';

interface VehicleQuickActionsProps {
  vehicle: VehicleInventory;
  canEdit: boolean;
  onOpenSalesModal?: () => void;
  onOpenServiceModal?: () => void;
  onOpenReconModal?: () => void;
  onOpenGetReadyModal?: () => void;
}

export const VehicleQuickActions: React.FC<VehicleQuickActionsProps> = ({
  vehicle,
  canEdit,
  onOpenSalesModal,
  onOpenServiceModal,
  onOpenReconModal,
  onOpenGetReadyModal
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasModulePermission } = usePermissions();

  // Use new unified hook to get vehicle status in both Recon and Get Ready
  const { reconOrder, getReadyVehicle, loading: statusLoading } = useVehicleStatus(
    vehicle.stock_number,
    vehicle.vin,
    vehicle.dealer_id
  );

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

  return (
    <div className="space-y-3">
      {/* Status Badges - Show current vehicle status */}
      {!statusLoading && (reconOrder || getReadyVehicle) && (
        <div className="flex flex-wrap gap-2">
          {reconOrder && (
            <ReconStatusBadge
              status={reconOrder.status}
              orderNumber={reconOrder.orderNumber}
              onClick={() => navigate(`/recon-orders?order=${reconOrder.id}`)}
            />
          )}
          {getReadyVehicle && (
            <GetReadyStepBadge
              stepName={getReadyVehicle.step_name}
              stepColor={getReadyVehicle.step_color}
              onClick={() => navigate('/get-ready', { state: { highlightId: getReadyVehicle.id } })}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
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

        {/* Add to Recon Button - Show only if NOT already in recon and has permission */}
        {!reconOrder && hasModulePermission('recon_orders', 'create_orders') && (
          <Button
            variant="outline"
            onClick={onOpenReconModal}
          >
            <Wrench className="w-4 h-4 mr-2" />
            {t('stock.vehicleDetails.actions.addToRecon', 'Add to Recon')}
          </Button>
        )}

        {/* Add to Get Ready Button - Show only if NOT already in get ready */}
        {!getReadyVehicle && onOpenGetReadyModal && (
          <Button
            variant="outline"
            onClick={onOpenGetReadyModal}
            disabled={statusLoading}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('stock.vehicleDetails.actions.addToGetReady', 'Add to Get Ready')}
          </Button>
        )}

        {/* View in Get Ready Button - Show only if already in get ready */}
        {getReadyVehicle && (
          <Button
            variant="outline"
            onClick={() => navigate('/get-ready', { state: { highlightId: getReadyVehicle.id } })}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('stock.vehicleDetails.actions.viewGetReady', 'View in Get Ready')}
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
    </div>
  );
};
