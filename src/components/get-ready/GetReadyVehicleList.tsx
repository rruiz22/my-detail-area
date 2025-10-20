import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetReady } from '@/hooks/useGetReady';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useGetReadyVehiclesInfinite } from '@/hooks/useGetReadyVehicles';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';
import { useGetReadyViewMode } from '@/hooks/useGetReadyPersistence';
import { cn } from '@/lib/utils';
import { formatTimeForTable } from '@/utils/timeFormatUtils';
import {
    AlertTriangle,
    Car,
    Check,
    CheckCircle,
    ChevronRight,
    ClipboardList,
    Clock,
    Edit,
    Eye,
    FileText,
    Image,
    Loader2,
    MoreHorizontal,
    Trash2,
    User,
    XCircle
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GetReadyVehicleListProps {
  searchQuery: string;
  selectedStep: string;
  selectedWorkflow: string;
  selectedPriority: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  className?: string;
  onEditVehicle?: (vehicleId: string) => void;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
}

export function GetReadyVehicleList({
  searchQuery,
  selectedStep,
  selectedWorkflow,
  selectedPriority,
  sortBy,
  sortOrder,
  className,
  onEditVehicle,
  onDeleteVehicle
}: GetReadyVehicleListProps) {
  const { t } = useTranslation();
  const { steps } = useGetReady();
  const { setSelectedVehicleId, selectedVehicleId } = useGetReadyStore();
  const [viewMode, setViewMode] = useGetReadyViewMode(); // WITH LOCALSTORAGE PERSISTENCE
  const { confirmDelete } = useSweetAlert();

  // Get vehicle management functions
  const { moveVehicle, isMoving } = useVehicleManagement();

  // Action handlers
  const handleViewDetails = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleEditVehicle = (vehicleId: string) => {
    // Call parent component's edit handler if provided
    if (onEditVehicle) {
      onEditVehicle(vehicleId);
    } else {
      console.log('Edit vehicle:', vehicleId);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    // Ask for confirmation before deleting
    const confirmed = await confirmDelete();

    if (confirmed && onDeleteVehicle) {
      await onDeleteVehicle(vehicleId);
    }
  };

  const handleMoveToStep = (vehicleId: string, currentStepId: string, newStepId: string) => {
    // Prevent moving to the same step
    if (currentStepId === newStepId) {
      return;
    }

    // Move vehicle to new step
    moveVehicle({ vehicleId: vehicleId, stepId: newStepId });
  };

  const handleAdvanceStep = (vehicleId: string, currentStepId: string) => {
    // Find current step
    const availableSteps = steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index);
    const currentStepIndex = availableSteps.findIndex(s => s.id === currentStepId);

    if (currentStepIndex === -1) {
      console.error('Current step not found');
      return;
    }

    // Check if there's a next step
    if (currentStepIndex >= availableSteps.length - 1) {
      // Already at last step
      return;
    }

    // Get next step
    const nextStep = availableSteps[currentStepIndex + 1];
    handleMoveToStep(vehicleId, currentStepId, nextStep.id);
  };

  // Fetch real vehicles from Supabase with infinite scroll
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGetReadyVehiclesInfinite({
    searchQuery,
    selectedStep,
    selectedWorkflow,
    selectedPriority,
    sortBy,
    sortOrder
  });

  // Flatten pages into single array
  const vehicles = data?.pages.flatMap(page => page.vehicles) ?? [];

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getSLAStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'on_track':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getWorkflowColor = (workflow: string) => {
    switch (workflow) {
      case 'priority':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'express':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'standard':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get color for Time in Process based on step and time
  const getTimeInProcessColor = (stepId: string, daysInStep: number) => {
    // Green if in Front Line (ready step)
    if (stepId === 'ready' || stepId.toLowerCase().includes('front') || stepId.toLowerCase().includes('ready')) {
      return 'text-emerald-600 dark:text-emerald-400';
    }

    // Find step SLA hours
    const step = steps.find(s => s.id === stepId);
    if (!step || !step.sla_hours) {
      return 'text-foreground';
    }

    const slaDays = step.sla_hours / 24;
    const percentage = daysInStep / slaDays;

    // Color based on SLA percentage
    if (percentage >= 1.0) {
      return 'text-red-600 dark:text-red-400 font-bold';
    } else if (percentage >= 0.7) {
      return 'text-amber-600 dark:text-amber-400';
    } else {
      return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-12", className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className={cn("space-y-4 flex flex-col h-full", className)}>
        {/* Header */}
        <div className="flex-none flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Vehicles ({vehicles.length})
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
          </div>
        </div>

        {/* Grid View with max 3 rows visible, then infinite scroll */}
        <div className="flex-1 overflow-auto p-1" style={{ maxHeight: 'calc(3 * 300px)' }}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {vehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className={cn(
                "hover:shadow-md transition-all cursor-pointer",
                selectedVehicleId === vehicle.id && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => handleViewDetails(vehicle.id)}
            >
              <CardHeader className="pb-2">
                {/* Vehicle Image */}
                <div className="mb-2">
                  <Avatar className="h-32 w-full rounded-md">
                    <AvatarImage
                      src={vehicle.images[0]}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-md">
                      <Car className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{vehicle.stock_number}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim && `(${vehicle.trim})`}
                    </p>
                    <p className="text-xs">
                      <span className="text-muted-foreground/60">L8V: </span>
                      <span className="font-mono text-sm font-semibold text-foreground">{vehicle.vin.slice(-8)}</span>
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isMoving}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('get_ready.actions.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(vehicle.id); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.view_details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditVehicle(vehicle.id); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.edit_vehicle')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(vehicle.id); }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.delete_vehicle')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {/* Status and Progress */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={cn("text-xs", getWorkflowColor(vehicle.workflow_type))}>
                    {t(`get_ready.workflow.${vehicle.workflow_type}`)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {getSLAStatusIcon(vehicle.sla_status)}
                    <span className="text-xs text-muted-foreground">
                      {vehicle.progress}%
                    </span>
                  </div>
                </div>

                <Progress value={vehicle.progress} className="h-1.5" />

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-muted-foreground">Step:</span>
                    <div className="flex items-center gap-1">
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
                                style={{ backgroundColor: steps.find(s => s.id === vehicle.step_id)?.color }}
                              />
                              <span className="font-medium truncate">{vehicle.step_name}</span>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>{t('get_ready.actions.change_step')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index).map((step) => (
                            <DropdownMenuItem
                              key={step.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToStep(vehicle.id, vehicle.step_id, step.id);
                              }}
                              disabled={step.id === vehicle.step_id}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: step.color }}
                                />
                                <span className="flex-1">{step.name}</span>
                                {step.id === vehicle.step_id && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Quick advance to next step button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvanceStep(vehicle.id, vehicle.step_id);
                        }}
                        disabled={isMoving || (() => {
                          const availableSteps = steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index);
                          const currentStepIndex = availableSteps.findIndex(s => s.id === vehicle.step_id);
                          return currentStepIndex >= availableSteps.length - 1;
                        })()}
                        title={t('get_ready.actions.advance_step')}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('get_ready.vehicle_list.t2l')}:</span>
                    <div className={cn(
                      "font-medium text-xs whitespace-nowrap",
                      getTimeInProcessColor(vehicle.step_id, parseInt(vehicle.days_in_step) || 0)
                    )}>
                      {formatTimeForTable(vehicle.t2l).primary}
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <span className="text-muted-foreground text-xs">{t('get_ready.steps.dis')}:</span>
                        <div className="font-medium text-xs whitespace-nowrap">{formatTimeForTable(vehicle.days_in_step).primary}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{t('get_ready.vehicle_list.days_in_step')}</p>
                      <p className="text-xs text-muted-foreground">{t('get_ready.steps.dis_tooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <div>
                    <span className="text-muted-foreground text-xs">Days to Frontline:</span>
                    <div className="font-medium text-xs whitespace-nowrap">{vehicle.days_to_frontline}</div>
                  </div>
                </div>

                {/* Assigned To */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t">
                  <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate flex-1">{vehicle.assigned_to}</span>
                  <Badge className={cn("text-xs capitalize", getPriorityColor(vehicle.priority))}>
                    {vehicle.priority}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Table View
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">
            Vehicles ({vehicles.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('get_ready.table.click_to_view')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="h-[320px] overflow-hidden">
        {/* Scrollable container */}
        <div className="h-full overflow-auto">
          <TooltipProvider>
            <Table data-sticky-header>
              <TableHeader className="sticky top-0 bg-background z-10 after:absolute after:inset-x-0 after:bottom-0 after:border-b">
                <TableRow className="h-9 hover:bg-transparent border-b-0">
                  <TableHead className="w-[70px] text-center py-2 bg-background">{t('get_ready.table.image')}</TableHead>
                  <TableHead className="w-[100px] text-center py-2 bg-background">{t('get_ready.table.stock')}</TableHead>
                  <TableHead className="w-[200px] text-center py-2 bg-background">{t('get_ready.table.vehicle')}</TableHead>
                  <TableHead className="w-[140px] text-center py-2 bg-background">{t('get_ready.table.step')}</TableHead>
                  <TableHead className="w-[110px] text-center py-2 bg-background">Workflow</TableHead>
                  <TableHead className="w-[80px] text-center py-2 bg-background">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{t('get_ready.vehicle_list.t2l_short')}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{t('get_ready.vehicle_list.t2l_full')}</p>
                        <p className="text-xs text-muted-foreground">{t('get_ready.vehicle_list.t2l_description')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[80px] text-center py-2 bg-background">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{t('get_ready.steps.dis')}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{t('get_ready.vehicle_list.days_in_step')}</p>
                        <p className="text-xs text-muted-foreground">{t('get_ready.steps.dis_tooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[100px] text-center py-2 bg-background">{t('get_ready.table.priority')}</TableHead>
                  <TableHead className="w-[150px] text-center py-2 bg-background">{t('get_ready.table.progress_time')}</TableHead>
                  <TableHead className="w-[100px] text-center py-2 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {vehicles.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        {t('get_ready.no_vehicles.title')}
                      </h3>
                      <p className="text-sm">
                        {t('get_ready.no_vehicles.description')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                {vehicles.map((vehicle) => (
                  <TableRow
                    key={vehicle.id}
                    onClick={() => handleViewDetails(vehicle.id)}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors h-12",
                      selectedVehicleId === vehicle.id && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                {/* Image */}
                <TableCell className="w-[70px] py-1 text-center">
                  <div className="flex justify-center">
                    <Avatar className="h-8 w-12 rounded-sm">
                      <AvatarImage src={vehicle.images[0]} alt={`${vehicle.make} ${vehicle.model}`} />
                      <AvatarFallback className="rounded-sm">
                        <Car className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TableCell>

                {/* Stock Number */}
                <TableCell className="w-[100px] py-1 text-center">
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">{vehicle.stock_number}</div>
                    {/* Compact badges with popovers */}
                    {((vehicle.media_count ?? 0) > 0 || (parseInt(vehicle.notes_preview || '0')) > 0 || (vehicle.work_item_counts && (vehicle.work_item_counts.pending + vehicle.work_item_counts.in_progress + vehicle.work_item_counts.completed) > 0)) && (
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* Media Badge */}
                        {(vehicle.media_count ?? 0) > 0 && (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span className="inline-flex">
                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-purple-100 text-purple-700 gap-0.5 cursor-pointer">
                                  <Image className="h-2 w-2" />
                                  {vehicle.media_count}
                                </Badge>
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Image className="h-3 w-3 text-purple-600" />
                                <span className="font-medium">Media:</span>
                                <span>{vehicle.media_count} {vehicle.media_count === 1 ? 'file' : 'files'}</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}

                        {/* Notes Badge */}
                        {(parseInt(vehicle.notes_preview || '0')) > 0 && (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span className="inline-flex">
                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-blue-100 text-blue-700 gap-0.5 cursor-pointer">
                                  <FileText className="h-2 w-2" />
                                  {vehicle.notes_preview}
                                </Badge>
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-blue-600" />
                                <span className="font-medium">Notes:</span>
                                <span>{vehicle.notes_preview} {parseInt(vehicle.notes_preview) === 1 ? 'note' : 'notes'}</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}

                        {/* Work Items - Pending */}
                        {vehicle.work_item_counts && vehicle.work_item_counts.pending > 0 && (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span className="inline-flex">
                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-amber-100 text-amber-700 gap-0.5 cursor-pointer">
                                  <AlertTriangle className="h-2 w-2" />
                                  {vehicle.work_item_counts.pending}
                                </Badge>
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                <span className="font-medium">Pending:</span>
                                <span>{vehicle.work_item_counts.pending} {vehicle.work_item_counts.pending === 1 ? 'item' : 'items'}</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}

                        {/* Work Items - In Progress */}
                        {vehicle.work_item_counts && vehicle.work_item_counts.in_progress > 0 && (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span className="inline-flex">
                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-sky-100 text-sky-700 gap-0.5 cursor-pointer">
                                  <Clock className="h-2 w-2" />
                                  {vehicle.work_item_counts.in_progress}
                                </Badge>
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-sky-600" />
                                <span className="font-medium">In Progress:</span>
                                <span>{vehicle.work_item_counts.in_progress} {vehicle.work_item_counts.in_progress === 1 ? 'item' : 'items'}</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}

                        {/* Work Items - Completed */}
                        {vehicle.work_item_counts && vehicle.work_item_counts.completed > 0 && (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span className="inline-flex">
                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-emerald-100 text-emerald-700 gap-0.5 cursor-pointer">
                                  <CheckCircle className="h-2 w-2" />
                                  {vehicle.work_item_counts.completed}
                                </Badge>
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-auto p-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                <span className="font-medium">Completed:</span>
                                <span>{vehicle.work_item_counts.completed} {vehicle.work_item_counts.completed === 1 ? 'item' : 'items'}</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Vehicle Info */}
                <TableCell className="w-[200px] py-1 text-center">
                  <div className="space-y-0">
                    <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-sm">
                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim && `(${vehicle.trim})`}
                    </div>
                    <div className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="text-muted-foreground/60">L8V: </span>
                      <span className="font-mono text-sm font-semibold text-foreground">{vehicle.vin.slice(-8)}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Step */}
                <TableCell className="w-[140px] py-1 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 py-0.5 px-2 hover:bg-accent text-xs"
                          disabled={isMoving}
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: steps.find(s => s.id === vehicle.step_id)?.color }}
                            />
                            <span>{vehicle.step_name}</span>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>{t('get_ready.actions.change_step')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index).map((step) => (
                          <DropdownMenuItem
                            key={step.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToStep(vehicle.id, vehicle.step_id, step.id);
                            }}
                            disabled={step.id === vehicle.step_id}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: step.color }}
                              />
                              <span className="flex-1">{step.name}</span>
                              {step.id === vehicle.step_id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Quick advance to next step button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdvanceStep(vehicle.id, vehicle.step_id);
                      }}
                      disabled={isMoving || (() => {
                        const availableSteps = steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index);
                        const currentStepIndex = availableSteps.findIndex(s => s.id === vehicle.step_id);
                        return currentStepIndex >= availableSteps.length - 1;
                      })()}
                      title={t('get_ready.actions.advance_step')}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>

                {/* Workflow */}
                <TableCell className="w-[110px] py-1 text-center">
                  <div className="flex justify-center">
                    <Badge variant="outline" className={cn("text-xs h-5", getWorkflowColor(vehicle.workflow_type))}>
                      {t(`get_ready.workflow.${vehicle.workflow_type}`)}
                    </Badge>
                  </div>
                </TableCell>

                {/* Time in Process - Compact Format */}
                <TableCell className="w-[80px] py-1 text-center">
                  <span className={cn(
                    "font-medium text-sm whitespace-nowrap",
                    getTimeInProcessColor(vehicle.step_id, parseInt(vehicle.days_in_step) || 0)
                  )}>
                    {formatTimeForTable(vehicle.t2l).primary}
                  </span>
                </TableCell>

                {/* Current Step - Compact Format */}
                <TableCell className="w-[80px] py-1 text-center">
                  <span className="font-medium text-sm whitespace-nowrap">
                    {formatTimeForTable(vehicle.days_in_step).primary}
                  </span>
                </TableCell>

                {/* Priority */}
                <TableCell className="w-[100px] py-1 text-center">
                  <div className="flex justify-center">
                    <Badge className={cn("text-xs h-5 capitalize", getPriorityColor(vehicle.priority))}>
                      {vehicle.priority}
                    </Badge>
                  </div>
                </TableCell>

                {/* Progress & Assigned - Combined */}
                <TableCell className="w-[150px] py-1 text-center">
                  <div className="space-y-1">
                    {/* Progress bar with percentage */}
                    <div className="flex items-center gap-2">
                      <Progress value={vehicle.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">
                        {vehicle.progress}%
                      </span>
                    </div>
                    {/* Assigned user */}
                    <div className="text-xs text-muted-foreground">
                      {vehicle.assigned_to}
                    </div>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="w-[100px] text-center py-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(vehicle.id);
                      }}
                      title={t('get_ready.actions.view_details')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVehicle(vehicle.id);
                      }}
                      title={t('get_ready.actions.edit_vehicle')}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVehicle(vehicle.id);
                      }}
                      title={t('get_ready.actions.delete_vehicle')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
                ))}
                {/* Loading indicator for next page */}
                {isFetchingNextPage && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                </>
              )}
              </TableBody>
            </Table>
            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-4" />
          </TooltipProvider>
        </div>
      </Card>
    </div>
  );
}
