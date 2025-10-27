import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateWorkItem, type CreateWorkItemInput } from '@/hooks/useVehicleWorkItems';
import { useWorkItemTemplates } from '@/hooks/useWorkItemTemplates';
import { cn } from '@/lib/utils';
import {
    Clock,
    DollarSign,
    Plus,
    Search,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface QuickAddWorkItemModalProps {
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCustom: () => void;
}

export function QuickAddWorkItemModal({
  vehicleId,
  open,
  onOpenChange,
  onCreateCustom,
}: QuickAddWorkItemModalProps) {
  const { t } = useTranslation();
  const { data: templates = [], isLoading } = useWorkItemTemplates();
  const createWorkItem = useCreateWorkItem();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates by search
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleSelectTemplate = async (template: typeof templates[0]) => {
    try {
      const workItemData: CreateWorkItemInput = {
        vehicle_id: vehicleId,
        title: template.name,
        description: template.description,
        work_type: template.work_type,
        priority: template.priority,
        estimated_cost: template.estimated_cost,
        estimated_hours: template.estimated_hours,
        approval_required: template.approval_required,
      };

      await createWorkItem.mutateAsync(workItemData);
      onOpenChange(false);
      setSearchQuery('');
    } catch (error) {
      // Error is already handled by the hook's onError callback
      // No need to do anything here, just prevent the modal from closing
    }
  };

  const handleCreateCustomClick = () => {
    onOpenChange(false);
    onCreateCustom();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('get_ready.work_items.quick_add_title')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.work_items.quick_add_description')}
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.actions.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Templates List */}
        <ScrollArea className="flex-1 px-6" style={{ maxHeight: 'calc(85vh - 240px)' }}>
          <div className="space-y-2 pb-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-sm">{t('common.loading')}</div>
              </div>
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 truncate">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {template.description}
                        </p>
                      )}

                      {/* Metadata badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">
                          {t(`get_ready.work_items.type.${template.work_type}`)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('text-xs capitalize', getPriorityLabel(template.priority).color)}
                        >
                          {getPriorityLabel(template.priority).label}
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

                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(template);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-sm">
                  {searchQuery
                    ? t('get_ready.work_items.no_templates_found')
                    : t('get_ready.work_items.no_templates')}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Create Custom Button */}
        <div className="p-6 pt-4 border-t bg-muted/20">
          <Button
            onClick={handleCreateCustomClick}
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('get_ready.work_items.create_custom')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
