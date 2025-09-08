import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { canViewPricing } from '@/utils/permissions';
import { useVinDecoding } from '@/hooks/useVinDecoding';

interface OrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({ order, open, onClose, onSave }) => {
  const { t } = useTranslation();
  const { roles } = usePermissionContext();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();

  // Form state
  const [formData, setFormData] = useState({
    orderNumber: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleVin: '',
    vehicleInfo: '',
    stockNumber: '',
    orderType: 'sales',
    priority: 'normal',
    status: 'pending',
    notes: ''
  });

  const [selectedDealership, setSelectedDealership] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [dealerships, setDealerships] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);

  const canViewPrices = canViewPricing(roles);

  useEffect(() => {
    if (open) {
      fetchDealerships();
      
      if (order) {
        setFormData({
          orderNumber: order.orderNumber || '',
          customerName: order.customerName || '',
          customerEmail: order.customerEmail || '',
          customerPhone: order.customerPhone || '',
          vehicleMake: order.vehicleMake || '',
          vehicleModel: order.vehicleModel || '',
          vehicleYear: order.vehicleYear || '',
          vehicleVin: order.vehicleVin || '',
          vehicleInfo: order.vehicleInfo || '',
          stockNumber: order.stockNumber || '',
          orderType: order.orderType || 'sales',
          priority: order.priority || 'normal',
          status: order.status || 'pending',
          notes: order.notes || ''
        });
        setSelectedServices(order.services || []);
        setSelectedDealership(order.dealerId?.toString() || '');
      } else {
        // Reset form for new order
        setFormData({
          orderNumber: '',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleYear: '',
          vehicleVin: '',
          vehicleInfo: '',
          stockNumber: '',
          orderType: 'sales',
          priority: 'normal',
          status: 'pending',
          notes: ''
        });
        setSelectedServices([]);
        setSelectedDealership('');
        setSelectedContact('');
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
    } catch (error) {
      console.error('Error fetching dealerships:', error);
    }
  };

  const fetchDealerData = async (dealershipId: string) => {
    if (!dealershipId) return;
    
    setLoading(true);
    try {
      const [contactsResult, servicesResult] = await Promise.all([
        supabase
          .from('dealership_contacts')
          .select('id, first_name, last_name, email, phone')
          .eq('dealership_id', parseInt(dealershipId))
          .eq('status', 'active'),
        supabase
          .rpc('get_dealer_services_for_user', { p_dealer_id: parseInt(dealershipId) })
      ]);

      if (contactsResult.data) {
        setContacts(contactsResult.data.map(contact => ({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`,
          email: contact.email,
          phone: contact.phone
        })));
      }

      if (servicesResult.data) {
        setServices(servicesResult.data);
      }
    } catch (error) {
      console.error('Error fetching dealer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealership(dealershipId);
    setSelectedContact('');
    setContacts([]);
    setServices([]);
    setSelectedServices([]);
    
    if (dealershipId) {
      fetchDealerData(dealershipId);
    }
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContact(contactId);
    // Find selected contact and populate form
    const selectedContactData = contacts.find((c: any) => c.id === contactId);
    if (selectedContactData) {
      setFormData(prev => ({
        ...prev,
        customerName: selectedContactData.name,
        customerEmail: selectedContactData.email,
        customerPhone: selectedContactData.phone
      }));
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
          vehicleInfo: vehicleData.vehicleInfo
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

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: any) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">
            {order ? t('orders.edit') : t('orders.create')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)] px-6">
          <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dealership & Customer Information */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('sales_orders.dealership')} & {t('orders.clientInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dealership">{t('sales_orders.dealership')}</Label>
                    <Select 
                      value={selectedDealership} 
                      onValueChange={handleDealershipChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="border-input bg-background">
                        <SelectValue placeholder={loading ? t('common.loading') : t('orders.selectClient')} />
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
                    <Label htmlFor="contact">{t('sales_orders.contact')}</Label>
                    <Select 
                      value={selectedContact} 
                      onValueChange={handleContactChange} 
                      disabled={loading || !selectedDealership}
                    >
                      <SelectTrigger className="border-input bg-background">
                        <SelectValue placeholder={
                          !selectedDealership 
                            ? t('orders.selectClient') 
                            : loading 
                              ? t('common.loading') 
                              : t('orders.selectClient')
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border max-h-[200px]">
                        {contacts.map((contact: any) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} - {contact.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="customerName">{t('orders.customerName')}</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className="border-input bg-background"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerEmail">{t('orders.customerEmail')}</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        className="border-input bg-background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerPhone">{t('orders.customerPhone')}</Label>
                      <Input
                        id="customerPhone"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="border-input bg-background"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information with VIN Decoding */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t('orders.vehicleInfo')}
                    {vinDecoded && <Badge variant="secondary" className="bg-success text-success-foreground">
                      <Zap className="w-3 h-3 mr-1" />
                      {t('sales_orders.vin_decoded_successfully')}
                    </Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stockNumber">{t('sales_orders.stock_number')}</Label>
                    <Input
                      id="stockNumber"
                      value={formData.stockNumber}
                      onChange={(e) => handleInputChange('stockNumber', e.target.value)}
                      className="border-input bg-background"
                      placeholder="ST-2025-001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                      {t('orders.vin')}
                      {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </Label>
                    <Input
                      id="vehicleVin"
                      value={formData.vehicleVin}
                      onChange={(e) => handleVinChange(e.target.value)}
                      className="border-input bg-background font-mono"
                      placeholder={t('sales_orders.enter_17_character_vin')}
                      maxLength={17}
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

                  {/* Consolidated Vehicle Info */}
                  <div>
                    <Label htmlFor="vehicleInfo">{t('sales_orders.vehicle')}</Label>
                    <Input
                      id="vehicleInfo"
                      value={formData.vehicleInfo}
                      onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                      className="border-input bg-background"
                      placeholder="2025 BMW X6 (xDrive40i)"
                    />
                    {!formData.vehicleInfo && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {t('sales_orders.manual_vehicle_entry')}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Individual Vehicle Fields (for editing if needed) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="vehicleYear" className="text-sm">{t('orders.year')}</Label>
                      <Input
                        id="vehicleYear"
                        type="number"
                        value={formData.vehicleYear}
                        onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                        className="border-input bg-background text-sm"
                        min="1900"
                        max="2030"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleMake" className="text-sm">{t('orders.make')}</Label>
                      <Input
                        id="vehicleMake"
                        value={formData.vehicleMake}
                        onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                        className="border-input bg-background text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleModel" className="text-sm">{t('orders.model')}</Label>
                      <Input
                        id="vehicleModel"
                        value={formData.vehicleModel}
                        onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                        className="border-input bg-background text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="priority">{t('orders.priority')}</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => handleInputChange('priority', value)}
                    >
                      <SelectTrigger className="border-input bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border">
                        <SelectItem value="low">{t('orders.lowPriority')}</SelectItem>
                        <SelectItem value="normal">{t('orders.normalPriority')}</SelectItem>
                        <SelectItem value="high">{t('orders.highPriority')}</SelectItem>
                        <SelectItem value="urgent">{t('orders.urgentPriority')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Services & Notes */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('orders.servicesAndNotes')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t('orders.services')} 
                      {selectedDealership && contacts.length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({services.length} {t('orders.available')})
                        </span>
                      )}
                    </Label>
                    
                    {!selectedDealership ? (
                      <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                        {t('orders.selectDealershipFirst')}
                      </div>
                    ) : loading ? (
                      <div className="p-4 border border-border rounded-lg text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                      </div>
                    ) : (
                      <ScrollArea className="h-64 border border-border rounded-lg p-3 bg-background">
                        <div className="space-y-3">
                          {services.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              {t('orders.noServicesAvailable')}
                            </div>
                          ) : (
                            services.map((service: any) => (
                              <div key={service.id} className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-accent/10 transition-colors">
                                <div className="flex items-start space-x-3 flex-1">
                                  <Checkbox
                                    id={service.id}
                                    checked={selectedServices.includes(service.id)}
                                    onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label 
                                      htmlFor={service.id} 
                                      className="font-medium text-sm cursor-pointer"
                                    >
                                      {service.name}
                                    </Label>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                      <Badge variant="outline" className="text-xs px-2 py-0">
                                        {t(`services.categories.${service.category}`)}
                                      </Badge>
                                      {service.duration && (
                                        <span>• {service.duration} {t('services.minutes')}</span>
                                      )}
                                    </div>
                                    {service.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {service.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {canViewPrices && service.price && (
                                  <div className="text-right shrink-0 ml-3">
                                    <span className="font-semibold text-sm">
                                      ${service.price.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {canViewPrices && selectedServices.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{t('orders.total')}</span>
                        <span className="font-bold text-lg text-primary">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedServices.length} {t('orders.servicesSelected')}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">{t('orders.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="border-input bg-background resize-none"
                      placeholder={t('orders.notesPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-6" />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-border hover:bg-accent hover:text-accent-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={!selectedDealership || !formData.customerName || selectedServices.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {order ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};