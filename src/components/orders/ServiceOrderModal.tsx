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

interface OrderFormData {
  // Order identification
  orderNumber: string;
  orderType: string;
  status: string;
  
  // Customer information (vehicle owner)
  customerName: string;
  
  // Vehicle information
  vehicleVin: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleInfo: string;
  
  // Service order specific fields
  po: string;
  ro: string;
  tag: string;
  
  // Assignment information (employee responsible)
  assignedGroupId?: string;
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
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: '',
    orderType: 'service',
    status: 'pending',
    customerName: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    po: '',
    ro: '',
    tag: '',
    assignedGroupId: '',
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

  const isEditing = Boolean(order);

  // Check global dealer filter
  const globalDealerFilter = localStorage.getItem('selectedDealerFilter');
  const isGlobalFilterActive = globalDealerFilter && globalDealerFilter !== 'all';
  const isDealerFieldReadOnly = isGlobalFilterActive;

  useEffect(() => {
    if (open) {
      fetchDealerships();
      
      if (order) {
        setFormData({
          orderNumber: order.orderNumber || order.order_number || '',
          orderType: order.orderType || order.order_type || 'service',
          status: order.status || 'pending',
          customerName: order.customerName || order.customer_name || '',
          vehicleVin: order.vehicleVin || order.vehicle_vin || '',
          vehicleYear: order.vehicleYear?.toString() || order.vehicle_year?.toString() || '',
          vehicleMake: order.vehicleMake || order.vehicle_make || '',
          vehicleModel: order.vehicleModel || order.vehicle_model || '',
          vehicleInfo: order.vehicleInfo || order.vehicle_info || '',
          po: order.po || '',
          ro: order.ro || '',
          tag: order.tag || '',
          assignedGroupId: order.assignedGroupId || order.assigned_group_id || '',
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
        setSelectedDealership(order.dealerId?.toString() || '');
      } else {
        // Reset form for new order
        setFormData({
          orderNumber: '',
          orderType: 'service',
          status: 'pending',
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
          assignedGroupId: '',
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

  // Set selectedAssignedTo when assignedUsers are loaded and order exists (similar to Sales modal)
  useEffect(() => {
    if (assignedUsers.length > 0 && order && selectedAssignedTo === '') {
      // Find the user that matches the order's assignment
      let matchingUser = null;

      // Try to find by ID first (most reliable)
      const assignedId = order.assigned_group_id || order.assignedGroupId;
      if (assignedId) {
        matchingUser = assignedUsers.find(user => user.id === assignedId);
        console.log('🔧 Searching by ID:', assignedId, 'found:', matchingUser?.name);
      }

      // Fallback to name search
      if (!matchingUser && order.assignedTo && order.assignedTo !== 'Unassigned') {
        matchingUser = assignedUsers.find(user => user.name === order.assignedTo);
        console.log('🔧 Searching by name:', order.assignedTo, 'found:', matchingUser?.name);
      }

      if (matchingUser) {
        console.log('🔧 Setting assigned user AFTER users loaded:', matchingUser.id);
        setSelectedAssignedTo(matchingUser.id);
      } else {
        console.warn('⚠️ Could not find assigned user:', order.assignedTo);
      }
    }
  }, [assignedUsers.length, order, selectedAssignedTo]);

  // Set dealership from global filter for new orders
  useEffect(() => {
    if (!order && isGlobalFilterActive && dealerships.length > 0 && !selectedDealership) {
      console.log('🎯 Service Orders: Setting dealership from global filter:', globalDealerFilter);
      handleDealershipChange(globalDealerFilter);
    }
  }, [order, isGlobalFilterActive, globalDealerFilter, dealerships.length, selectedDealership]);

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
          .eq('dealership_id', parseInt(dealershipId)),
        supabase
          .rpc('get_dealer_services_by_department', {
            p_dealer_id: parseInt(dealershipId),
            p_department_name: 'Service Dept'
          })
      ]);

      if (usersResult.data) {
        setAssignedUsers(usersResult.data.map((membership: any) => ({
          id: membership.profiles.id,
          name: `${membership.profiles.first_name} ${membership.profiles.last_name}`.trim(),
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

  const handleAssignedToChange = (userId: string) => {
    setSelectedAssignedTo(userId);
    // Update assignment in form data using assigned_group_id (same as Sales)
    setFormData(prev => ({
      ...prev,
      assignedGroupId: userId
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
    vehicle_vin: formData.vehicleVin || null,
    vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
    vehicle_make: formData.vehicleMake || null,
    vehicle_model: formData.vehicleModel || null,
    vehicle_info: formData.vehicleInfo || null,
    po: formData.po || null,
    ro: formData.ro || null,
    tag: formData.tag || null,
    order_type: formData.orderType,
    status: formData.status,
    assigned_group_id: formData.assignedGroupId || null,
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
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="dealership">{t('sales_orders.dealership')}</Label>
                      {isDealerFieldReadOnly && (
                        <Badge variant="secondary" className="text-xs">
                          {t('dealerships.auto_selected')}
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={selectedDealership}
                      onValueChange={handleDealershipChange}
                      disabled={loading || isDealerFieldReadOnly}
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
                     <Label htmlFor="assignedTo">{t('sales_orders.assigned_to')}</Label>
                      <Select
                        value={selectedAssignedTo || ""}
                        onValueChange={handleAssignedToChange} 
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
                         {assignedUsers.map((user: any) => (
                           <SelectItem key={user.id} value={user.id}>
                             {user.name} - {user.email}
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
                         enforceBusinessRules={!isEditing}
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

            {/* Hidden fields with default values for later editing in order details */}
            <div className="hidden">
              <input type="hidden" name="salesperson" value={formData.salesperson || ''} />
              <input type="hidden" name="internal_notes" value={formData.internalNotes || ''} />
              <input type="hidden" name="sla_deadline" value={formData.slaDeadline ? formData.slaDeadline.toISOString() : ''} />
              <input type="hidden" name="scheduled_date" value={formData.scheduledDate ? formData.scheduledDate.toISOString() : ''} />
              <input type="hidden" name="scheduled_time" value={formData.scheduledTime || ''} />
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