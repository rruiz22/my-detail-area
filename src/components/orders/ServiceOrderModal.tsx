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
import { CalendarIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { VinInputWithScanner } from "@/components/ui/vin-input-with-scanner";
import { useVinDecoding } from "@/hooks/useVinDecoding";
import { usePermissions } from "@/hooks/usePermissions";
import { DueDateTimePicker } from "@/components/ui/due-date-time-picker";

interface ServiceOrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

export default function ServiceOrderModal({ order, open, onClose, onSave }: ServiceOrderModalProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  
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
    if (vinDecoding.decodedData) {
      setFormData(prev => ({
        ...prev,
        vehicleMake: vinDecoding.decodedData.make || prev.vehicleMake,
        vehicleModel: vinDecoding.decodedData.model || prev.vehicleModel,
        vehicleYear: vinDecoding.decodedData.year?.toString() || prev.vehicleYear
      }));
    }
  }, [vinDecoding.decodedData]);

  const fetchDealerships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_accessible_dealers', { user_uuid: (await supabase.auth.getUser()).data.user?.id });
      
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
      const { data: contactsData, error: contactsError } = await supabase
        .from('dealership_contacts')
        .select('*')
        .eq('dealership_id', dealerId)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .rpc('get_dealer_services_for_user', { p_dealer_id: dealerId });

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

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vin = e.target.value;
    setFormData(prev => ({ ...prev, vehicleVin: vin }));
    if (vin && vin.length >= 11) {
      vinDecoding.decodeVin(vin);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
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

  const canViewPricing = hasPermission('sales', 'read');
  const totalPrice = canViewPricing 
    ? selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.price || 0);
      }, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? t('orders.edit_order') : t('service.new_service_order')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dealership & Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('service.dealership_customer_info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dealership">{t('service.dealership')}</Label>
                  <Select 
                    value={selectedDealership?.toString() || ''} 
                    onValueChange={handleDealershipChange}
                    disabled={loading || !!order}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('service.select_dealership')} />
                    </SelectTrigger>
                    <SelectContent>
                      {dealerships.map((dealer) => (
                        <SelectItem key={dealer.id} value={dealer.id.toString()}>
                          {dealer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">{t('service.contact')}</Label>
                  <Select 
                    value={selectedContact?.toString() || ''} 
                    onValueChange={handleContactChange}
                    disabled={!selectedDealership || loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('service.select_contact')} />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.first_name} {contact.last_name} - {contact.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">{t('orders.customer_name')}</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder={t('orders.customer_name')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">{t('orders.customer_email')}</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder={t('orders.customer_email')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">{t('orders.customer_phone')}</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder={t('orders.customer_phone')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('orders.vehicle_information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleVin">{t('orders.vin')}</Label>
                  <Input
                    id="vehicleVin"
                    value={formData.vehicleVin}
                    onChange={handleVinChange}
                    placeholder={t('orders.vin_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleInfo">{t('orders.additional_vehicle_info')}</Label>
                  <Input
                    id="vehicleInfo"
                    value={formData.vehicleInfo}
                    onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                    placeholder={t('orders.color_trim_etc')}
                  />
                </div>
              </div>

              {/* Service-specific fields */}
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="po">{t('service.po_number')}</Label>
                  <Input
                    id="po"
                    value={formData.po}
                    onChange={(e) => handleInputChange('po', e.target.value)}
                    placeholder={t('service.purchase_order')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ro">{t('service.ro_number')}</Label>
                  <Input
                    id="ro"
                    value={formData.ro}
                    onChange={(e) => handleInputChange('ro', e.target.value)}
                    placeholder={t('service.repair_order')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag">{t('service.service_tag')}</Label>
                  <Input
                    id="tag"
                    value={formData.tag}
                    onChange={(e) => handleInputChange('tag', e.target.value)}
                    placeholder={t('service.service_tag_number')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">{t('orders.year')}</Label>
                  <Input
                    id="vehicleYear"
                    type="number"
                    min="1900"
                    max="2030"
                    value={formData.vehicleYear}
                    onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                    placeholder={t('orders.vehicle_year')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleMake">{t('orders.make')}</Label>
                  <Input
                    id="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                    placeholder={t('orders.vehicle_make')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">{t('orders.model')}</Label>
                  <Input
                    id="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    placeholder={t('orders.vehicle_model')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('orders.services_notes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.length > 0 && (
                <div className="space-y-3">
                  <Label>{t('orders.available_services')}</Label>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={service.id}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                        />
                        <Label 
                          htmlFor={service.id} 
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div>
                            <div className="font-medium">{service.name}</div>
                            {service.description && (
                              <div className="text-xs text-muted-foreground">{service.description}</div>
                            )}
                            {canViewPricing && service.price && (
                              <div className="text-xs font-medium">${service.price}</div>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {canViewPricing && selectedServices.length > 0 && (
                    <div className="text-right font-semibold">
                      {t('orders.total')}: ${totalPrice.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('orders.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder={t('orders.order_notes_placeholder')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">{t('orders.internal_notes')}</Label>
                  <Textarea
                    id="internalNotes"
                    value={formData.internalNotes}
                    onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                    placeholder={t('orders.internal_notes_placeholder')}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('orders.due_date')}</Label>
                <DueDateTimePicker
                  value={formData.dueDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                />
              </div>
            </CardContent>
          </Card>

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
      </DialogContent>
    </Dialog>
  );
}

  // Initialize form data when order prop changes
  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customer_name || '',
        customerEmail: order.customer_email || '',
        customerPhone: order.customer_phone || '',
        vehicleMake: order.vehicle_make || '',
        vehicleModel: order.vehicle_model || '',
        vehicleYear: order.vehicle_year?.toString() || '',
        vehicleVin: order.vehicle_vin || '',
        vehicleInfo: order.vehicle_info || '',
        po: order.po || '',
        ro: order.ro || '',
        tag: order.tag || '',
        orderType: 'service',
        status: order.status || 'pending',
        notes: order.notes || '',
        internalNotes: order.internal_notes || '',
        dueDate: order.due_date ? new Date(order.due_date) : null
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
    if (decodedData) {
      setFormData(prev => ({
        ...prev,
        vehicleMake: decodedData.make || prev.vehicleMake,
        vehicleModel: decodedData.model || prev.vehicleModel,
        vehicleYear: decodedData.year?.toString() || prev.vehicleYear
      }));
    }
  }, [decodedData]);

  const fetchDealerships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_accessible_dealers', { user_uuid: (await supabase.auth.getUser()).data.user?.id });
      
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
      const { data: contactsData, error: contactsError } = await supabase
        .from('dealership_contacts')
        .select('*')
        .eq('dealership_id', dealerId)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .rpc('get_dealer_services_for_user', { p_dealer_id: dealerId });

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

  const handleVinChange = (vin: string) => {
    setFormData(prev => ({ ...prev, vehicleVin: vin }));
    if (vin && vin.length >= 11) {
      decodeVin(vin);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
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

  const totalPrice = canViewPricing 
    ? selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.price || 0);
      }, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? t('orders.edit_order') : t('service.new_service_order')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dealership & Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('service.dealership_customer_info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dealership">{t('service.dealership')}</Label>
                  <Select 
                    value={selectedDealership?.toString() || ''} 
                    onValueChange={handleDealershipChange}
                    disabled={loading || !!order}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('service.select_dealership')} />
                    </SelectTrigger>
                    <SelectContent>
                      {dealerships.map((dealer) => (
                        <SelectItem key={dealer.id} value={dealer.id.toString()}>
                          {dealer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">{t('service.contact')}</Label>
                  <Select 
                    value={selectedContact?.toString() || ''} 
                    onValueChange={handleContactChange}
                    disabled={!selectedDealership || loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('service.select_contact')} />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.first_name} {contact.last_name} - {contact.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">{t('orders.customer_name')}</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder={t('orders.customer_name')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">{t('orders.customer_email')}</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder={t('orders.customer_email')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">{t('orders.customer_phone')}</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder={t('orders.customer_phone')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('orders.vehicle_information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleVin">{t('orders.vin')}</Label>
                  <VinInputWithScanner
                    value={formData.vehicleVin}
                    onChange={handleVinChange}
                    placeholder={t('orders.vin_placeholder')}
                    isDecoding={isDecoding}
                    error={vinError}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleInfo">{t('orders.additional_vehicle_info')}</Label>
                  <Input
                    id="vehicleInfo"
                    value={formData.vehicleInfo}
                    onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                    placeholder={t('orders.color_trim_etc')}
                  />
                </div>
              </div>

              {/* Service-specific fields */}
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="po">{t('service.po_number')}</Label>
                  <Input
                    id="po"
                    value={formData.po}
                    onChange={(e) => handleInputChange('po', e.target.value)}
                    placeholder={t('service.purchase_order')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ro">{t('service.ro_number')}</Label>
                  <Input
                    id="ro"
                    value={formData.ro}
                    onChange={(e) => handleInputChange('ro', e.target.value)}
                    placeholder={t('service.repair_order')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag">{t('service.service_tag')}</Label>
                  <Input
                    id="tag"
                    value={formData.tag}
                    onChange={(e) => handleInputChange('tag', e.target.value)}
                    placeholder={t('service.service_tag_number')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">{t('orders.year')}</Label>
                  <Input
                    id="vehicleYear"
                    type="number"
                    min="1900"
                    max="2030"
                    value={formData.vehicleYear}
                    onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                    placeholder={t('orders.vehicle_year')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleMake">{t('orders.make')}</Label>
                  <Input
                    id="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                    placeholder={t('orders.vehicle_make')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">{t('orders.model')}</Label>
                  <Input
                    id="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    placeholder={t('orders.vehicle_model')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('orders.services_notes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.length > 0 && (
                <div className="space-y-3">
                  <Label>{t('orders.available_services')}</Label>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={service.id}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                        />
                        <Label 
                          htmlFor={service.id} 
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div>
                            <div className="font-medium">{service.name}</div>
                            {service.description && (
                              <div className="text-xs text-muted-foreground">{service.description}</div>
                            )}
                            {canViewPricing && service.price && (
                              <div className="text-xs font-medium">${service.price}</div>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {canViewPricing && selectedServices.length > 0 && (
                    <div className="text-right font-semibold">
                      {t('orders.total')}: ${totalPrice.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('orders.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder={t('orders.order_notes_placeholder')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">{t('orders.internal_notes')}</Label>
                  <Textarea
                    id="internalNotes"
                    value={formData.internalNotes}
                    onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                    placeholder={t('orders.internal_notes_placeholder')}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('orders.due_date')}</Label>
                <DueDateTimePicker
                  value={formData.dueDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                />
              </div>
            </CardContent>
          </Card>

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
      </DialogContent>
    </Dialog>
  );
}