import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { safeParseDate } from '@/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { canViewPricing } from '@/utils/permissions';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { DueDateTimePicker } from '@/components/ui/due-date-time-picker';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';

interface ServiceOrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({ order, open, onClose, onSave }) => {
  const { t } = useTranslation();
  const { roles } = usePermissionContext();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    po: '',
    ro: '',
    tag: '',
    status: 'pending',
    notes: '',
    dueDate: undefined as Date | undefined
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
          customerName: order.customerName || '',
          customerEmail: order.customerEmail || '',
          customerPhone: order.customerPhone || '',
          vehicleVin: order.vehicleVin || '',
          vehicleYear: order.vehicleYear?.toString() || '',
          vehicleMake: order.vehicleMake || '',
          vehicleModel: order.vehicleModel || '',
          vehicleInfo: order.vehicleInfo || '',
          po: order.po || '',
          ro: order.ro || '',
          tag: order.tag || '',
          status: order.status || 'pending',
          notes: order.notes || '',
          dueDate: order.dueDate ? safeParseDate(order.dueDate) || undefined : undefined
        });
        setSelectedServices(order.services || []);
        setSelectedDealership(order.dealerId?.toString() || '');
      } else {
        // Reset form for new order
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          po: '',
          ro: '',
          tag: '',
          status: 'pending',
          notes: '',
          dueDate: undefined
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
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] p-0" aria-describedby="service-order-modal-description">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">
            {order ? t('orders.edit_service_order') : t('orders.create_service_order')}
          </DialogTitle>
          <DialogDescription className="sr-only" id="service-order-modal-description">
            {order ? t('orders.edit_service_order') : t('orders.create_service_order')}
          </DialogDescription>
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
                        value={selectedContact || ""} 
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

                   {/* Service Order Specific Fields */}
                   <Separator />
                   
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div>
                       <Label htmlFor="po">{t('service_orders.po_number')}</Label>
                       <Input
                         id="po"
                         value={formData.po}
                         onChange={(e) => handleInputChange('po', e.target.value)}
                         className="border-input bg-background"
                         placeholder="PO-2025-001"
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="ro">{t('service_orders.ro_number')}</Label>
                       <Input
                         id="ro"
                         value={formData.ro}
                         onChange={(e) => handleInputChange('ro', e.target.value)}
                         className="border-input bg-background"
                         placeholder="RO-2025-001"
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="tag">{t('service_orders.tag_number')}</Label>
                       <Input
                         id="tag"
                         value={formData.tag}
                         onChange={(e) => handleInputChange('tag', e.target.value)}
                         className="border-input bg-background"
                         placeholder="TAG-001"
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
                    <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                      {t('orders.vin')}
                      {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
                  </div>

                  {/* Consolidated Vehicle Info */}
                  <div>
                    <Label htmlFor="vehicleInfo">{t('sales_orders.vehicle')}</Label>
                    <Input
                      id="vehicleInfo"
                      value={formData.vehicleInfo}
                      onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                      className="border-input bg-background"
                      placeholder="2025 Honda Accord EX-L"
                    />
                  </div>

                  <Separator />

                   {/* Due Date & Time Section */}
                   <div className="space-y-4">
                     <Label className="text-base font-medium">{t('due_date.title')}</Label>
                     <div>
                       <DueDateTimePicker
                         value={formData.dueDate}
                         onChange={(date) => handleInputChange('dueDate', date)}
                         placeholder={t('due_date.date_placeholder')}
                       />
                     </div>
                     <div className="text-xs text-muted-foreground">
                       {t('due_date.validation.business_hours_only')}
                     </div>
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
                      {selectedDealership && services.length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({services.length} {t('orders.available')})
                        </span>
                      )}
                    </Label>
                    
                    {!selectedDealership ? (
                      <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
                        {t('orders.selectDealershipFirst')}
                      </div>
                    ) : services.length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
                        {loading ? t('common.loading') : t('orders.noServicesAvailable')}
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px] mt-2 p-3 border border-border rounded-md">
                        <div className="space-y-2">
                          {services.map((service: any) => (
                            <div key={service.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                              <Checkbox
                                id={service.id}
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                              />
                              <div className="flex-1 min-w-0">
                                <Label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                                  {service.name}
                                </Label>
                                {service.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {service.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {service.category_name}
                                  </Badge>
                                  {canViewPrices && service.price && (
                                    <span className="text-xs font-medium text-primary">
                                      ${service.price}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {canViewPrices && selectedServices.length > 0 && (
                    <div className="p-3 bg-accent rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('orders.totalPrice')}</span>
                        <span className="text-lg font-bold text-primary">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">{t('orders.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="border-input bg-background"
                      rows={4}
                      placeholder={t('orders.notesPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading || !formData.customerName}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  order ? t('common.save') : t('common.create')
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceOrderModal;