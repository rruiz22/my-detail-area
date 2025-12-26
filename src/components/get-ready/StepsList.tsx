import { useGetReadySteps } from '@/hooks/useGetReady';
import { useStepManagement } from '@/hooks/useStepManagement';
import { useStepAssignments, StepAssignment } from '@/hooks/useStepAssignments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { AlertCircle, Clock, DollarSign, Edit2, Flag, Layers, Plus, TimerOff, Trash2, GripVertical, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { StepFormModal } from './StepFormModal';
import { GetReadyStep } from '@/types/getReady';
import { AVAILABLE_ICONS } from './IconPicker';
import React, { useState, useMemo } from 'react';
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
  // Get all step assignments (without stepId filter to get all)
  const { assignments: allAssignments, isLoading: isLoadingAssignments } = useStepAssignments();

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

  // Group assignments by step_id for easy lookup
  const assignmentsByStep = useMemo(() => {
    const map = new Map<string, StepAssignment[]>();
    allAssignments.forEach(assignment => {
      const existing = map.get(assignment.step_id) || [];
      map.set(assignment.step_id, [...existing, assignment]);
    });
    return map;
  }, [allAssignments]);

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
            {localSteps.map((step, index) => (
              <SortableStepCard
                key={step.id}
                step={step}
                stepNumber={index + 1}
                assignments={assignmentsByStep.get(step.id) || []}
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
  stepNumber: number;
  assignments: StepAssignment[];
  onEdit: (step: GetReadyStep) => void;
  onDelete: (step: GetReadyStep) => void;
}

function SortableStepCard({ step, stepNumber, assignments, onEdit, onDelete }: SortableStepCardProps) {
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

  // Handle double click to edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons or drag handle
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    onEdit(step);
  };

  // Get initials for avatar
  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
  };

  return (
    <TooltipProvider>
    <Card
      ref={setNodeRef}
      style={style}
        className={`border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer ${step.is_last_step ? 'ring-2 ring-amber-200 dark:ring-amber-800' : ''}`}
        onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
                data-drag-handle
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </div>

              {/* Step Number */}
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
                {stepNumber}
              </div>

            {/* Step Icon */}
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm relative"
              style={{ backgroundColor: step.color }}
            >
              {(() => {
                const iconOption = AVAILABLE_ICONS.find(i => i.name === step.icon);
                const Icon = iconOption ? iconOption.icon : Layers;
                return <Icon className="h-5 w-5" />;
              })()}
                {/* Last Step indicator on icon */}
                {step.is_last_step && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <Flag className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
            </div>

            {/* Step Name and Description */}
            <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {step.name}
              </CardTitle>
                </div>
              <CardDescription className="text-sm text-gray-500 mt-0.5">
                {step.description}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
              {/* Last Step Badge */}
              {step.is_last_step && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 gap-1 cursor-help">
                        <TimerOff className="h-3 w-3" />
                        {t('get_ready.step_list.timer_stops') || 'Timer Stops'}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('get_ready.step_list.timer_stops_tooltip') || 'Vehicles entering this step will stop counting days'}</p>
                  </TooltipContent>
                </Tooltip>
              )}

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
            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">SLA</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {step.sla_hours}h
              </p>
            </div>
          </div>

          {/* Cost per Day */}
          {step.cost_per_day > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Cost/Day</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  ${step.cost_per_day}
                </p>
              </div>
            </div>
          )}

          {/* Vehicle Count */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
            <Layers className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Vehicles</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {step.vehicle_count}
              </p>
              </div>
            </div>

            {/* Assigned Users */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">{t('get_ready.step_list.assigned_users') || 'Assigned'}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {assignments.length} {t('get_ready.step_list.users') || 'users'}
                </p>
              </div>
            </div>

            {/* Last Step indicator in metrics */}
            {step.is_last_step && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20">
                <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Status</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {t('get_ready.step_list.final_step') || 'Final Step'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Users Avatars */}
          {assignments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t('get_ready.step_list.team') || 'Team'}:
                </span>
                <div className="flex -space-x-2">
                  {assignments.slice(0, 5).map((assignment) => (
                    <Tooltip key={assignment.id}>
                      <TooltipTrigger asChild>
                        <span>
                          <Avatar className="h-7 w-7 border-2 border-white dark:border-gray-900">
                            <AvatarImage src={assignment.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(assignment.user?.first_name, assignment.user?.last_name, assignment.user?.email)}
                            </AvatarFallback>
                          </Avatar>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {assignment.user?.first_name && assignment.user?.last_name
                            ? `${assignment.user.first_name} ${assignment.user.last_name}`
                            : assignment.user?.email || 'Unknown User'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {assignments.length > 5 && (
                    <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-900">
                      +{assignments.length - 5}
                    </div>
                  )}
            </div>
          </div>
        </div>
          )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
