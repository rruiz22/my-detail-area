import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileStack, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkItemTemplates, useCreateWorkItemsFromSelectedTemplates } from '@/hooks/useWorkItemTemplates';

interface AddFromTemplatesModalProps {
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFromTemplatesModal({ vehicleId, open, onOpenChange }: AddFromTemplatesModalProps) {
  const { t } = useTranslation();
  const { data: templates = [], isLoading } = useWorkItemTemplates(false);
  const createFromTemplates = useCreateWorkItemsFromSelectedTemplates();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplateIds.length === templates.length) {
      setSelectedTemplateIds([]);
    } else {
      setSelectedTemplateIds(templates.map((t) => t.id));
    }
  };

  const handleAddFromTemplates = async () => {
    if (selectedTemplateIds.length === 0) return;

    await createFromTemplates.mutateAsync({
      vehicleId,
      templateIds: selectedTemplateIds,
    });

    setSelectedTemplateIds([]);
    onOpenChange(false);
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: t('common.priority.low'), color: 'bg-gray-100 text-gray-800 border-gray-200' };
      case 2:
        return { label: t('common.priority.normal'), color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 3:
        return { label: t('common.priority.high'), color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: t('common.priority.normal'), color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            {t('get_ready.work_items.templates_modal_title')}
          </DialogTitle>
          <DialogDescription>{t('get_ready.work_items.templates_modal_description')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{t('get_ready.work_items.no_templates_available')}</p>
          </div>
        ) : (
          <>
            {/* Select All Toggle */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedTemplateIds.length === templates.length && templates.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium leading-none cursor-pointer select-none"
                >
                  {t('common.actions.select_all')} ({templates.length})
                </label>
              </div>
              {selectedTemplateIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedTemplateIds.length} {t('common.selected')}
                </Badge>
              )}
            </div>

            {/* Templates List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {templates.map((template) => {
                  const isSelected = selectedTemplateIds.includes(template.id);
                  const priorityInfo = getPriorityLabel(template.priority);

                  return (
                    <div
                      key={template.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50',
                        isSelected && 'border-primary bg-primary/5'
                      )}
                      onClick={() => handleToggleTemplate(template.id)}
                    >
                      <Checkbox
                        id={`template-${template.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleTemplate(template.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">{template.name}</div>

                        {template.description && (
                          <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {template.description}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {t(`get_ready.work_items.type.${template.work_type}`)}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs', priorityInfo.color)}>
                            {priorityInfo.label}
                          </Badge>

                          {template.estimated_cost > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>${template.estimated_cost.toFixed(2)}</span>
                            </div>
                          )}

                          {template.estimated_hours > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{template.estimated_hours}h</span>
                            </div>
                          )}

                          {template.approval_required && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              {t('get_ready.work_items.approval_required')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createFromTemplates.isPending}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            onClick={handleAddFromTemplates}
            disabled={selectedTemplateIds.length === 0 || createFromTemplates.isPending}
          >
            {createFromTemplates.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('get_ready.work_items.add_selected')} ({selectedTemplateIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
