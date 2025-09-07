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
import { supabase } from '@/integrations/supabase/client';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { canViewPricing } from '@/utils/permissions';

interface OrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
  dealerId?: string;
}

export const OrderModal: React.FC<OrderModalProps> = ({ order, open, onClose, onSave, dealerId }) => {
  const { t } = useTranslation();
  const { roles } = usePermissionContext();

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
    orderType: '',
    priority: 'normal',
    status: 'pending',
    notes: ''
  });

  const [selectedClient, setSelectedClient] = useState('');
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canViewPrices = canViewPricing(roles);

  useEffect(() => {
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
        orderType: order.orderType || '',
        priority: order.priority || 'normal',
        status: order.status || 'pending',
        notes: order.notes || ''
      });
      setSelectedServices(order.services || []);
    } else {
      setFormData({
        orderNumber: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleVin: '',
        orderType: '',
        priority: 'normal',
        status: 'pending',
        notes: ''
      });
      setSelectedServices([]);
    }
    
    if (dealerId) {
      fetchDealerData();
    }
  }, [order, dealerId]);

  const fetchDealerData = async () => {
    if (!dealerId) return;
    
    setLoading(true);
    try {
      const [contactsResult, servicesResult] = await Promise.all([
        supabase
          .from('dealership_contacts')
          .select('id, first_name, last_name, email, phone')
          .eq('dealership_id', parseInt(dealerId))
          .eq('status', 'active'),
        supabase
          .rpc('get_dealer_services_for_user', { p_dealer_id: parseInt(dealerId) })
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

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    // Find selected contact and populate form
    const selectedContact = contacts.find((c: any) => c.id === clientId);
    if (selectedContact) {
      setFormData(prev => ({
        ...prev,
        customerName: selectedContact.name,
        customerEmail: selectedContact.email,
        customerPhone: selectedContact.phone
      }));
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
      services: selectedServices
    });
  };

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: any) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {order ? t('orders.edit') : t('orders.create')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('orders.clientInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="client">{t('orders.client')}</Label>
                    <Select value={selectedClient} onValueChange={handleClientChange} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? t('common.loading') : t('orders.selectClient')} />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact: any) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} - {contact.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customerName">{t('orders.customerName')}</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerEmail">{t('orders.customerEmail')}</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone">{t('orders.customerPhone')}</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('orders.vehicleInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="vehicleVin">{t('orders.vin')}</Label>
                    <Input
                      id="vehicleVin"
                      value={formData.vehicleVin}
                      onChange={(e) => handleInputChange('vehicleVin', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicleYear">{t('orders.year')}</Label>
                      <Input
                        id="vehicleYear"
                        type="number"
                        value={formData.vehicleYear}
                        onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleMake">{t('orders.make')}</Label>
                      <Input
                        id="vehicleMake"
                        value={formData.vehicleMake}
                        onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vehicleModel">{t('orders.model')}</Label>
                    <Input
                      id="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">{t('orders.priority')}</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
              <Card>
                <CardHeader>
                  <CardTitle>{t('orders.servicesAndNotes')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('orders.services')}</Label>
                    <ScrollArea className="h-48 border rounded p-3">
                      <div className="space-y-3">
                        {services.map((service: any) => (
                          <div key={service.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={service.id}
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                              />
                              <div className="flex-1">
                                <Label htmlFor={service.id} className="font-medium">{service.name}</Label>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{t(`services.categories.${service.category}`)}</span>
                                  {service.duration && (
                                    <span>• {service.duration} {t('services.minutes')}</span>
                                  )}
                                </div>
                                {service.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                                )}
                              </div>
                            </div>
                            {canViewPrices && service.price && (
                              <div className="text-right">
                                <span className="font-semibold">${service.price.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {canViewPrices && (
                    <div className="mt-4 p-3 bg-muted rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{t('orders.total')}</span>
                        <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label htmlFor="notes">{t('orders.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      placeholder={t('orders.notesPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {order ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};