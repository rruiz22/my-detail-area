import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useGetReadySteps } from '@/hooks/useGetReady';
import type { WorkItemType } from '@/hooks/useVehicleWorkItems';
import {
    useCreateTemplate,
    useDeleteTemplate,
    useToggleTemplateActive,
    useToggleTemplateAutoAssign,
    useUpdateTemplate,
    useWorkItemTemplates,
    type CreateTemplateInput,
    type WorkItemTemplate
} from '@/hooks/useWorkItemTemplates';
import {
    CheckCircle2,
    Circle,
    Edit2,
    GripVertical,
    Plus,
    Settings,
    Trash2
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const WORK_TYPES: { value: WorkItemType; label: string }[] = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'body_repair', label: 'Body Repair' },
  { value: 'detailing', label: 'Detailing' },
  { value: 'safety_inspection', label: 'Safety Inspection' },
  { value: 'reconditioning', label: 'Reconditioning' },
  { value: 'parts_ordering', label: 'Parts Ordering' },
  { value: 'other', label: 'Other' },
];

export function WorkItemTemplatesManager() {
  console.log('📋 [WorkItemTemplatesManager] Component RENDERED');
  const { t } = useTranslation();
  const { data: templates = [], isLoading } = useWorkItemTemplates(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkItemTemplate | null>(null);

  const activeTemplates = templates.filter(t => t.is_active);
  const inactiveTemplates = templates.filter(t => !t.is_active);

  const handleEdit = (template: WorkItemTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('get_ready.templates.title')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('get_ready.templates.subtitle')}
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('get_ready.templates.add_template')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('get_ready.templates.preview')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {activeTemplates.filter(t => t.auto_assign).length} {t('get_ready.templates.preview_desc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('get_ready.templates.active_templates')}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm mb-2">{t('get_ready.templates.no_templates')}</p>
              <p className="text-xs">{t('get_ready.templates.create_first')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index + 1}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Templates */}
      {inactiveTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('get_ready.templates.inactive_templates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactiveTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index + 1}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      {showForm && (
        <TemplateFormDialog
          open={showForm}
          onOpenChange={handleCloseForm}
          template={editingTemplate}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: WorkItemTemplate;
  index: number;
  onEdit: (template: WorkItemTemplate) => void;
}

function TemplateCard({ template, index, onEdit }: TemplateCardProps) {
  const { t } = useTranslation();
  const toggleAutoAssign = useToggleTemplateAutoAssign();
  const toggleActive = useToggleTemplateActive();
  const deleteTemplate = useDeleteTemplate();

  const workTypeLabel = WORK_TYPES.find(wt => wt.value === template.work_type)?.label || template.work_type;

  const handleToggleAutoAssign = (checked: boolean) => {
    toggleAutoAssign.mutate({ templateId: template.id, autoAssign: checked });
  };

  const handleToggleActive = (checked: boolean) => {
    toggleActive.mutate({ templateId: template.id, isActive: checked });
  };

  const handleDelete = () => {
    if (confirm(t('get_ready.templates.confirm_delete'))) {
      deleteTemplate.mutate(template.id);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{template.name}</span>
            <Badge variant="outline" className="text-xs">
              {workTypeLabel}
            </Badge>
            {template.auto_assign && (
              <Badge variant="secondary" className="text-xs">
                Auto
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {template.estimated_hours > 0 && (
              <span>{template.estimated_hours}h</span>
            )}
            {template.estimated_cost > 0 && (
              <span>${template.estimated_cost.toLocaleString()}</span>
            )}
            <span>Priority: {template.priority}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`auto-${template.id}`} className="text-xs cursor-pointer">
            {t('get_ready.templates.auto_assign')}
          </Label>
          <Switch
            id={`auto-${template.id}`}
            checked={template.auto_assign}
            onCheckedChange={handleToggleAutoAssign}
            disabled={!template.is_active}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${template.id}`} className="text-xs cursor-pointer">
            Active
          </Label>
          <Switch
            id={`active-${template.id}`}
            checked={template.is_active}
            onCheckedChange={handleToggleActive}
          />
        </div>

        <Button variant="ghost" size="icon" onClick={() => onEdit(template)}>
          <Edit2 className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkItemTemplate | null;
}

function TemplateFormDialog({ open, onOpenChange, template }: TemplateFormDialogProps) {
  const { t } = useTranslation();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: steps = [] } = useGetReadySteps();
  const isEditMode = !!template;

  const [formData, setFormData] = useState<CreateTemplateInput & { step_id?: string | null }>({
    name: template?.name || '',
    description: template?.description || '',
    work_type: template?.work_type || 'detailing',
    priority: template?.priority || 2,
    estimated_cost: template?.estimated_cost || 0,
    estimated_hours: template?.estimated_hours || 0,
    approval_required: template?.approval_required || false,
    auto_assign: template?.auto_assign !== undefined ? template.auto_assign : true,
    order_index: template?.order_index || 0,
    step_id: (template as any)?.step_id || null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && template) {
      updateTemplate.mutate({ id: template.id, ...formData }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createTemplate.mutate(formData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const updateField = (field: keyof CreateTemplateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? t('get_ready.templates.edit_template') : t('get_ready.templates.add_template')}
            </DialogTitle>
            <DialogDescription>
              {t('get_ready.templates.template_form_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('get_ready.work_items.title')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={t('get_ready.work_items.title_placeholder')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work_type">{t('get_ready.work_items.work_type')} *</Label>
                <Select value={formData.work_type} onValueChange={(value) => updateField('work_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="step_id">{t('get_ready.templates.associated_step')}</Label>
                <Select
                  value={formData.step_id || 'none'}
                  onValueChange={(value) => updateField('step_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('get_ready.templates.select_step')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('get_ready.templates.global_template')}
                    </SelectItem>
                    {steps.filter(s => s.id !== 'all').map((step) => (
                      <SelectItem key={step.id} value={step.id}>
                        {step.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('get_ready.templates.step_association_help')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('get_ready.work_items.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t('get_ready.work_items.description_placeholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">{t('get_ready.work_items.priority')}</Label>
                <Select value={formData.priority.toString()} onValueChange={(value) => updateField('priority', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Normal</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_hours">{t('get_ready.work_items.estimated_hours')}</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => updateField('estimated_hours', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_cost">{t('get_ready.work_items.estimated_cost')}</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_cost}
                  onChange={(e) => updateField('estimated_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto_assign"
                  checked={formData.auto_assign}
                  onCheckedChange={(checked) => updateField('auto_assign', checked)}
                />
                <Label htmlFor="auto_assign" className="cursor-pointer">
                  {t('get_ready.templates.auto_assign')}
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    {t('get_ready.templates.auto_assign_desc')}
                  </p>
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="approval_required"
                  checked={formData.approval_required}
                  onCheckedChange={(checked) => updateField('approval_required', checked)}
                />
                <Label htmlFor="approval_required" className="cursor-pointer">
                  {t('get_ready.work_items.approval_required')}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.action_buttons.cancel')}
            </Button>
            <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
              {createTemplate.isPending || updateTemplate.isPending ? t('common.loading') : t('common.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
