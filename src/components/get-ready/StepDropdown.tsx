import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Step {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

interface StepDropdownProps {
  currentStepId: string;
  currentStepName: string;
  steps: Step[];
  isMoving?: boolean;
  onStepChange: (newStepId: string) => void;
  onAdvanceStep?: () => void;
  variant?: 'table' | 'badge';
  className?: string;
}

/**
 * StepDropdown - Reusable step selector dropdown
 *
 * Used in:
 * - GetReadyVehicleList (table/kanban views)
 * - VehicleDetailPanel (header badge)
 *
 * Allows changing vehicle step with:
 * - Full dropdown menu with all steps
 * - Optional quick advance button (→)
 * - Visual color indicators
 * - Check mark for current step
 */
export function StepDropdown({
  currentStepId,
  currentStepName,
  steps,
  isMoving = false,
  onStepChange,
  onAdvanceStep,
  variant = 'table',
  className = ''
}: StepDropdownProps) {
  const { t } = useTranslation();

  const availableSteps = steps
    .filter(s => s.id !== 'all')
    .sort((a, b) => a.order_index - b.order_index);

  const currentStep = steps.find(s => s.id === currentStepId);
  const currentStepIndex = availableSteps.findIndex(s => s.id === currentStepId);
  const isLastStep = currentStepIndex >= availableSteps.length - 1;

  // Table variant - compact button with color dot
  if (variant === 'table') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-0.5 px-1 text-xs hover:bg-accent justify-start flex-1"
              disabled={isMoving}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentStep?.color }}
                />
                <span className="font-medium truncate">{currentStepName}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{t('get_ready.actions.change_step')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableSteps.map((step) => (
              <DropdownMenuItem
                key={step.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onStepChange(step.id);
                }}
                disabled={step.id === currentStepId}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: step.color }}
                  />
                  <span className="flex-1">{step.name}</span>
                  {step.id === currentStepId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick advance to next step button */}
        {onAdvanceStep && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAdvanceStep();
            }}
            disabled={isMoving || isLastStep}
            title={t('get_ready.actions.advance_step')}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Badge variant - styled badge with border color (for DetailPanel)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 font-semibold ${className}`}
          style={{
            borderColor: currentStep?.color || '#6B7280',
            color: currentStep?.color || '#6B7280',
            borderWidth: '2px'
          }}
          disabled={isMoving}
        >
          {currentStepName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t('get_ready.actions.change_step')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableSteps.map((step) => (
          <DropdownMenuItem
            key={step.id}
            onClick={(e) => {
              e.stopPropagation();
              onStepChange(step.id);
            }}
            disabled={step.id === currentStepId}
          >
            <div className="flex items-center gap-2 w-full">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: step.color }}
              />
              <span className="flex-1">{step.name}</span>
              {step.id === currentStepId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
