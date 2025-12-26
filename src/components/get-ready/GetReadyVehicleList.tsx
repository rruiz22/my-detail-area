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
import { useVehicleImagesCache } from '@/hooks/useVehicleImagesCache';
import { cn } from '@/lib/utils';
import type { GetReadyVehicle } from '@/types/getReady';
import { getProgressColor } from '@/utils/progressCalculation';
import { formatTimeForTable } from '@/utils/timeFormatUtils';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    AlertTriangle,
    Car,
    Check,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Edit,
    Eye,
    FileText,
    Image,
    Loader2,
    MoreHorizontal,
    Trash2,
    User,
    Wrench,
    XCircle
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GetReadyVehicleListProps {
  searchQuery: string;
  selectedStep: string;
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

  // ✅ OPTIMIZATION: Pre-cached vehicle images (single query instead of per-page)
  const { getImageUrl } = useVehicleImagesCache();

  // Refs for virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

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

  const handleUpdateVehicle = (vehicleId: string, updates: { priority?: 'low' | 'normal' | 'medium' | 'high' | 'urgent' }) => {
    updateVehicle({
      id: vehicleId,
      ...updates
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
    selectedPriority,
    sortBy,
    sortOrder
  });

  // Flatten pages into single array
  const allVehicles = data?.pages.flatMap(page => page.vehicles) ?? [];

  // ✅ OPTIMIZATION: Get REAL total count directly from the query (server-side count)
  // The first page contains the totalCount with the exact same filters applied
  // This ensures the count always matches the actual query results
  const realTotalVehicles = data?.pages[0]?.totalCount ?? allVehicles.length;

  // Pagination calculations - use loaded vehicles for actual pagination
  const loadedVehicles = allVehicles.length;
  const totalPages = Math.ceil(realTotalVehicles / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, loadedVehicles);
  const vehicles = allVehicles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStep, selectedPriority, sortBy, sortOrder]);

  // ✅ OPTIMIZATION: Fetch next page ONLY when user approaches end of current data
  // Removed aggressive auto-fetch that loaded ALL pages (40+ queries)
  const handleFetchMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fetch more when approaching end of loaded data or when navigating to unloaded pages
  useEffect(() => {
    const needsMoreData = endIndex >= loadedVehicles - 10; // Fetch when 10 items from end
    const navigatedBeyondLoaded = startIndex >= loadedVehicles; // User navigated to page without data

    if ((needsMoreData || navigatedBeyondLoaded) && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [endIndex, startIndex, loadedVehicles, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
            Vehicles ({realTotalVehicles})
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
                {(() => {
                  const imageUrl = getImageUrl(vehicle.vin);
                  return (
                    <div
                      className={cn(
                        "mb-2 relative",
                        imageUrl && "cursor-pointer group"
                      )}
                      onClick={(e) => handleImageClick(e, vehicle)}
                    >
                      <VehicleImageWithLoader
                        src={imageUrl}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="h-32 w-full rounded-md transition-opacity group-hover:opacity-90"
                        fallbackClassName="rounded-md"
                      />
                      {imageUrl && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-md flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  );
                })()}

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
    <div className={cn("space-y-2 sm:space-y-4", className)}>
      {/* Header - Compact on mobile */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm sm:text-lg font-medium whitespace-nowrap">
            Vehicles ({realTotalVehicles})
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            {t('get_ready.table.click_to_view')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="default"
            size="sm"
            className="h-7 sm:h-9 px-2 sm:px-3 text-xs"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 sm:h-9 px-2 sm:px-3 text-xs"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="flex flex-col">
        {/* Table container - Responsive with horizontal scroll */}
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <TooltipProvider>
            <Table data-sticky-header className="w-full">
              <TableHeader className="sticky top-0 bg-background z-10 after:absolute after:inset-x-0 after:bottom-0 after:border-b">
                <TableRow className="h-9 hover:bg-transparent border-b-0">
                  {/* Mobile: Image + Stock combined, Vehicle, Step, Actions */}
                  {/* Desktop: All columns */}
                  <TableHead className="w-[50px] sm:w-[70px] text-center py-2 bg-background">{t('get_ready.table.image')}</TableHead>
                  <TableHead className="w-[70px] sm:w-[90px] text-center py-2 bg-background">{t('get_ready.table.stock')}</TableHead>
                  <TableHead className="w-[100px] sm:w-[140px] text-center py-2 bg-background hidden lg:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{t('get_ready.table.indicators') || 'Info'}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('get_ready.table.indicators_tooltip') || 'Media, Notes, Work Items, Alerts'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="min-w-[120px] sm:w-[200px] text-center py-2 bg-background">{t('get_ready.table.vehicle')}</TableHead>
                  <TableHead className="w-[80px] sm:w-[140px] text-center py-2 bg-background">{t('get_ready.table.step')}</TableHead>
                  <TableHead className="w-[60px] sm:w-[80px] text-center py-2 bg-background hidden xl:table-cell">
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
                  <TableHead className="w-[60px] sm:w-[80px] text-center py-2 bg-background hidden xl:table-cell">
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
                  <TableHead className="w-[70px] sm:w-[100px] text-center py-2 bg-background hidden lg:table-cell">{t('get_ready.table.priority')}</TableHead>
                  <TableHead className="w-[80px] sm:w-[150px] text-center py-2 bg-background hidden sm:table-cell">{t('get_ready.table.progress')}</TableHead>
                  <TableHead className="w-[44px] sm:w-[100px] text-center py-2 bg-background"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {/* Loading state when navigating to unloaded page */}
              {vehicles.length === 0 && isFetchingNextPage ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
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
                      selectedVehicleId === vehicle.id && "bg-primary/10 border-l-4 border-l-primary",
                      vehicle.progress > 0 && vehicle.progress < 100 && "bg-amber-100/70 dark:bg-amber-900/30 animate-pulse-soft",
                      vehicle.progress === 100 && "bg-emerald-100/60 dark:bg-emerald-900/30"
                    )}
                  >
                {/* Image - Click to open lightbox */}
                <TableCell className="w-[50px] sm:w-[70px] py-1 text-center px-1">
                  {(() => {
                    const imageUrl = getImageUrl(vehicle.vin);
                    return (
                      <div
                        className={cn(
                          "flex justify-center relative",
                          imageUrl && "cursor-pointer group"
                        )}
                        onClick={(e) => handleImageClick(e, vehicle)}
                      >
                        <VehicleImageWithLoader
                          src={imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="h-8 w-10 sm:w-12 rounded-sm transition-opacity group-hover:opacity-90"
                          fallbackClassName="rounded-sm"
                        />
                        {imageUrl && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-sm flex items-center justify-center">
                            <Eye className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>

                {/* Stock Number */}
                <TableCell className="w-[70px] sm:w-[90px] py-1 text-center px-1">
                  <div className="font-medium text-[11px] sm:text-sm truncate">{vehicle.stock_number}</div>
                </TableCell>

                {/* Indicators Column - Media, Notes, Work Items, SLA - Hidden on mobile/tablet */}
                <TableCell className="w-[100px] sm:w-[140px] py-1 hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {/* SLA Alert - Critical/Warning */}
                    {(vehicle.sla_status === 'red' || vehicle.sla_status === 'critical') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 cursor-help">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium">SLA Critical</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Vehicle is overdue</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(vehicle.sla_status === 'yellow' || vehicle.sla_status === 'warning') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 cursor-help">
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">SLA Warning</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Approaching deadline</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Media */}
                        {(vehicle.media_count ?? 0) > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-0.5 h-7 px-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 cursor-help">
                            <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{vehicle.media_count}</span>
                              </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">Media Files</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{vehicle.media_count} {vehicle.media_count === 1 ? 'photo/file' : 'photos/files'} attached</p>
                        </TooltipContent>
                      </Tooltip>
                        )}

                    {/* Notes */}
                        {(parseInt(vehicle.notes_preview || '0')) > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-0.5 h-7 px-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 cursor-help">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{vehicle.notes_preview}</span>
                              </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Notes</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{vehicle.notes_preview} {parseInt(vehicle.notes_preview) === 1 ? 'note' : 'notes'}</p>
                        </TooltipContent>
                      </Tooltip>
                        )}

                        {/* Work Items - Pending */}
                        {vehicle.work_item_counts && vehicle.work_item_counts.pending > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-0.5 h-7 px-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 cursor-help">
                            <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{vehicle.work_item_counts.pending}</span>
                              </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">Pending Work</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{vehicle.work_item_counts.pending} {vehicle.work_item_counts.pending === 1 ? 'item' : 'items'} waiting</p>
                        </TooltipContent>
                      </Tooltip>
                        )}

                        {/* Work Items - In Progress */}
                        {vehicle.work_item_counts && vehicle.work_item_counts.in_progress > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-0.5 h-7 px-1.5 rounded-md bg-sky-100 dark:bg-sky-900/30 cursor-help">
                            <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                            <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">{vehicle.work_item_counts.in_progress}</span>
                              </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-sky-500" />
                            <span className="font-medium">In Progress</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{vehicle.work_item_counts.in_progress} {vehicle.work_item_counts.in_progress === 1 ? 'item' : 'items'} active</p>
                        </TooltipContent>
                      </Tooltip>
                        )}

                        {/* Work Items - Completed */}
                        {vehicle.work_item_counts && vehicle.work_item_counts.completed > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-0.5 h-7 px-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 cursor-help">
                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{vehicle.work_item_counts.completed}</span>
                              </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium">Completed</span>
                      </div>
                          <p className="text-xs text-muted-foreground">{vehicle.work_item_counts.completed} {vehicle.work_item_counts.completed === 1 ? 'item' : 'items'} done</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Empty state - show subtle dash if no indicators */}
                    {!((vehicle.media_count ?? 0) > 0) &&
                     !(parseInt(vehicle.notes_preview || '0') > 0) &&
                     !(vehicle.work_item_counts?.pending > 0) &&
                     !(vehicle.work_item_counts?.in_progress > 0) &&
                     !(vehicle.work_item_counts?.completed > 0) &&
                     vehicle.sla_status !== 'red' && vehicle.sla_status !== 'critical' &&
                     vehicle.sla_status !== 'yellow' && vehicle.sla_status !== 'warning' && (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </div>
                </TableCell>

                {/* Vehicle Info */}
                <TableCell className="min-w-[120px] sm:w-[200px] py-1 text-center px-1">
                  <div className="space-y-0">
                    <div className="font-medium overflow-hidden text-ellipsis text-[11px] sm:text-sm line-clamp-1">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-[10px] sm:text-xs overflow-hidden text-ellipsis">
                      <span className="text-muted-foreground/60 hidden sm:inline">L8V: </span>
                      <span className="font-mono font-semibold text-foreground">{vehicle.vin.slice(-8)}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Step */}
                <TableCell className="w-[80px] sm:w-[140px] py-1 text-center px-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center">
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

                {/* Time in Process - Hidden on mobile/tablet */}
                <TableCell className="w-[60px] sm:w-[80px] py-1 text-center hidden xl:table-cell">
                  <span className={cn(
                    "font-medium text-xs whitespace-nowrap",
                    getTimeInProcessColor(vehicle.step_id, parseInt(vehicle.days_in_step) || 0)
                  )}>
                    {formatTimeForTable(vehicle.t2l).primary}
                  </span>
                </TableCell>

                {/* Current Step Time - Hidden on mobile/tablet */}
                <TableCell className="w-[60px] sm:w-[80px] py-1 text-center hidden xl:table-cell">
                  <span className="font-medium text-xs whitespace-nowrap">
                    {formatTimeForTable(vehicle.days_in_step).primary}
                  </span>
                </TableCell>

                {/* Priority - Hidden on mobile/tablet */}
                <TableCell className="w-[70px] sm:w-[100px] py-1 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
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

                {/* Progress & Assigned - Hidden on mobile */}
                <TableCell className="w-[80px] sm:w-[150px] py-1 text-center hidden sm:table-cell">
                  <div className="space-y-1">
                    {/* Progress bar with percentage */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Progress
                        value={vehicle.progress}
                        className="h-1.5 flex-1"
                        indicatorClassName={getProgressColor(vehicle.progress)}
                      />
                      <span className="text-[10px] sm:text-xs text-muted-foreground w-6 sm:w-8">
                        {vehicle.progress}%
                      </span>
                    </div>
                    {/* Assigned user */}
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate hidden md:block">
                      {vehicle.assigned_to}
                    </div>
                  </div>
                </TableCell>

                {/* Actions - Single button on mobile, multiple on desktop */}
                <TableCell className="w-[44px] sm:w-[100px] text-center py-1 px-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-0.5">
                    {/* Mobile: Just Eye button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 sm:h-7 sm:w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(vehicle.id);
                      }}
                      title={t('get_ready.actions.view_details')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Desktop: Edit and Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hidden sm:flex"
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
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hidden sm:flex"
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
                    <TableCell colSpan={11} className="text-center py-4">
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

        {/* Pagination Controls - Mobile friendly */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t px-2 sm:px-4 py-2 sm:py-3 bg-muted/30 gap-2">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {vehicles.length > 0 ? (
              <>
                <span className="hidden sm:inline">{t('common.showing')} </span>
                {startIndex + 1}-{Math.min(startIndex + vehicles.length, realTotalVehicles)}
                <span className="hidden sm:inline"> {t('common.of')}</span>
                <span className="sm:hidden">/</span> {realTotalVehicles}
              </>
            ) : isFetchingNextPage ? (
              <>{t('common.loading')}...</>
            ) : (
              <>{realTotalVehicles} {t('get_ready.table.vehicles')}</>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Go to first page - hidden on mobile */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 sm:h-8 sm:w-8 p-0 hidden sm:flex"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title={t('common.first_page') || 'First page'}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous page */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 sm:h-8 sm:w-8 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title={t('common.previous_page') || 'Previous page'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers - show fewer on mobile */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {Array.from({ length: Math.min(totalPages, typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5) }, (_, i) => {
                const maxPages = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5;
                let pageNum;
                if (totalPages <= maxPages) {
                  pageNum = i + 1;
                } else if (currentPage <= Math.ceil(maxPages / 2)) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                  pageNum = totalPages - maxPages + 1 + i;
                } else {
                  pageNum = currentPage - Math.floor(maxPages / 2) + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            {/* Next page */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 sm:h-8 sm:w-8 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              title={t('common.next_page') || 'Next page'}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Go to last page - hidden on mobile */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 sm:h-8 sm:w-8 p-0 hidden sm:flex"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              title={t('common.last_page') || 'Last page'}
            >
              <ChevronsRight className="h-4 w-4" />
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
