import { StepDropdown } from '@/components/get-ready/StepDropdown';
import { StockImageLightbox } from '@/components/get-ready/StockImageLightbox';
import { VehicleImageWithLoader } from '@/components/get-ready/VehicleImageWithLoader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReady } from '@/hooks/useGetReady';
import { useGetReadyViewMode } from '@/hooks/useGetReadyPersistence';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useGetReadyVehiclesInfinite } from '@/hooks/useGetReadyVehicles';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';
import { cn } from '@/lib/utils';
import type { GetReadyVehicle } from '@/types/getReady';
import { getProgressColor } from '@/utils/progressCalculation';
import { formatTimeForTable } from '@/utils/timeFormatUtils';
import {
    AlertTriangle,
    Car,
    Check,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
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
import { useEffect, useState } from 'react';
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
  const { currentDealership } = useAccessibleDealerships();

  // Lightbox state for Stock images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxVehicle, setLightboxVehicle] = useState<{ vin: string; info: string } | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get vehicle management functions
  const { moveVehicle, isMoving, updateVehicle, isUpdating } = useVehicleManagement();

  // Handle image click - ALWAYS open lightbox (even without image)
  const handleImageClick = (e: React.MouseEvent, vehicle: { vin: string; year: number; make: string; model: string; stock_number: string }) => {
    e.stopPropagation(); // Prevent row click
    // Always open lightbox with VIN
    setLightboxVehicle({
      vin: vehicle.vin,
      info: `${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.stock_number}`
    });
    setLightboxOpen(true);
  };

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

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete || !onDeleteVehicle) return;

    await onDeleteVehicle(vehicleToDelete);
    setVehicleToDelete(null);
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

  const handleUpdateVehicle = (vehicleId: string, updates: { workflow_type?: 'standard' | 'express' | 'priority'; priority?: 'low' | 'normal' | 'medium' | 'high' | 'urgent' }) => {
    updateVehicle({
      id: vehicleId,
      data: updates
    });
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
  const allVehicles = data?.pages.flatMap(page => page.vehicles) ?? [];

  // Pagination calculations
  const totalVehicles = allVehicles.length;
  const totalPages = Math.ceil(totalVehicles / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalVehicles);
  const vehicles = allVehicles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStep, selectedWorkflow, selectedPriority, sortBy, sortOrder]);

  // Auto-load more pages in background for smooth navigation
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && allVehicles.length < totalVehicles + itemsPerPage) {
      fetchNextPage();
    }
  }, [currentPage, hasNextPage, isFetchingNextPage, allVehicles.length, fetchNextPage, totalVehicles]);

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

        {/* Grid View with responsive height */}
        <div className="flex-1 overflow-auto p-1 max-h-[calc(100vh-300px)]">
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
                {/* Vehicle Image - Click to open lightbox */}
                <div
                  className={cn(
                    "mb-2 relative",
                    vehicle.images[0] && "cursor-pointer group"
                  )}
                  onClick={(e) => handleImageClick(e, vehicle)}
                >
                  <VehicleImageWithLoader
                    src={vehicle.images[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="h-32 w-full rounded-md transition-opacity group-hover:opacity-90"
                    fallbackClassName="rounded-md"
                  />
                  {vehicle.images[0] && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-md flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
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

                <Progress
                  value={vehicle.progress}
                  className="h-1.5"
                  indicatorClassName={getProgressColor(vehicle.progress)}
                />

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-muted-foreground">Step:</span>
                    <StepDropdown
                      currentStepId={vehicle.step_id}
                      currentStepName={vehicle.step_name}
                      steps={steps}
                      isMoving={isMoving}
                      onStepChange={(newStepId) => handleMoveToStep(vehicle.id, vehicle.step_id, newStepId)}
                      onAdvanceStep={() => handleAdvanceStep(vehicle.id, vehicle.step_id)}
                      variant="table"
                    />
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
            Vehicles ({totalVehicles})
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
      <Card className="flex flex-col">
        {/* Table container - No scroll needed, shows exactly 5 rows */}
        <div>
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
                  <TableHead className="w-[150px] text-center py-2 bg-background">{t('get_ready.table.progress')}</TableHead>
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
                {/* Image - Click to open lightbox */}
                <TableCell className="w-[70px] py-1 text-center">
                  <div
                    className={cn(
                      "flex justify-center relative",
                      vehicle.images[0] && "cursor-pointer group"
                    )}
                    onClick={(e) => handleImageClick(e, vehicle)}
                  >
                    <VehicleImageWithLoader
                      src={vehicle.images[0]}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="h-8 w-12 rounded-sm transition-opacity group-hover:opacity-90"
                      fallbackClassName="rounded-sm"
                    />
                    {vehicle.images[0] && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-sm flex items-center justify-center">
                        <Eye className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
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
                    <StepDropdown
                      currentStepId={vehicle.step_id}
                      currentStepName={vehicle.step_name}
                      steps={steps}
                      isMoving={isMoving}
                      onStepChange={(newStepId) => handleMoveToStep(vehicle.id, vehicle.step_id, newStepId)}
                      onAdvanceStep={() => handleAdvanceStep(vehicle.id, vehicle.step_id)}
                      variant="table"
                    />
                  </div>
                </TableCell>

                {/* Workflow - Editable */}
                <TableCell className="w-[110px] py-1 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-6 py-0.5 px-2 hover:bg-accent text-xs", getWorkflowColor(vehicle.workflow_type))}
                          disabled={isMoving || isUpdating}
                        >
                          {t(`get_ready.workflow.${vehicle.workflow_type}`)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuLabel>{t('get_ready.workflow.change_workflow')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { workflow_type: 'standard' });
                          }}
                          disabled={vehicle.workflow_type === 'standard'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1">{t('get_ready.workflow.standard')}</span>
                            {vehicle.workflow_type === 'standard' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { workflow_type: 'express' });
                          }}
                          disabled={vehicle.workflow_type === 'express'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1">{t('get_ready.workflow.express')}</span>
                            {vehicle.workflow_type === 'express' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { workflow_type: 'priority' });
                          }}
                          disabled={vehicle.workflow_type === 'priority'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1">{t('get_ready.workflow.priority')}</span>
                            {vehicle.workflow_type === 'priority' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

                {/* Priority - Editable */}
                <TableCell className="w-[100px] py-1 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-6 py-0.5 px-2 hover:bg-accent text-xs capitalize", getPriorityColor(vehicle.priority))}
                          disabled={isMoving || isUpdating}
                        >
                          {vehicle.priority}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuLabel>{t('get_ready.priority.change_priority')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { priority: 'urgent' });
                          }}
                          disabled={vehicle.priority === 'urgent'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 capitalize">Urgent</span>
                            {vehicle.priority === 'urgent' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { priority: 'high' });
                          }}
                          disabled={vehicle.priority === 'high'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 capitalize">High</span>
                            {vehicle.priority === 'high' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { priority: 'medium' });
                          }}
                          disabled={vehicle.priority === 'medium'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 capitalize">Medium</span>
                            {vehicle.priority === 'medium' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { priority: 'normal' });
                          }}
                          disabled={vehicle.priority === 'normal'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 capitalize">Normal</span>
                            {vehicle.priority === 'normal' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicle(vehicle.id, { priority: 'low' });
                          }}
                          disabled={vehicle.priority === 'low'}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 capitalize">Low</span>
                            {vehicle.priority === 'low' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>

                {/* Progress & Assigned - Combined */}
                <TableCell className="w-[150px] py-1 text-center">
                  <div className="space-y-1">
                    {/* Progress bar with percentage */}
                    <div className="flex items-center gap-2">
                      <Progress
                        value={vehicle.progress}
                        className="h-1.5 flex-1"
                        indicatorClassName={getProgressColor(vehicle.progress)}
                      />
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
          </TooltipProvider>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {t('common.showing')} {startIndex + 1}-{endIndex} {t('common.of')} {totalVehicles}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stock Image Lightbox */}
      {lightboxVehicle && (
        <StockImageLightbox
          vehicleVin={lightboxVehicle.vin}
          vehicleInfo={lightboxVehicle.info}
          dealerId={currentDealership?.id || 0}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}

      {/* Delete Confirmation Dialog - Team Chat Style */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('get_ready.confirm_delete_title', 'Delete Vehicle from Get Ready?')}
        description={t('get_ready.confirm_delete', 'Are you sure you want to remove this vehicle from the Get Ready process? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteVehicle}
        variant="destructive"
      />
    </div>
  );
}
