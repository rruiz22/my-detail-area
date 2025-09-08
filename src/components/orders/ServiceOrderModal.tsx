import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { useVinDecoding } from "@/hooks/useVinDecoding";
import { usePermissions } from "@/hooks/usePermissions";
import { DueDateTimePicker } from "@/components/ui/due-date-time-picker";
interface ServiceOrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}
export default function ServiceOrderModal({
  order,
  open,
  onClose,
  onSave
}: ServiceOrderModalProps) {
  const {
    t
  } = useTranslation();
  const {
    hasPermission
  } = usePermissions();
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleVin: '',
    vehicleInfo: '',
    po: '',
    ro: '',
    tag: '',
    orderType: 'service',
    status: 'pending',
    notes: '',
    internalNotes: '',
    dueDate: null as Date | null
  });
  const [selectedDealership, setSelectedDealership] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [dealerships, setDealerships] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // VIN decoding
  const vinDecoding = useVinDecoding();

  // Initialize form data when order prop changes
  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customer_name || order.customerName || '',
        customerEmail: order.customer_email || order.customerEmail || '',
        customerPhone: order.customer_phone || order.customerPhone || '',
        vehicleMake: order.vehicle_make || order.vehicleMake || '',
        vehicleModel: order.vehicle_model || order.vehicleModel || '',
        vehicleYear: order.vehicle_year?.toString() || order.vehicleYear?.toString() || '',
        vehicleVin: order.vehicle_vin || order.vehicleVin || '',
        vehicleInfo: order.vehicle_info || order.vehicleInfo || '',
        po: order.po || '',
        ro: order.ro || '',
        tag: order.tag || '',
        orderType: 'service',
        status: order.status || 'pending',
        notes: order.notes || '',
        internalNotes: order.internal_notes || order.internalNotes || '',
        dueDate: order.due_date ? new Date(order.due_date) : order.dueDate ? new Date(order.dueDate) : null
      });
      if (order.services && Array.isArray(order.services)) {
        setSelectedServices(order.services.map((s: any) => s.id || s));
      }
    } else {
      // Reset form for new order
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleVin: '',
        vehicleInfo: '',
        po: '',
        ro: '',
        tag: '',
        orderType: 'service',
        status: 'pending',
        notes: '',
        internalNotes: '',
        dueDate: null
      });
      setSelectedServices([]);
      setSelectedContact(null);
    }
  }, [order]);

  // Fetch dealerships when component mounts
  useEffect(() => {
    fetchDealerships();
  }, []);

  // Fetch dealer data when dealership changes
  useEffect(() => {
    if (selectedDealership) {
      fetchDealerData(selectedDealership);
    }
  }, [selectedDealership]);

  // Update vehicle info when VIN is decoded
  useEffect(() => {
    if (vinDecoding.loading === false && vinDecoding.error === null && vinDecoding.decodeVin) {
      // VIN decoding hook doesn't expose decoded data directly, so we handle it in the decode function
    }
  }, [vinDecoding]);
  const fetchDealerships = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: (await supabase.auth.getUser()).data.user?.id
      });
      if (error) throw error;
      setDealerships(data || []);

      // Auto-select first dealership if only one
      if (data && data.length === 1) {
        setSelectedDealership(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching dealerships:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchDealerData = async (dealerId: number) => {
    setLoading(true);
    try {
      // Fetch contacts
      const {
        data: contactsData,
        error: contactsError
      } = await supabase.from('dealership_contacts').select('*').eq('dealership_id', dealerId).eq('status', 'active').is('deleted_at', null);
      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch services
      const {
        data: servicesData,
        error: servicesError
      } = await supabase.rpc('get_dealer_services_for_user', {
        p_dealer_id: dealerId
      });
      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error fetching dealer data:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealership(parseInt(dealershipId));
    setSelectedContact(null);
    setContacts([]);
    setServices([]);
    setSelectedServices([]);
  };
  const handleContactChange = (contactId: string) => {
    const contact = contacts.find(c => c.id === parseInt(contactId));
    if (contact) {
      setSelectedContact(contact.id);
      setFormData(prev => ({
        ...prev,
        customerName: `${contact.first_name} ${contact.last_name}`,
        customerEmail: contact.email || '',
        customerPhone: contact.phone || contact.mobile_phone || ''
      }));
    }
  };
  const handleVinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vin = e.target.value;
    setFormData(prev => ({
      ...prev,
      vehicleVin: vin
    }));
    if (vin && vin.length >= 11 && vinDecoding.decodeVin) {
      try {
        const decodedData = await vinDecoding.decodeVin(vin);
         if (decodedData) {
           // Auto-populate vehicle info field with decoded data including trim
           const trimInfo = decodedData.trim ? ` (${decodedData.trim})` : '';
           const vehicleDesc = `${decodedData.year || ''} ${decodedData.make || ''} ${decodedData.model || ''}${trimInfo}`.trim();
           
           setFormData(prev => ({
             ...prev,
             vehicleMake: decodedData.make || prev.vehicleMake,
             vehicleModel: decodedData.model || prev.vehicleModel,
             vehicleYear: decodedData.year || prev.vehicleYear,
             vehicleInfo: vehicleDesc || prev.vehicleInfo
           }));
         }
      } catch (error) {
        console.error('VIN decoding error:', error);
      }
    }
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderData = {
      ...formData,
      dealerId: selectedDealership,
      services: selectedServices,
      assignedContactId: selectedContact,
      vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null
    };
    onSave(orderData);
  };
  const canViewPricing = hasPermission('service_orders', 'read');
  const totalPrice = canViewPricing ? selectedServices.reduce((total, serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] p-0" aria-describedby="service-order-modal-description">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">
            {order ? t('orders.edit_order') : t('service.new_service_order')}
          </DialogTitle>
          <div id="service-order-modal-description" className="sr-only">
            {order ? 'Edit existing service order details and services' : 'Create a new service order with customer and vehicle information'}
          </div>
        </DialogHeader>

        <div className="max-h-[calc(95vh-120px)] overflow-y-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dealership & Customer Information */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('service.dealership')} & {t('orders.clientInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dealership">{t('service.dealership')}</Label>
                    <Select 
                      value={selectedDealership?.toString() || ''} 
                      onValueChange={handleDealershipChange} 
                      disabled={loading || !!order}
                    >
                      <SelectTrigger className="border-input bg-background">
                        <SelectValue placeholder={loading ? t('common.loading') : t('service.select_dealership')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border max-h-[200px]">
                        {dealerships.map(dealer => (
                          <SelectItem key={dealer.id} value={dealer.id.toString()}>
                            {dealer.name} - {dealer.city}, {dealer.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contact">{t('service.contact')}</Label>
                    <Select 
                      value={selectedContact?.toString() || ''} 
                      onValueChange={handleContactChange} 
                      disabled={!selectedDealership || loading}
                    >
                      <SelectTrigger className="border-input bg-background">
                        <SelectValue placeholder={
                          !selectedDealership 
                            ? t('service.select_dealership_first') 
                            : loading 
                              ? t('common.loading') 
                              : t('service.select_contact')
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border max-h-[200px]">
                        {contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.first_name} {contact.last_name} - {contact.email}
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
                      readOnly={!!selectedContact}
                      disabled={!!selectedContact}
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
                        readOnly={!!selectedContact}
                        disabled={!!selectedContact}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">{t('orders.customerPhone')}</Label>
                      <Input
                        id="customerPhone"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="border-input bg-background"
                        readOnly={!!selectedContact}
                        disabled={!!selectedContact}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information & Service Details */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('orders.vehicle_information')} & {t('service.service_details')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Service-specific fields */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="po">{t('service.po_number')}</Label>
                      <Input 
                        id="po" 
                        value={formData.po} 
                        onChange={e => handleInputChange('po', e.target.value)} 
                        placeholder={t('service.purchase_order')}
                        className="border-input bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ro">{t('service.ro_number')}</Label>
                      <Input 
                        id="ro" 
                        value={formData.ro} 
                        onChange={e => handleInputChange('ro', e.target.value)} 
                        placeholder={t('service.repair_order')}
                        className="border-input bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tag">{t('service.service_tag')}</Label>
                      <Input 
                        id="tag" 
                        value={formData.tag} 
                        onChange={e => handleInputChange('tag', e.target.value)} 
                        placeholder={t('service.service_tag_number')}
                        className="border-input bg-background"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* VIN and Vehicle information with VIN decoding */}
                  <div>
                    <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                      {t('orders.vin')}
                      {vinDecoding.loading && (
                        <div className="inline-flex items-center gap-1">
                          <div className="w-3 h-3 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                          <span className="text-xs text-muted-foreground">Decoding...</span>
                        </div>
                      )}
                    </Label>
                    <Input
                      id="vehicleVin"
                      value={formData.vehicleVin}
                      onChange={handleVinChange}
                      placeholder={t('orders.vin_placeholder')}
                      className="font-mono border-input bg-background"
                      maxLength={17}
                    />
                    {vinDecoding.error && (
                      <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                        <div className="w-3 h-3 rounded-full bg-destructive"></div>
                        {vinDecoding.error}
                      </div>
                    )}
                    {formData.vehicleVin.length > 0 && formData.vehicleVin.length < 17 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {17 - formData.vehicleVin.length} characters remaining
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="vehicleInfo" className="flex items-center gap-2">
                      {t('orders.vehicle')}
                      {formData.vehicleMake && formData.vehicleModel && formData.vehicleYear && (
                        <div className="inline-flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-success"></div>
                          <span className="text-xs text-success">VIN Decoded</span>
                        </div>
                      )}
                    </Label>
                    <Input
                      id="vehicleInfo"
                      value={formData.vehicleInfo}
                      onChange={e => handleInputChange('vehicleInfo', e.target.value)}
                      placeholder="2025 BMW X6 (xDrive40i)"
                      className="border-input bg-background"
                    />
                    {!formData.vehicleInfo && formData.vehicleMake && formData.vehicleModel && formData.vehicleYear && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Auto-filled: {formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Due Date & Time Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">{t('due_date.title')}</Label>
                    <div>
                      <DueDateTimePicker
                        value={formData.dueDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                        placeholder={t('due_date.date_placeholder')}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('due_date.validation.business_hours_only')}
                    </div>
                  </div>

                  {/* Hidden fields for VIN decoded data */}
                  <div className="grid grid-cols-3 gap-4" style={{ display: 'none' }}>
                    <Input id="vehicleYear" type="number" value={formData.vehicleYear} readOnly />
                    <Input id="vehicleMake" value={formData.vehicleMake} readOnly />
                    <Input id="vehicleModel" value={formData.vehicleModel} readOnly />
                  </div>
                </CardContent>
              </Card>

              {/* Services & Notes */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('orders.services')} & {t('service.service_notes')}</CardTitle>
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
                      <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                        {t('service.select_dealership_first')}
                      </div>
                    ) : loading ? (
                      <div className="p-4 border border-border rounded-lg text-center">
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-2"></div>
                        <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
                      </div>
                    ) : services.length === 0 ? (
                      <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                        {t('orders.no_services_available')}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                          {services.map(service => (
                            <div key={service.id} className="flex items-start space-x-2">
                              <Checkbox 
                                id={service.id} 
                                checked={selectedServices.includes(service.id)} 
                                onCheckedChange={() => handleServiceToggle(service.id)} 
                                className="mt-0.5"
                              />
                              <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer flex-1">
                                <div>
                                  <div className="font-medium">{service.name}</div>
                                  {service.description && <div className="text-xs text-muted-foreground">{service.description}</div>}
                                  {canViewPricing && service.price && <div className="text-xs font-medium text-primary">${service.price}</div>}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                        
                        {canViewPricing && selectedServices.length > 0 && (
                          <div className="text-right font-semibold text-primary">
                            {t('orders.total')}: ${totalPrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes">{t('orders.notes')}</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={e => handleInputChange('notes', e.target.value)}
                        placeholder={t('orders.notes_placeholder')}
                        className="min-h-[80px] border-input bg-background"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="internalNotes">{t('orders.internal_notes')}</Label>
                      <Textarea
                        id="internalNotes"
                        value={formData.internalNotes}
                        onChange={e => handleInputChange('internalNotes', e.target.value)}
                        placeholder={t('orders.internal_notes_placeholder')}
                        className="min-h-[80px] border-input bg-background"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading || !selectedDealership}>
                {order ? t('orders.update_order') : t('service.create_service_order')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>;
}