import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { 
  UserPlus, 
  Mail, 
  Building2, 
  Shield, 
  User, 
  Key,
  Check,
  AlertTriangle 
} from 'lucide-react';

interface DirectUserCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Dealership {
  id: number;
  name: string;
  status: string;
}

export function DirectUserCreationModal({ open, onClose, onSuccess }: DirectUserCreationModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    dealershipId: '',
    userType: 'dealer' as 'dealer' | 'detail',
    role: '',
    sendWelcomeEmail: true
  });
  
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form

  const availableRoles = [
    { id: 'dealer_user', name: t('roles.basic_user'), description: t('roles.basic_user_desc') },
    { id: 'dealer_salesperson', name: t('roles.salesperson'), description: t('roles.salesperson_desc') },
    { id: 'dealer_service_advisor', name: t('roles.service_advisor'), description: t('roles.service_advisor_desc') },
    { id: 'dealer_sales_manager', name: t('roles.sales_manager'), description: t('roles.sales_manager_desc') },
    { id: 'dealer_service_manager', name: t('roles.service_manager'), description: t('roles.service_manager_desc') },
    { id: 'dealer_manager', name: t('roles.general_manager'), description: t('roles.general_manager_desc') },
    { id: 'dealer_admin', name: t('roles.dealership_admin'), description: t('roles.dealership_admin_desc') }
  ];

  useEffect(() => {
    if (open) {
      fetchDealerships();
      setStep(1);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        dealershipId: '',
        userType: 'dealer',
        role: '',
        sendWelcomeEmail: true
      });
    }
  }, [open]);

  const fetchDealerships = async () => {
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setDealerships(data || []);
    } catch (error: any) {
      console.error('Error fetching dealerships:', error);
      toast({
        title: 'Error',
        description: t('user_creation.failed_load_dealerships'),
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log('=== FRONTEND USER CREATION START ===');
      console.log('Form data:', formData);
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Session error:', sessionError);
      
      if (!session?.user) {
        throw new Error('You must be logged in to create users');
      }
      
      console.log('Authenticated user:', session.user.id, session.user.email);
      
      // Validate dealershipId before sending
      const dealershipIdNum = parseInt(formData.dealershipId);
      if (isNaN(dealershipIdNum) || dealershipIdNum <= 0) {
        throw new Error('Invalid dealership selection');
      }
      
      const requestPayload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dealershipId: dealershipIdNum,
        role: formData.role,
        userType: formData.userType,
        sendWelcomeEmail: formData.sendWelcomeEmail,
        dealershipName: dealerships.find(d => d.id === dealershipIdNum)?.name
      };
      
      console.log('Request payload to send:', JSON.stringify(requestPayload, null, 2));
      
      // Use the new Edge Function to properly create the user
      console.log('Invoking create-dealer-user function...');
      const { data, error } = await supabase.functions.invoke('create-dealer-user', {
        body: requestPayload
      });

      console.log('Function response - data:', data);
      console.log('Function response - error:', error);

      if (error) {
        console.error('=== SUPABASE FUNCTION ERROR ===');
        console.error('Error type:', typeof error);
        console.error('Error name:', error?.name);
        console.error('Error message:', error?.message);
        console.error('Error status:', error?.status);
        console.error('Error details:', error?.details);
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        throw error;
      }
      
      if (!data) {
        console.error('No data returned from function');
        throw new Error('No response data from server');
      }
      
      if (!data.success) {
        console.error('Function returned failure:', data);
        throw new Error(data.error || 'Server returned failure status');
      }

      console.log('✅ User created successfully:', data);

      toast({
        title: t('common.success'),
        description: t('user_creation.user_created_success', { name: `${formData.firstName} ${formData.lastName}` }),
      });

      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      console.error('=== FRONTEND ERROR HANDLING ===');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error status:', error?.status);
      console.error('Error context:', error?.context);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Extract meaningful error message
      let errorMessage = t('user_creation.failed_create_user');
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details?.error) {
        errorMessage = error.details.error;
      } else if (error?.context?.error) {
        errorMessage = error.context.error;
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return formData.email && formData.firstName && formData.lastName;
      case 2:
        return formData.dealershipId && formData.role;
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
{t('users.add_new')} - {t('user_creation.wizard_step', { step, total: 2 })}
          </DialogTitle>
          <DialogDescription>
{t('user_creation.create_direct_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  {t('user_creation.personal_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@company.com"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('auth.first_name')}</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">{t('auth.last_name')}</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
<Label htmlFor="userType">{t('user_creation.user_type')}</Label>
                  <Select value={formData.userType} onValueChange={(value: 'dealer' | 'detail') => 
                    setFormData(prev => ({ ...prev, userType: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
<SelectItem value="dealer">{t('user_creation.dealer_user')}</SelectItem>
<SelectItem value="detail">{t('user_creation.detail_user')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
{t('user_creation.dealer_user_desc')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
  {t('user_creation.dealership_assignment')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dealership">Dealership</Label>
                    <Select value={formData.dealershipId} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, dealershipId: value }))
                    }>
                      <SelectTrigger>
<SelectValue placeholder={t('user_creation.select_dealership')} />
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
  {t('user_creation.role_assignment')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
<Label htmlFor="role">{t('user_creation.initial_role')}</Label>
                    <Select value={formData.role} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }>
                      <SelectTrigger>
<SelectValue placeholder={t('user_creation.select_role')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div>
                              <p className="font-medium">{role.name}</p>
                              <p className="text-xs text-muted-foreground">{role.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (step === 1) {
                  onClose();
                } else {
                  setStep(step - 1);
                }
              }}
            >
              {step === 1 ? t('common.cancel') : t('common.back')}
            </Button>
            
            <Button
              onClick={() => {
                if (step === 1) {
                  setStep(2);
                } else {
                  handleSubmit();
                }
              }}
              disabled={!isStepValid(step) || loading}
            >
              {loading ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2 animate-spin" />
                  {t('user_creation.creating')}
                </>
              ) : step === 1 ? (
                t('common.next')
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('common.create')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}