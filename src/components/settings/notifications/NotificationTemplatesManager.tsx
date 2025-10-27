import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  MessageSquare,
  Bell,
  Plus,
  Edit,
  Trash2,
  Eye,
  Shield,
  Globe,
  Code
} from 'lucide-react';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface NotificationTemplate {
  id: string;
  dealer_id: number;
  template_name: string;
  template_type: 'order_status' | 'approval' | 'sla_alert' | 'custom';
  channel: 'email' | 'sms' | 'slack' | 'push' | 'all';
  language: 'en' | 'es' | 'pt-BR';
  subject: string | null;
  body: string;
  variables: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  template_name: string;
  template_type: 'order_status' | 'approval' | 'sla_alert' | 'custom';
  channel: 'email' | 'sms' | 'slack' | 'push' | 'all';
  language: 'en' | 'es' | 'pt-BR';
  subject: string;
  body: string;
  enabled: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const AVAILABLE_VARIABLES = [
  { key: '{{order_id}}', label: 'Order ID', sample: 'ORD-12345' },
  { key: '{{customer_name}}', label: 'Customer Name', sample: 'John Smith' },
  { key: '{{vehicle_vin}}', label: 'Vehicle VIN', sample: '1HGCM82633A123456' },
  { key: '{{vehicle_make}}', label: 'Vehicle Make', sample: 'Honda' },
  { key: '{{vehicle_model}}', label: 'Vehicle Model', sample: 'Accord' },
  { key: '{{vehicle_year}}', label: 'Vehicle Year', sample: '2023' },
  { key: '{{status}}', label: 'Status', sample: 'In Progress' },
  { key: '{{due_date}}', label: 'Due Date', sample: '2025-10-30' },
  { key: '{{assigned_to}}', label: 'Assigned To', sample: 'Jane Doe' },
  { key: '{{dealer_name}}', label: 'Dealer Name', sample: 'Premium Auto Group' },
  { key: '{{approval_amount}}', label: 'Approval Amount', sample: '$1,250.00' }
] as const;

const SAMPLE_DATA: Record<string, string> = {
  '{{order_id}}': 'ORD-12345',
  '{{customer_name}}': 'John Smith',
  '{{vehicle_vin}}': '1HGCM82633A123456',
  '{{vehicle_make}}': 'Honda',
  '{{vehicle_model}}': 'Accord',
  '{{vehicle_year}}': '2023',
  '{{status}}': 'In Progress',
  '{{due_date}}': '2025-10-30',
  '{{assigned_to}}': 'Jane Doe',
  '{{dealer_name}}': 'Premium Auto Group',
  '{{approval_amount}}': '$1,250.00'
};

// ============================================================================
// Main Component
// ============================================================================

export const NotificationTemplatesManager: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { enhancedUser, hasSystemPermission } = usePermissions();

  // ============================================================================
  // State Management
  // ============================================================================

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    template_name: '',
    template_type: 'order_status',
    channel: 'email',
    language: 'en',
    subject: '',
    body: '',
    enabled: true
  });
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  // ============================================================================
  // Permission Check
  // ============================================================================

  const canManageTemplates =
    enhancedUser?.is_system_admin ||
    hasSystemPermission('manage_settings');

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates', enhancedUser?.dealership_id],
    queryFn: async () => {
      if (!enhancedUser?.dealership_id) {
        throw new Error('No dealership ID found');
      }

      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('dealer_id', enhancedUser.dealership_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NotificationTemplate[];
    },
    enabled: !!enhancedUser?.dealership_id
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  const createTemplateMutation = useMutation({
    mutationFn: async (template: TemplateFormData) => {
      if (!enhancedUser?.dealership_id) {
        throw new Error('No dealership ID found');
      }

      // Extract variables used in body and subject
      const variables = extractVariables(template.body + ' ' + template.subject);

      const { error } = await supabase
        .from('notification_templates')
        .insert({
          dealer_id: enhancedUser.dealership_id,
          template_name: template.template_name,
          template_type: template.template_type,
          channel: template.channel,
          language: template.language,
          subject: template.channel === 'email' || template.channel === 'push' ? template.subject : null,
          body: template.body,
          variables,
          enabled: template.enabled
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({
        title: t('common.success'),
        description: t('settings.notifications.templates.created')
      });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Error creating template:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('settings.notifications.templates.create_error'),
        variant: 'destructive'
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: string; template: TemplateFormData }) => {
      const variables = extractVariables(template.body + ' ' + template.subject);

      const { error } = await supabase
        .from('notification_templates')
        .update({
          template_name: template.template_name,
          template_type: template.template_type,
          channel: template.channel,
          language: template.language,
          subject: template.channel === 'email' || template.channel === 'push' ? template.subject : null,
          body: template.body,
          variables,
          enabled: template.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({
        title: t('common.success'),
        description: t('settings.notifications.templates.updated')
      });
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Error updating template:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('settings.notifications.templates.update_error'),
        variant: 'destructive'
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({
        title: t('common.success'),
        description: t('settings.notifications.templates.deleted')
      });
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      console.error('Error deleting template:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('settings.notifications.templates.delete_error'),
        variant: 'destructive'
      });
    }
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('notification_templates')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: (error: Error) => {
      console.error('Error toggling template:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = text.match(regex) || [];
    return [...new Set(matches)]; // Remove duplicates
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(SAMPLE_DATA).forEach(([variable, value]) => {
      result = result.replaceAll(variable, value);
    });
    return result;
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      template_type: 'order_status',
      channel: 'email',
      language: 'en',
      subject: '',
      body: '',
      enabled: true
    });
    setCursorPosition(0);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      channel: template.channel,
      language: template.language,
      subject: template.subject || '',
      body: template.body,
      enabled: template.enabled
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const insertVariable = (variable: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      const newSubject =
        formData.subject.slice(0, cursorPosition) +
        variable +
        formData.subject.slice(cursorPosition);
      setFormData(prev => ({ ...prev, subject: newSubject }));
    } else {
      const textarea = document.querySelector('textarea[name="body"]') as HTMLTextAreaElement;
      const position = textarea?.selectionStart || 0;
      const newBody =
        formData.body.slice(0, position) +
        variable +
        formData.body.slice(position);
      setFormData(prev => ({ ...prev, body: newBody }));
    }
  };

  const handleSubmit = () => {
    if (!formData.template_name.trim()) {
      toast({
        title: t('common.error'),
        description: t('settings.notifications.templates.name_required'),
        variant: 'destructive'
      });
      return;
    }

    if (!formData.body.trim()) {
      toast({
        title: t('common.error'),
        description: t('settings.notifications.templates.body_required'),
        variant: 'destructive'
      });
      return;
    }

    if ((formData.channel === 'email' || formData.channel === 'push') && !formData.subject.trim()) {
      toast({
        title: t('common.error'),
        description: t('settings.notifications.templates.subject_required'),
        variant: 'destructive'
      });
      return;
    }

    if (isEditModalOpen && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, template: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  // ============================================================================
  // Channel Icon Helper
  // ============================================================================

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  // ============================================================================
  // Permission Guard
  // ============================================================================

  if (!canManageTemplates) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {t('settings.notifications.templates.access_denied')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Bell className="h-5 w-5 text-slate-700" />
                {t('settings.notifications.templates.title')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('settings.notifications.templates.description')}
              </CardDescription>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.notifications.templates.create')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Templates List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <Card className="card-enhanced col-span-full">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 mb-4">
                {t('settings.notifications.templates.no_templates')}
              </p>
              <Button
                onClick={handleOpenCreate}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.notifications.templates.create_first')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="card-enhanced hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold text-slate-900 mb-2">
                      {template.template_name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">
                        {getChannelIcon(template.channel)}
                        <span className="ml-1 capitalize">{template.channel}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">
                        <Globe className="h-3 w-3 mr-1" />
                        {template.language.toUpperCase()}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs border-slate-300 ${
                          template.template_type === 'order_status'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                            : template.template_type === 'approval'
                            ? 'text-amber-700 border-amber-300 bg-amber-50'
                            : template.template_type === 'sla_alert'
                            ? 'text-red-700 border-red-300 bg-red-50'
                            : 'text-slate-700'
                        }`}
                      >
                        {t(`settings.notifications.templates.types.${template.template_type}`)}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={template.enabled}
                    onCheckedChange={(enabled) =>
                      toggleEnabledMutation.mutate({ id: template.id, enabled })
                    }
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-3 border-t border-slate-200">
                <div className="space-y-3">
                  {template.subject && (
                    <div>
                      <Label className="text-xs text-slate-600">
                        {t('settings.notifications.templates.subject')}
                      </Label>
                      <p className="text-sm text-slate-900 mt-1 line-clamp-1">
                        {template.subject}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-600">
                      {t('settings.notifications.templates.body')}
                    </Label>
                    <p className="text-sm text-slate-700 mt-1 line-clamp-2">
                      {template.body}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(template)}
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {t('common.action_buttons.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDelete(template)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditModalOpen
                ? t('settings.notifications.templates.edit')
                : t('settings.notifications.templates.create')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.notifications.templates.form_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template_name">
                {t('settings.notifications.templates.template_name')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                placeholder={t('settings.notifications.templates.template_name_placeholder')}
                className="border-slate-300"
              />
            </div>

            {/* Type, Channel, Language */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_type">
                  {t('settings.notifications.templates.type')}
                </Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    template_type: value as TemplateFormData['template_type']
                  }))}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_status">
                      {t('settings.notifications.templates.types.order_status')}
                    </SelectItem>
                    <SelectItem value="approval">
                      {t('settings.notifications.templates.types.approval')}
                    </SelectItem>
                    <SelectItem value="sla_alert">
                      {t('settings.notifications.templates.types.sla_alert')}
                    </SelectItem>
                    <SelectItem value="custom">
                      {t('settings.notifications.templates.types.custom')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">
                  {t('settings.notifications.templates.channel')}
                </Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    channel: value as TemplateFormData['channel']
                  }))}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      {t('settings.notifications.templates.channels.email')}
                    </SelectItem>
                    <SelectItem value="sms">
                      {t('settings.notifications.templates.channels.sms')}
                    </SelectItem>
                    <SelectItem value="slack">
                      {t('settings.notifications.templates.channels.slack')}
                    </SelectItem>
                    <SelectItem value="push">
                      {t('settings.notifications.templates.channels.push')}
                    </SelectItem>
                    <SelectItem value="all">
                      {t('settings.notifications.templates.channels.all')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">
                  {t('settings.notifications.templates.language')}
                </Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    language: value as TemplateFormData['language']
                  }))}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject (email/push only) */}
            {(formData.channel === 'email' || formData.channel === 'push') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subject">
                    {t('settings.notifications.templates.subject')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="flex gap-1">
                    {AVAILABLE_VARIABLES.slice(0, 5).map((variable) => (
                      <Button
                        key={variable.key}
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => insertVariable(variable.key, 'subject')}
                        className="h-6 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title={`${t('settings.notifications.templates.insert_variable')}: ${variable.label}`}
                      >
                        <Code className="h-3 w-3 mr-1" />
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, subject: e.target.value }));
                    setCursorPosition(e.target.selectionStart || 0);
                  }}
                  placeholder={t('settings.notifications.templates.subject_placeholder')}
                  className="border-slate-300"
                />
              </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">
                  {t('settings.notifications.templates.body')}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
              </div>

              {/* Variable Buttons */}
              <div className="flex flex-wrap gap-1 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-xs text-slate-600 font-medium mr-2">
                  {t('settings.notifications.templates.available_variables')}:
                </span>
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.key}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => insertVariable(variable.key, 'body')}
                    className="h-7 px-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                    title={`${t('settings.notifications.templates.insert_variable')}: ${variable.label} (${variable.sample})`}
                  >
                    <Code className="h-3 w-3 mr-1" />
                    {variable.label}
                  </Button>
                ))}
              </div>

              <Textarea
                id="body"
                name="body"
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                placeholder={t('settings.notifications.templates.body_placeholder')}
                rows={8}
                className="border-slate-300 font-mono text-sm"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-600" />
                <Label className="text-slate-900 font-semibold">
                  {t('settings.notifications.templates.preview')}
                </Label>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                {formData.subject && (formData.channel === 'email' || formData.channel === 'push') && (
                  <div>
                    <span className="text-xs font-medium text-slate-600">
                      {t('settings.notifications.templates.subject')}:
                    </span>
                    <p className="text-sm text-slate-900 mt-1 font-semibold">
                      {replaceVariables(formData.subject)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-slate-600">
                    {t('settings.notifications.templates.body')}:
                  </span>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                    {replaceVariables(formData.body) || (
                      <span className="text-slate-400 italic">
                        {t('settings.notifications.templates.preview_empty')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md">
              <div>
                <Label className="text-slate-900 font-medium">
                  {t('settings.notifications.templates.enabled')}
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  {t('settings.notifications.templates.enabled_description')}
                </p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(enabled) => setFormData(prev => ({ ...prev, enabled }))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedTemplate(null);
                resetForm();
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {t('common.action_buttons.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {createTemplateMutation.isPending || updateTemplateMutation.isPending
                ? t('common.action_buttons.saving')
                : t('common.action_buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.notifications.templates.delete_confirm_title')}</DialogTitle>
            <DialogDescription>
              {t('settings.notifications.templates.delete_confirm_message', {
                name: selectedTemplate?.template_name
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedTemplate(null);
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {t('common.action_buttons.cancel')}
            </Button>
            <Button
              onClick={() => selectedTemplate && deleteTemplateMutation.mutate(selectedTemplate.id)}
              disabled={deleteTemplateMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteTemplateMutation.isPending
                ? t('common.action_buttons.deleting')
                : t('common.action_buttons.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
