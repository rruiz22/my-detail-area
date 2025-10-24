import { OrderModal } from '@/components/orders/OrderModal';
import { ReconOrderModal } from '@/components/orders/ReconOrderModal';
import ServiceOrderModal from '@/components/orders/ServiceOrderModal';
import { VehicleActivityTab } from '@/components/stock/vehicle-details/VehicleActivityTab';
import { VehicleHeader } from '@/components/stock/vehicle-details/VehicleHeader';
import { VehicleHistoryTab } from '@/components/stock/vehicle-details/VehicleHistoryTab';
import { VehicleInfoTab } from '@/components/stock/vehicle-details/VehicleInfoTab';
import { VehicleMarketTab } from '@/components/stock/vehicle-details/VehicleMarketTab';
import { VehiclePhotosTab } from '@/components/stock/vehicle-details/VehiclePhotosTab';
import { VehicleQuickActions } from '@/components/stock/vehicle-details/VehicleQuickActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const VehicleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasModulePermission } = usePermissions();

  const [vehicle, setVehicle] = useState<VehicleInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  // Order creation modal states
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showReconModal, setShowReconModal] = useState(false);

  // Permission checks
  const canView = hasModulePermission('stock', 'view');
  const canEdit = hasModulePermission('stock', 'edit');
  const canDelete = hasModulePermission('stock', 'delete');

  // Fetch vehicle data
  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id) {
        setError('Vehicle ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('dealer_vehicle_inventory')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Vehicle not found');
          return;
        }

        setVehicle(data as VehicleInventory);
        setError(null);
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError(err instanceof Error ? err.message : 'Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [id]);

  // Prepare pre-filled data for order creation
  const preFillOrderData = useMemo(() => {
    if (!vehicle) return null;

    return {
      vehicleVin: vehicle.vin,
      vehicle_vin: vehicle.vin,
      vehicleYear: vehicle.year?.toString(),
      vehicle_year: vehicle.year?.toString(),
      vehicleMake: vehicle.make,
      vehicle_make: vehicle.make,
      vehicleModel: vehicle.model,
      vehicle_model: vehicle.model,
      vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vehicle_info: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      stockNumber: vehicle.stock_number,
      stock_number: vehicle.stock_number,
    };
  }, [vehicle]);

  // Order save handlers
  const handleSaveSalesOrder = async (orderData: any) => {
    try {
      // The modal already handles the save to database
      setShowSalesModal(false);
      toast({
        title: t('common.success'),
        description: t('orders.created_successfully')
      });
    } catch (error) {
      console.error('Error creating sales order:', error);
    }
  };

  const handleSaveServiceOrder = async (orderData: any) => {
    try {
      setShowServiceModal(false);
      toast({
        title: t('common.success'),
        description: t('orders.created_successfully')
      });
    } catch (error) {
      console.error('Error creating service order:', error);
    }
  };

  const handleSaveReconOrder = async (orderData: any) => {
    try {
      setShowReconModal(false);
      toast({
        title: t('common.success'),
        description: t('orders.created_successfully')
      });
    } catch (error) {
      console.error('Error creating recon order:', error);
    }
  };

  // Permission denied
  if (!canView) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-2xl font-bold">{t('errors.no_permission')}</h2>
            <p className="text-muted-foreground max-w-md">
              {t('errors.no_module_access', { module: t('stock.title') })}
            </p>
            <Button onClick={() => navigate('/stock')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !vehicle) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-2xl font-bold">{t('common.error')}</h2>
            <p className="text-muted-foreground max-w-md">
              {error || t('stock.vehicleDetails.notFound')}
            </p>
            <Button onClick={() => navigate('/stock')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-2 pb-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/stock')}
        className="mb-3"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back_to', { page: t('stock.title') })}
      </Button>

      {/* Header with vehicle info and photo */}
      <VehicleHeader vehicle={vehicle} />

      {/* Quick Actions Bar */}
      <div className="mt-6">
        <VehicleQuickActions
        vehicle={vehicle}
        canEdit={canEdit}
        onOpenSalesModal={() => setShowSalesModal(true)}
        onOpenServiceModal={() => setShowServiceModal(true)}
        onOpenReconModal={() => setShowReconModal(true)}
      />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">{t('stock.vehicleDetails.tabs.info')}</TabsTrigger>
              <TabsTrigger value="market">{t('stock.vehicleDetails.tabs.market')}</TabsTrigger>
              <TabsTrigger value="photos">{t('stock.vehicleDetails.tabs.photos')}</TabsTrigger>
              <TabsTrigger value="location">{t('stock.vehicleDetails.tabs.location', 'Location')}</TabsTrigger>
              <TabsTrigger value="activity">{t('stock.vehicleDetails.tabs.activity')}</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="info" className="m-0">
                <VehicleInfoTab vehicle={vehicle} />
              </TabsContent>

              <TabsContent value="market" className="m-0">
                <VehicleMarketTab vehicle={vehicle} />
              </TabsContent>

              <TabsContent value="photos" className="m-0">
                <VehiclePhotosTab vehicle={vehicle} canEdit={canEdit} canDelete={canDelete} />
              </TabsContent>

              <TabsContent value="location" className="m-0">
                <VehicleHistoryTab vehicle={vehicle} />
              </TabsContent>

              <TabsContent value="activity" className="m-0">
                <VehicleActivityTab vehicle={vehicle} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      </div>

      {/* Order Creation Modals */}
      {preFillOrderData && (
        <>
          <OrderModal
            open={showSalesModal}
            onClose={() => setShowSalesModal(false)}
            onSave={handleSaveSalesOrder}
            order={preFillOrderData}
          />

          <ServiceOrderModal
            open={showServiceModal}
            onClose={() => setShowServiceModal(false)}
            onSave={handleSaveServiceOrder}
            order={preFillOrderData}
          />

          <ReconOrderModal
            open={showReconModal}
            onClose={() => setShowReconModal(false)}
            onSave={handleSaveReconOrder}
            order={preFillOrderData}
          />
        </>
      )}
    </div>
  );
};

export default VehicleDetailsPage;
