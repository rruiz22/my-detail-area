import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStepManagement } from '@/hooks/useStepManagement';
import { useGetReadyUsers } from '@/hooks/useGetReadyUsers';
import { useStepAssignments } from '@/hooks/useStepAssignments';
import { GetReadyStep } from '@/types/getReady';
import { ChevronDown, Eye, Flag, Settings2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPicker, AVAILABLE_ICONS } from './IconPicker';
import { MultiUserSelect } from './MultiUserSelect';

interface StepFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step?: GetReadyStep | null;
  nextOrderIndex: number;
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
];

export function StepFormModal({ open, onOpenChange, step, nextOrderIndex }: StepFormModalProps) {
  const { t } = useTranslation();
  const { createStep, updateStep, isCreating, isUpdating } = useStepManagement();
  const { users, isLoading: isLoadingUsers } = useGetReadyUsers();
  const { assignments, isLoading: isLoadingAssignments, replaceAssignmentsAsync } = useStepAssignments(step?.id);

  const [formData, setFormData] = useState({
    name: step?.name || '',
    description: step?.description || '',
    color: step?.color || DEFAULT_COLORS[0],
    icon: step?.icon || 'circle',
    sla_hours: step?.sla_hours?.toString() || '24',
    cost_per_day: step?.cost_per_day?.toString() || '0',
    is_last_step: step?.is_last_step || false,
    // Sidebar display options
    show_sidebar_count: step?.show_sidebar_count ?? true,
    show_sidebar_breakdown: step?.show_sidebar_breakdown ?? true,
    // Advanced settings
    target_throughput: step?.target_throughput?.toString() || '5',
    bottleneck_threshold: step?.bottleneck_threshold?.toString() || '48',
    parallel_capable: step?.parallel_capable || false,
    express_lane_eligible: step?.express_lane_eligible || false,
  });

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update form data when step prop changes (for edit mode)
  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name || '',
        description: step.description || '',
        color: step.color || DEFAULT_COLORS[0],
        icon: step.icon || 'circle',
        sla_hours: step.sla_hours?.toString() || '24',
        cost_per_day: step.cost_per_day?.toString() || '0',
        is_last_step: step.is_last_step || false,
        show_sidebar_count: step.show_sidebar_count ?? true,
        show_sidebar_breakdown: step.show_sidebar_breakdown ?? true,
        target_throughput: step.target_throughput?.toString() || '5',
        bottleneck_threshold: step.bottleneck_threshold?.toString() || '48',
        parallel_capable: step.parallel_capable || false,
        express_lane_eligible: step.express_lane_eligible || false,
      });
      // Show advanced settings if any are non-default
      if (step.target_throughput !== 5 || step.bottleneck_threshold !== 48 ||
          step.parallel_capable || step.express_lane_eligible) {
        setShowAdvanced(true);
      }
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        color: DEFAULT_COLORS[0],
        icon: 'circle',
        sla_hours: '24',
        cost_per_day: '0',
        is_last_step: false,
        show_sidebar_count: true,
        show_sidebar_breakdown: true,
        target_throughput: '5',
        bottleneck_threshold: '48',
        parallel_capable: false,
        express_lane_eligible: false,
      });
      setSelectedUserIds([]);
      setShowAdvanced(false);
    }
    setErrors({});
  }, [step]);

  // Separate effect to load assigned users (only when assignments are loaded)
  useEffect(() => {
    if (step && assignments.length > 0 && !isLoadingAssignments) {
      setSelectedUserIds(assignments.map(a => a.user_id));
    }
  }, [step?.id, isLoadingAssignments]); // Only depend on step ID and loading state

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('get_ready.setup.form.errors.name_required');
    }

    if (!formData.sla_hours || parseInt(formData.sla_hours) < 0) {
      newErrors.sla_hours = t('get_ready.setup.form.errors.sla_required');
    }

    if (selectedUserIds.length === 0) {
      newErrors.assigned_users = t('get_ready.step_form.errors.users_required') || 'At least one user must be assigned';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      icon: formData.icon,
      sla_hours: parseInt(formData.sla_hours),
      cost_per_day: parseFloat(formData.cost_per_day) || 0,
      order_index: step?.order_index || nextOrderIndex,
      is_last_step: formData.is_last_step,
      show_sidebar_count: formData.show_sidebar_count,
      show_sidebar_breakdown: formData.show_sidebar_breakdown,
      target_throughput: parseInt(formData.target_throughput) || 5,
      bottleneck_threshold: parseInt(formData.bottleneck_threshold) || 48,
      parallel_capable: formData.parallel_capable,
      express_lane_eligible: formData.express_lane_eligible,
    };

    try {
      let stepId: string;

      if (step) {
        // Update existing step
        await updateStep({ id: step.id, ...data });
        stepId = step.id;
      } else {
        // Create new step - need to get the ID from the created step
        // Since createStep doesn't return the ID, we'll use the step name as ID
        // Note: In your useStepManagement, you might want to modify createStep to return the created step
        const createdStep = await createStep(data);
        // For now, we'll construct the ID based on the name (this matches your DB structure)
        stepId = formData.name.toLowerCase().replace(/\s+/g, '_');
      }

      // Update user assignments
      await replaceAssignmentsAsync({
        stepId: stepId,
        userIds: selectedUserIds,
        role: 'technician',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving step and assignments:', error);
      // Error toasts are handled by the mutations
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      icon: 'circle',
      sla_hours: '24',
      cost_per_day: '0',
      is_last_step: false,
      show_sidebar_count: true,
      show_sidebar_breakdown: true,
      target_throughput: '5',
      bottleneck_threshold: '48',
      parallel_capable: false,
      express_lane_eligible: false,
    });
    setSelectedUserIds([]);
    setErrors({});
    setShowAdvanced(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {/* Preview Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: formData.color }}
            >
              {(() => {
                const iconOption = AVAILABLE_ICONS.find(i => i.name === formData.icon);
                const IconComponent = iconOption ? iconOption.icon : Flag;
                return <IconComponent className="h-6 w-6" />;
              })()}
            </div>
            <div>
              <DialogTitle className="text-xl">
            {step ? t('get_ready.setup.form.title_edit') : t('get_ready.setup.form.title_create')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.setup.form.description')}
          </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} id="step-form" className="px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('get_ready.setup.form.fields.name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('get_ready.setup.form.placeholders.name')}
                    className={`h-11 ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('get_ready.setup.form.fields.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('get_ready.setup.form.placeholders.description')}
                    rows={2}
                    className="resize-none"
              />
            </div>
              </div>

              {/* Appearance Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Appearance
                </h3>

                <div className="grid grid-cols-2 gap-4">
            {/* Color Picker */}
            <div className="space-y-2">
              <Label>{t('get_ready.setup.form.fields.color')}</Label>
                    <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                          className={`w-9 h-9 rounded-lg transition-all hover:scale-110 ring-offset-2 ${
                            formData.color === color ? 'ring-2 ring-primary' : ''
                          }`}
                          style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <IconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
              label={t('get_ready.setup.form.fields.icon')}
            />
                </div>
              </div>

              {/* SLA & Costs Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  SLA & Costs
                </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* SLA Hours */}
              <div className="space-y-2">
                <Label htmlFor="sla_hours">
                  {t('get_ready.setup.form.fields.sla_hours')} <span className="text-red-500">*</span>
                </Label>
                    <div className="relative">
                <Input
                  id="sla_hours"
                  type="number"
                  min="0"
                  value={formData.sla_hours}
                  onChange={(e) => setFormData({ ...formData, sla_hours: e.target.value })}
                        className={`h-11 pr-16 ${errors.sla_hours ? 'border-red-500' : ''}`}
                />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        hours
                      </span>
                    </div>
                {errors.sla_hours && <p className="text-sm text-red-500">{errors.sla_hours}</p>}
            </div>

            {/* Cost per Day */}
            <div className="space-y-2">
              <Label htmlFor="cost_per_day">{t('get_ready.setup.form.fields.cost_per_day')}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
              <Input
                id="cost_per_day"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_per_day}
                onChange={(e) => setFormData({ ...formData, cost_per_day: e.target.value })}
                        className="h-11 pl-7"
              />
            </div>
                  </div>
                </div>
              </div>

              {/* Team Assignment Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Team Assignment
                </h3>

            <div className="space-y-2">
              <Label>
                    {t('get_ready.step_form.fields.assigned_users')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('get_ready.step_form.fields.assigned_users_description')}
              </p>
              <MultiUserSelect
                users={users}
                value={selectedUserIds}
                onChange={setSelectedUserIds}
                    placeholder={t('get_ready.step_form.select_users_placeholder')}
                disabled={isLoadingUsers || isLoading}
              />
              {errors.assigned_users && (
                <p className="text-sm text-red-500">{errors.assigned_users}</p>
              )}
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                      {t('get_ready.step_form.users_selected', { count: selectedUserIds.length })}
                </p>
              )}
            </div>
              </div>

              {/* Last Step Toggle - Timer Stops */}
              <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 p-4 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                      <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="is_last_step" className="text-sm font-semibold cursor-pointer">
                        {t('get_ready.step_form.fields.is_last_step')}
                      </Label>
                      <p className="text-xs text-muted-foreground max-w-[300px]">
                        {t('get_ready.step_form.fields.is_last_step_description')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="is_last_step"
                    checked={formData.is_last_step}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_last_step: checked })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>

              {/* Sidebar Display Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t('get_ready.step_form.sidebar_display') || 'Sidebar Display'}
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  {t('get_ready.step_form.sidebar_display_hint') || 'Control what information is displayed in the sidebar for this step'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Show Vehicle Count */}
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="show_sidebar_count" className="text-sm cursor-pointer">
                        {t('get_ready.step_form.fields.show_sidebar_count') || 'Show vehicle count'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('get_ready.step_form.fields.show_sidebar_count_hint') || 'Display total vehicles badge'}
                      </p>
                    </div>
                    <Switch
                      id="show_sidebar_count"
                      checked={formData.show_sidebar_count}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_sidebar_count: checked })}
                    />
                  </div>

                  {/* Show Day Breakdown */}
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="show_sidebar_breakdown" className="text-sm cursor-pointer">
                        {t('get_ready.step_form.fields.show_sidebar_breakdown') || 'Show day breakdown'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('get_ready.step_form.fields.show_sidebar_breakdown_hint') || 'Display Fresh/Normal/Critical'}
                      </p>
                    </div>
                    <Switch
                      id="show_sidebar_breakdown"
                      checked={formData.show_sidebar_breakdown}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_sidebar_breakdown: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings - Collapsible */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-between h-11"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      <span>{t('get_ready.step_form.advanced_settings')}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Target Throughput */}
                      <div className="space-y-2">
                        <Label htmlFor="target_throughput">
                          {t('get_ready.step_form.fields.target_throughput')}
                        </Label>
                        <Input
                          id="target_throughput"
                          type="number"
                          min="1"
                          value={formData.target_throughput}
                          onChange={(e) => setFormData({ ...formData, target_throughput: e.target.value })}
                          placeholder="5"
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('get_ready.step_form.fields.target_throughput_hint')}
                        </p>
                      </div>

                      {/* Bottleneck Threshold */}
                      <div className="space-y-2">
                        <Label htmlFor="bottleneck_threshold">
                          {t('get_ready.step_form.fields.bottleneck_threshold')}
                        </Label>
                        <Input
                          id="bottleneck_threshold"
                          type="number"
                          min="1"
                          value={formData.bottleneck_threshold}
                          onChange={(e) => setFormData({ ...formData, bottleneck_threshold: e.target.value })}
                          placeholder="48"
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('get_ready.step_form.fields.bottleneck_threshold_hint')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Parallel Capable */}
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="parallel_capable" className="text-sm cursor-pointer">
                            {t('get_ready.step_form.fields.parallel_capable')}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t('get_ready.step_form.fields.parallel_capable_hint')}
                          </p>
                        </div>
                        <Switch
                          id="parallel_capable"
                          checked={formData.parallel_capable}
                          onCheckedChange={(checked) => setFormData({ ...formData, parallel_capable: checked })}
                        />
                      </div>

                      {/* Express Lane Eligible */}
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="express_lane_eligible" className="text-sm cursor-pointer">
                            {t('get_ready.step_form.fields.express_lane_eligible')}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t('get_ready.step_form.fields.express_lane_eligible_hint')}
                          </p>
                        </div>
                        <Switch
                          id="express_lane_eligible"
                          checked={formData.express_lane_eligible}
                          onCheckedChange={(checked) => setFormData({ ...formData, express_lane_eligible: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
          </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {t('common.action_buttons.cancel')}
          </Button>
          <Button
            type="submit"
            form="step-form"
            disabled={isLoading}
            className="min-w-[100px]"
            style={{ backgroundColor: formData.color }}
          >
            {isLoading
              ? t('common.status.loading')
              : step
                ? t('common.action_buttons.update')
                : t('common.action_buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
