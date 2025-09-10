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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface OrderFormData {
  // Order identification
  orderNumber: string;
  orderType: string;
  status: string;
  
  // Customer information (vehicle owner)
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Vehicle information
  vehicleVin: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleInfo: string;
  stockNumber: string;
  
  // Assignment information (employee responsible)
  assignedGroupId?: string;
  assignedContactId?: string;
  salesperson?: string;
  
  // Order details
  notes: string;
  internalNotes?: string;
  priority?: string;
  dueDate?: Date;
  slaDeadline?: Date;
  scheduledDate?: Date;
  scheduledTime?: string;
}

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
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    stockNumber: '',
    orderType: 'sales',
    status: 'pending',
    assignedGroupId: '',
    assignedContactId: '',
    salesperson: '',
    notes: '',
    internalNotes: '',
    priority: 'normal',
    dueDate: undefined,
    slaDeadline: undefined,
    scheduledDate: undefined,
    scheduledTime: ''
  });

  const [selectedDealership, setSelectedDealership] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [dealerships, setDealerships] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
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
          orderNumber: order.orderNumber || order.order_number || '',
          customerName: order.customerName || order.customer_name || '',
          customerEmail: order.customerEmail || order.customer_email || '',
          customerPhone: order.customerPhone || order.customer_phone || '',
          vehicleVin: order.vehicleVin || order.vehicle_vin || '',
          vehicleYear: order.vehicleYear?.toString() || order.vehicle_year?.toString() || '',
          vehicleMake: order.vehicleMake || order.vehicle_make || '',
          vehicleModel: order.vehicleModel || order.vehicle_model || '',
          vehicleInfo: order.vehicleInfo || order.vehicle_info || '',
          stockNumber: order.stockNumber || order.stock_number || '',
          orderType: order.orderType || order.order_type || 'sales',
          status: order.status || 'pending',
          assignedGroupId: order.assignedGroupId || order.assigned_group_id || '',
          assignedContactId: order.assignedContactId || order.assigned_contact_id || '',
          salesperson: order.salesperson || '',
          notes: order.notes || '',
          internalNotes: order.internalNotes || order.internal_notes || '',
          priority: order.priority || 'normal',
          dueDate: order.dueDate || order.due_date ? safeParseDate(order.dueDate || order.due_date) || undefined : undefined,
          slaDeadline: order.slaDeadline || order.sla_deadline ? safeParseDate(order.slaDeadline || order.sla_deadline) || undefined : undefined,
          scheduledDate: order.scheduledDate || order.scheduled_date ? safeParseDate(order.scheduledDate || order.scheduled_date) || undefined : undefined,
          scheduledTime: order.scheduledTime || order.scheduled_time || ''
        });
        setSelectedServices(order.services || []);
        setSelectedDealership(order.dealerId?.toString() || order.dealer_id?.toString() || '');
        setSelectedAssignedTo(order.assignedGroupId || order.assigned_group_id || '');
      } else {
        // Reset form for new order
        setFormData({
          orderNumber: '',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          stockNumber: '',
          orderType: 'sales',
          status: 'pending',
          assignedGroupId: '',
          assignedContactId: '',
          salesperson: '',
          notes: '',
          internalNotes: '',
          priority: 'normal',
          dueDate: undefined,
          slaDeadline: undefined,
          scheduledDate: undefined,
          scheduledTime: ''
        });
        setSelectedServices([]);
        setSelectedDealership('');
        setSelectedAssignedTo('');
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
      // Get users from dealer memberships with their profiles
      const [usersResult, servicesResult] = await Promise.all([
        supabase
          .from('dealer_memberships')
          .select(`
            profiles!inner (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('dealer_id', parseInt(dealershipId))
          .eq('is_active', true),
        supabase
          .rpc('get_dealer_services_for_user', { p_dealer_id: parseInt(dealershipId) })
      ]);

      if (usersResult.data) {
        setAssignedUsers(usersResult.data.map((membership: any) => ({
          id: membership.profiles.id,
          name: `${membership.profiles.first_name || ''} ${membership.profiles.last_name || ''}`.trim() || membership.profiles.email,
          email: membership.profiles.email
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
    setSelectedAssignedTo('');
    setAssignedUsers([]);
    setServices([]);
    setSelectedServices([]);
    
    if (dealershipId) {
      fetchDealerData(dealershipId);
    }
  };

  const handleAssignedToChange = (groupId: string) => {
    setSelectedAssignedTo(groupId);
    // Update assignment in form data - do NOT touch customerName
    setFormData(prev => ({
      ...prev,
      assignedGroupId: groupId
    }));
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

  const transformToDbFormat = (formData: OrderFormData) => ({
    // Map frontend camelCase to backend snake_case
    order_number: formData.orderNumber,
    customer_name: formData.customerName,
    customer_email: formData.customerEmail || null,
    customer_phone: formData.customerPhone || null,
    vehicle_vin: formData.vehicleVin || null,
    vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
    vehicle_make: formData.vehicleMake || null,
    vehicle_model: formData.vehicleModel || null,
    vehicle_info: formData.vehicleInfo || null,
    stock_number: formData.stockNumber || null,
    order_type: formData.orderType,
    status: formData.status,
    assigned_group_id: formData.assignedGroupId || null,
    assigned_contact_id: formData.assignedContactId || null,
    salesperson: formData.salesperson || null,
    notes: formData.notes || null,
    internal_notes: formData.internalNotes || null,
    priority: formData.priority || 'normal',
    due_date: formData.dueDate || null,
    sla_deadline: formData.slaDeadline || null,
    scheduled_date: formData.scheduledDate || null,
    scheduled_time: formData.scheduledTime || null,
    dealer_id: selectedDealership ? parseInt(selectedDealership) : null,
    services: selectedServices
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dbData = transformToDbFormat(formData);
    onSave(dbData);
  };

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: any) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] p-0" aria-describedby="order-modal-description">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">
            {order ? t('orders.edit') : t('orders.create')}
          </DialogTitle>
          <div id="order-modal-description" className="sr-only">
            {order ? t('orders.edit') : t('orders.create')}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)] px-6">
          <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              
              {/* Dealership & Assignment Information */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('sales_orders.dealership')} & {t('sales_orders.assignment')}</CardTitle>
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
                        <SelectValue placeholder={loading ? t('common.loading') : t('sales_orders.select_dealership')} />
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
                    <Label htmlFor="assignedTo">{t('sales_orders.assigned_to')}</Label>
                    <Select 
                      value={selectedAssignedTo || ""} 
                      onValueChange={handleAssignedToChange} 
                      disabled={loading || !selectedDealership}
                    >
                      <SelectTrigger className="border-input bg-background">
                        <SelectValue placeholder={
                          !selectedDealership 
                            ? t('sales_orders.select_dealership_first') 
                            : loading 
                              ? t('common.loading') 
                              : t('sales_orders.select_assignee')
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border max-h-[200px]">
                        {assignedUsers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} - {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Customer Information Section */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">{t('orders.customer_information')}</Label>
                    
                    <div>
                      <Label htmlFor="customerName">{t('orders.customerName')}</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        className="border-input bg-background"
                        placeholder={t('orders.enter_customer_name')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerEmail">{t('orders.customer_email')}</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail || ''}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        className="border-input bg-background"
                        placeholder={t('orders.customer_email_placeholder')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerPhone">{t('orders.customer_phone')}</Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone || ''}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="border-input bg-background"
                        placeholder={t('orders.customer_phone_placeholder')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="priority">{t('orders.priority')}</Label>
                      <Select 
                        value={formData.priority || 'normal'} 
                        onValueChange={(value) => handleInputChange('priority', value)}
                      >
                        <SelectTrigger className="border-input bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border">
                          <SelectItem value="normal">{t('orders.priority_normal')}</SelectItem>
                          <SelectItem value="high">{t('orders.priority_high')}</SelectItem>
                          <SelectItem value="urgent">{t('orders.priority_urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
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
                      {selectedDealership && assignedUsers.length > 0 && (
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

            {/* Hidden fields with default values for later editing in order details */}
            <div className="hidden">
              <input 
                type="hidden" 
                name="salesperson" 
                value={formData.salesperson || ''} 
                onChange={(e) => handleInputChange('salesperson', e.target.value)}
              />
              <input 
                type="hidden" 
                name="internal_notes" 
                value={formData.internalNotes || ''} 
                onChange={(e) => handleInputChange('internalNotes', e.target.value)}
              />
              <input 
                type="hidden" 
                name="sla_deadline" 
                value={formData.slaDeadline ? formData.slaDeadline.toISOString() : ''} 
                onChange={(e) => handleInputChange('slaDeadline', e.target.value ? new Date(e.target.value) : undefined)}
              />
              <input 
                type="hidden" 
                name="scheduled_date" 
                value={formData.scheduledDate ? formData.scheduledDate.toISOString() : ''} 
                onChange={(e) => handleInputChange('scheduledDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
              <input 
                type="hidden" 
                name="scheduled_time" 
                value={formData.scheduledTime || ''} 
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
              />
            </div>

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