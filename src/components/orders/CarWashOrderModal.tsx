import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatVehicleDisplay } from '@/utils/vehicleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';

interface CarWashOrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

export const CarWashOrderModal: React.FC<CarWashOrderModalProps> = ({ order, open, onClose, onSave }) => {
  const { t } = useTranslation();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();

  // Form state
  const [formData, setFormData] = useState({
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    stockNumber: '',
    tag: '',
    service: '',
    notes: '',
    isWaiter: false
  });

  const [selectedDealership, setSelectedDealership] = useState('');
  const [dealerships, setDealerships] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);

  // Auto-generate vehicle display when VIN is decoded or fields change
  useEffect(() => {
    const vehicleDisplay = formatVehicleDisplay(
      formData.vehicleYear,
      formData.vehicleMake,
      formData.vehicleModel
    );
    if (vehicleDisplay !== formData.vehicleInfo) {
      setFormData(prev => ({ ...prev, vehicleInfo: vehicleDisplay }));
    }
  }, [formData.vehicleYear, formData.vehicleMake, formData.vehicleModel]);

  useEffect(() => {
    if (open) {
      fetchDealerships();
      
      if (order) {
        setFormData({
          vehicleVin: order.vehicleVin || '',
          vehicleYear: order.vehicleYear?.toString() || '',
          vehicleMake: order.vehicleMake || '',
          vehicleModel: order.vehicleModel || '',
          vehicleInfo: order.vehicleInfo || '',
          stockNumber: order.stockNumber || '',
          tag: order.tag || '',
          service: order.service || '',
          notes: order.notes || '',
          isWaiter: order.isWaiter || false
        });
        setSelectedServices(order.services || []);
        setSelectedDealership(order.dealerId?.toString() || '');
      } else {
        // Reset form for new order
        setFormData({
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          stockNumber: '',
          tag: '',
          service: '',
          notes: '',
          isWaiter: false
        });
        setSelectedServices([]);
        setSelectedDealership('');
      }
    }
  }, [order, open]);

  const fetchDealerships = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.user.id
      });

      if (error) throw error;
      setDealerships(data || []);
      
      // Auto-select if only one dealership
      if (data && data.length === 1) {
        setSelectedDealership(data[0].id.toString());
        fetchDealerServices(data[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching dealerships:', error);
    }
  };

  const fetchDealerServices = async (dealershipId: string) => {
    if (!dealershipId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_dealer_services_for_user', { p_dealer_id: parseInt(dealershipId) });

      if (error) throw error;
      
      // Filter services for car wash module (wash and general categories)
      const carWashServices = (data || []).filter((service: any) => 
        service.category === 'wash' || service.category === 'general'
      );
      setServices(carWashServices);
    } catch (error) {
      console.error('Error fetching dealer services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealership(dealershipId);
    setServices([]);
    setSelectedServices([]);
    
    if (dealershipId) {
      fetchDealerServices(dealershipId);
    }
  };

  const handleVinChange = async (vin: string) => {
    handleInputChange('vehicleVin', vin);
    
    if (vin.length === 17 && !vinDecoded) {
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        setFormData(prev => ({
          ...prev,
          vehicleYear: vehicleData.year,
          vehicleMake: vehicleData.make,
          vehicleModel: vehicleData.model,
        }));
        setVinDecoded(true);
      }
    } else if (vin.length !== 17) {
      setVinDecoded(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      services: selectedServices,
      dealerId: selectedDealership ? parseInt(selectedDealership) : null
    });
  };

  const totalPrice = selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: any) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] p-0" aria-describedby="carwash-order-modal-description">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {order ? t('car_wash_orders.edit_order') : t('car_wash_orders.quick_car_wash_order')}
            {formData.isWaiter && (
              <Badge variant="destructive" className="bg-destructive text-destructive-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {t('car_wash_orders.waiter_priority')}
              </Badge>
            )}
          </DialogTitle>
          <div id="carwash-order-modal-description" className="sr-only">
            {order ? 'Edit existing car wash order' : 'Create a new quick car wash order with VIN scanning'}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)] px-6">
          <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Dealership & Vehicle Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dealership">{t('car_wash_orders.dealership')}</Label>
                  <Select 
                    value={selectedDealership} 
                    onValueChange={handleDealershipChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="border-input bg-background">
                      <SelectValue placeholder={loading ? t('common.loading') : t('car_wash_orders.select_dealership')} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border max-h-[200px]">
                      {dealerships.map((dealer: any) => (
                        <SelectItem key={dealer.id} value={dealer.id.toString()}>
                          {dealer.name} - {dealer.city}, {dealer.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                    {t('orders.vin')}
                    {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {vinDecoded && (
                      <Badge variant="secondary" className="bg-success text-success-foreground">
                        <Zap className="w-3 h-3 mr-1" />
                        {t('car_wash_orders.decoded')}
                      </Badge>
                    )}
                  </Label>
                  <VinInputWithScanner
                    id="vehicleVin"
                    name="vehicleVin"
                    value={formData.vehicleVin}
                    onChange={(e) => handleVinChange(e.target.value)}
                    onVinScanned={handleVinChange}
                    className="border-input bg-background font-mono"
                  />
                  {vinError && (
                    <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {vinError}
                    </div>
                  )}
                  {formData.vehicleVin.length > 0 && formData.vehicleVin.length < 17 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {17 - formData.vehicleVin.length} characters remaining
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="vehicleInfo">{t('car_wash_orders.vehicle_display')}</Label>
                  <Input
                    id="vehicleInfo"
                    value={formData.vehicleInfo}
                    onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                    className="border-input bg-background font-medium"
                    placeholder="2025 BMW X6 (xDrive40i)"
                  />
                  {!formData.vehicleInfo && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {t('car_wash_orders.auto_populated')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stockNumber">{t('car_wash_orders.stock_number')}</Label>
                    <Input
                      id="stockNumber"
                      value={formData.stockNumber}
                      onChange={(e) => handleInputChange('stockNumber', e.target.value)}
                      className="border-input bg-background"
                      placeholder="ST-2025-001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tag">{t('car_wash_orders.tag')}</Label>
                    <Input
                      id="tag"
                      value={formData.tag}
                      onChange={(e) => handleInputChange('tag', e.target.value)}
                      className="border-input bg-background"
                      placeholder="LOT-A1"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Service & Options */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service">{t('car_wash_orders.service_description')}</Label>
                  <Textarea
                    id="service"
                    value={formData.service}
                    onChange={(e) => handleInputChange('service', e.target.value)}
                    className="border-input bg-background min-h-[100px]"
                    placeholder={t('car_wash_orders.service_placeholder')}
                  />
                </div>

                <div className="flex items-center space-x-2 p-4 border border-border rounded-lg bg-background">
                  <Checkbox
                    id="waiter"
                    checked={formData.isWaiter}
                    onCheckedChange={(checked) => handleInputChange('isWaiter', checked)}
                  />
                  <Label 
                    htmlFor="waiter" 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-destructive" />
                    <span className="font-medium">{t('car_wash_orders.waiter_priority')}</span>
                  </Label>
                </div>
                
                {formData.isWaiter && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                    {t('car_wash_orders.waiter_description')}
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">{t('orders.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="border-input bg-background"
                    placeholder={t('car_wash_orders.notes_placeholder')}
                    rows={3}
                  />
                </div>

                {/* Available Services */}
                {selectedDealership && services.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      {t('orders.services')} ({services.length} {t('orders.available')})
                    </Label>
                    <div className="max-h-32 overflow-y-auto space-y-2 p-3 border border-border rounded-md bg-background">
                      {services.map((service: any) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                          />
                          <Label 
                            htmlFor={service.id}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {service.name} - ${service.price || 0}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {totalPrice > 0 && (
                      <div className="text-sm font-medium text-right">
                        {t('orders.total')}: ${totalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !selectedDealership || !formData.vehicleVin}
                className="min-w-[120px]"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {order ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};