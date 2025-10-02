import { useGetReadySteps } from '@/hooks/useGetReady';
import { useStepManagement } from '@/hooks/useStepManagement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Clock, DollarSign, Edit2, Layers, Plus, Trash2, TrendingUp, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StepFormModal } from './StepFormModal';
import { GetReadyStep } from '@/types/getReady';
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function StepsList() {
  const { t } = useTranslation();
  const { data: steps, isLoading, error } = useGetReadySteps();
  const { deleteStep, reorderSteps, isDeleting } = useStepManagement();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<GetReadyStep | null>(null);
  const [stepToDelete, setStepToDelete] = useState<GetReadyStep | null>(null);
  const [localSteps, setLocalSteps] = useState<GetReadyStep[]>([]);

  // Sync local steps with data from server
  React.useEffect(() => {
    if (steps) {
      setLocalSteps(steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index));
    }
  }, [steps]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localSteps.findIndex(s => s.id === active.id);
      const newIndex = localSteps.findIndex(s => s.id === over.id);

      const reorderedSteps = arrayMove(localSteps, oldIndex, newIndex);

      // Update local state immediately for smooth UX
      setLocalSteps(reorderedSteps);

      // Update order_index values and save to database
      const updates = reorderedSteps.map((step, index) => ({
        id: step.id,
        order_index: index + 1,
      }));

      reorderSteps(updates);
    }
  };

  const handleAddStep = () => {
    setSelectedStep(null);
    setIsModalOpen(true);
  };

  const handleEditStep = (step: GetReadyStep) => {
    setSelectedStep(step);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (step: GetReadyStep) => {
    setStepToDelete(step);
  };

  const confirmDelete = () => {
    if (stepToDelete) {
      deleteStep(stepToDelete.id);
      setStepToDelete(null);
    }
  };

  const nextOrderIndex = steps ? Math.max(...steps.map(s => s.order_index)) + 1 : 1;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">
              {t('messages.error.generic')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-8 text-center">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {t('get_ready.setup.no_steps_title')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('get_ready.setup.no_steps_description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Add Step Button */}
      <div className="mb-4">
        <Button onClick={handleAddStep} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t('get_ready.setup.add_step')}
        </Button>
      </div>

      {/* Steps List with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localSteps.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localSteps.map((step) => (
              <SortableStepCard
                key={step.id}
                step={step}
                onEdit={handleEditStep}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Step Form Modal */}
      <StepFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        step={selectedStep}
        nextOrderIndex={nextOrderIndex}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('get_ready.setup.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('get_ready.setup.delete_confirm_message', { stepName: stepToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('common.action_buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t('common.status.loading') : t('common.action_buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Sortable Step Card Component
interface SortableStepCardProps {
  step: GetReadyStep;
  onEdit: (step: GetReadyStep) => void;
  onDelete: (step: GetReadyStep) => void;
}

function SortableStepCard({ step, onEdit, onDelete }: SortableStepCardProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="border-gray-200 hover:border-gray-300 transition-colors"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </div>

            {/* Step Number Badge */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm"
              style={{ backgroundColor: step.color }}
            >
              {step.order_index}
            </div>

            {/* Step Name and Description */}
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                {step.name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-0.5">
                {step.description}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Default Badge */}
            {step.is_default && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                Default
              </Badge>
            )}

            {/* Action Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(step)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(step)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* SLA Hours */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">SLA</p>
              <p className="text-sm font-semibold text-gray-900">
                {step.sla_hours}h
              </p>
            </div>
          </div>

          {/* Cost per Day */}
          {step.cost_per_day > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Cost/Day</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${step.cost_per_day}
                </p>
              </div>
            </div>
          )}

          {/* Vehicle Count */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
            <Layers className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Vehicles</p>
              <p className="text-sm font-semibold text-gray-900">
                {step.vehicle_count}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}