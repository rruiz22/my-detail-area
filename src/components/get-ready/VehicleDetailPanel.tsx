import { ReconOrderModal } from '@/components/orders/ReconOrderModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReady } from '@/hooks/useGetReady';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useVehicleDetail, type VehicleDetail } from '@/hooks/useGetReadyVehicles';
import { usePermissions } from '@/hooks/usePermissions';
import { useVehicleActivityLog } from '@/hooks/useVehicleActivityLog';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';
import { useVehicleMedia } from '@/hooks/useVehicleMedia';
import { useVehicleNotes } from '@/hooks/useVehicleNotes';
import { useVehicleStatus } from '@/hooks/useVehicleStatus';
import { useCurrentStepVisit, useVehicleTimeToLine } from '@/hooks/useVehicleStepHistory';
import { useWorkItems } from '@/hooks/useVehicleWorkItems';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatTimeDuration } from '@/utils/timeFormatUtils';
import {
    AlertTriangle,
    Circle,
    Clock,
    DollarSign,
    Edit,
    FileSpreadsheet,
    FileText,
    Image,
    MessageSquare,
    MoreHorizontal,
    Printer,
    Users,
    Wrench,
    X
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { StepDropdown } from './StepDropdown';
import { VehicleMediaTab } from './tabs/VehicleMediaTab';
import { VehicleNotesTab } from './tabs/VehicleNotesTab';
import { VehicleVendorsTab } from './tabs/VehicleVendorsTab';
import { VehicleWorkItemsTab } from './tabs/VehicleWorkItemsTab';
import { VehicleActivityLog } from './VehicleActivityLog';

interface VehicleDetailPanelProps {
  className?: string;
}

export function VehicleDetailPanel({ className }: VehicleDetailPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { steps } = useGetReady();
  const { selectedVehicleId, setSelectedVehicleId } = useGetReadyStore();
  const { data: vehicleDetail, isLoading } = useVehicleDetail(selectedVehicleId);
  const { moveVehicle, isMoving } = useVehicleManagement();
  const { hasModulePermission } = usePermissions();
  const { currentDealership } = useAccessibleDealerships();

  // State for Recon Order Modal
  const [showReconModal, setShowReconModal] = React.useState(false);

  // Check if vehicle is in Recon (only when we have vehicle data)
  const { reconOrder, loading: statusLoading } = useVehicleStatus(
    vehicleDetail?.stock_number || '',
    vehicleDetail?.vin || '',
    currentDealership?.id || 0
  );

  // Fetch counts for each tab
  const { data: workItems = [] } = useWorkItems(selectedVehicleId);
  const { data: mediaFiles = [] } = useVehicleMedia(selectedVehicleId || '');
  const { data: notes = [] } = useVehicleNotes(selectedVehicleId);
  const activityLogQuery = useVehicleActivityLog(selectedVehicleId);

  // Count total activities from all pages
  const activityCount = React.useMemo(() => {
    return activityLogQuery.data?.pages.reduce((total, page) => total + page.activities.length, 0) || 0;
  }, [activityLogQuery.data]);

  // Fetch time tracking data for header
  const { data: timeToLine } = useVehicleTimeToLine(selectedVehicleId);
  const { data: currentVisit } = useCurrentStepVisit(selectedVehicleId);

  const counts = React.useMemo(() => {
    const workItemsWithVendors = workItems.filter(wi => wi.assigned_vendor_id);
    const totalCost = workItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

    return {
      workItems: workItems.length,
      media: mediaFiles.length,
      notes: notes.length,
      vendors: workItemsWithVendors.length,
      timeline: activityCount,
      appraisal: 0, // Appraisal feature not yet implemented in database
      totalCost: totalCost
    };
  }, [workItems, mediaFiles, notes, activityCount]);

  const [activeTab, setActiveTab] = React.useState('work-items');

  const handleClose = () => {
    setSelectedVehicleId(null);
  };

  // ✨ NEW: Keyboard shortcuts for better UX
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Close panel with Escape
      if (e.key === 'Escape' && selectedVehicleId) {
        handleClose();
        return;
      }

      // Switch tabs with Ctrl/Cmd + Number (1-5)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const tabs = ['work-items', 'media', 'notes', 'vendors', 'timeline'];
        const keyNum = parseInt(e.key);

        if (keyNum >= 1 && keyNum <= 5 && selectedVehicleId) {
          e.preventDefault();
          setActiveTab(tabs[keyNum - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedVehicleId]); // Only re-attach when vehicle selection changes

  const handlePrint = () => {
    window.print();
    // TODO: Implement VehiclePrintView component for better print layout
  };

  const handleExportPDF = () => {
    toast({
      title: t('get_ready.detail_panel.export_pdf'),
      description: t('get_ready.detail_panel.coming_soon'),
    });
    // TODO: Implement PDF export functionality
  };

  const handleExportExcel = () => {
    toast({
      title: t('common.action_buttons.export_excel'),
      description: t('get_ready.detail_panel.coming_soon'),
    });
    // TODO: Implement Excel export functionality
  };

  const handleEdit = () => {
    toast({
      title: t('get_ready.detail_panel.edit_vehicle'),
      description: t('get_ready.detail_panel.coming_soon'),
    });
    // TODO: Implement edit vehicle modal
  };

  // ✨ NEW: Step change handler
  const handleMoveToStep = (newStepId: string) => {
    if (!vehicleDetail || vehicleDetail.step_id === newStepId) {
      return;
    }
    moveVehicle({ vehicleId: selectedVehicleId!, stepId: newStepId });
  };

  const handleAdvanceStep = () => {
    if (!vehicleDetail) return;

    const availableSteps = steps.filter(s => s.id !== 'all').sort((a, b) => a.order_index - b.order_index);
    const currentStepIndex = availableSteps.findIndex(s => s.id === vehicleDetail.step_id);

    if (currentStepIndex === -1 || currentStepIndex >= availableSteps.length - 1) {
      return;
    }

    const nextStep = availableSteps[currentStepIndex + 1];
    handleMoveToStep(nextStep.id);
  };

  // Handler for adding vehicle to Recon - Opens modal with auto-population
  const handleAddToRecon = () => {
    if (!vehicleDetail) return;
    setShowReconModal(true);
  };

  // Handler for saving Recon order
  const handleSaveReconOrder = async (orderData: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t('recon_orders.toast.create_success'),
        description: t('recon_orders.toast.create_success_description'),
      });

      setShowReconModal(false);

      // Optionally navigate to the new order
      if (data?.id) {
        navigate(`/recon-orders?order=${data.id}`);
      }
    } catch (error) {
      console.error('Error creating recon order:', error);
      toast({
        title: t('recon_orders.toast.create_error'),
        description: error instanceof Error ? error.message : t('recon_orders.toast.create_error_description'),
        variant: 'destructive',
      });
    }
  };

  // Prepare pre-filled data for Recon modal
  const preFillOrderData = React.useMemo(() => {
    if (!vehicleDetail) return null;

    return {
      vehicleVin: vehicleDetail.vin,
      vehicle_vin: vehicleDetail.vin,
      vehicleYear: vehicleDetail.vehicle_year?.toString(),
      vehicle_year: vehicleDetail.vehicle_year?.toString(),
      vehicleMake: vehicleDetail.vehicle_make,
      vehicle_make: vehicleDetail.vehicle_make,
      vehicleModel: vehicleDetail.vehicle_model,
      vehicle_model: vehicleDetail.vehicle_model,
      stockNumber: vehicleDetail.stock_number,
      stock_number: vehicleDetail.stock_number,
    };
  }, [vehicleDetail]);

  if (!selectedVehicleId) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/20 border-t", className)}>
        <div className="text-center text-muted-foreground p-8 animate-in fade-in duration-500">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50">
            <Circle className="h-8 w-8 opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t('get_ready.detail_panel.no_selection.title')}
          </h3>
          <p className="text-sm max-w-xs mx-auto">
            {t('get_ready.detail_panel.no_selection.description')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-4 border-t rounded-lg bg-background shadow-lg animate-in slide-in-from-bottom duration-300", className)}>
        <div className="space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!vehicleDetail) {
    return (
      <div className={cn("flex items-center justify-center h-full border-t rounded-lg bg-background shadow-lg", className)}>
        <div className="text-center text-muted-foreground p-8 animate-in fade-in duration-500">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-red-600">
            {t('get_ready.detail_panel.error.title')}
          </h3>
          <p className="text-sm max-w-xs mx-auto mb-4">
            {t('get_ready.detail_panel.error.description')}
          </p>
          <Button variant="outline" size="sm" onClick={handleClose}>
            {t('get_ready.detail_panel.close')}
          </Button>
        </div>
      </div>
    );
  }

  // At this point, vehicleDetail is guaranteed to be non-null due to the checks above
  const vehicle = vehicleDetail as VehicleDetail;

  return (
    <div
      className={cn("flex flex-col bg-background border rounded-lg shadow-lg animate-in slide-in-from-bottom duration-300", className)}
    >
      {/* Vehicle Header - Enhanced with Time Tracking */}
      <div className="border-b bg-muted/30 dark:bg-muted/20 relative">
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Vehicle actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('get_ready.detail_panel.print_report')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <FileText className="h-4 w-4 mr-2" />
                {t('get_ready.detail_panel.export_pdf')}
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0.5">Soon</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t('common.action_buttons.export_excel')}
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0.5">Soon</Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <Edit className="h-4 w-4 mr-2" />
                {t('get_ready.detail_panel.edit_vehicle')}
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0.5">Soon</Badge>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
            aria-label={t('get_ready.detail_panel.close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 pr-20">
          {/* Two-Row Responsive Layout */}
          <div className="space-y-3">
            {/* Row 1: Vehicle Info */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                {vehicle.vehicle_trim && (
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground">({vehicle.vehicle_trim})</span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="font-medium">ST: {vehicle.stock_number}</span>
                <span>•</span>
                <span className="font-mono">VIN: {vehicle.vin?.slice(-8) || 'N/A'}</span>

                {/* Media/Notes Badges - Match table format */}
                {(counts.media > 0 || counts.notes > 0) && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {counts.media > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 gap-0.5">
                          <Image className="h-2.5 w-2.5" />
                          {counts.media}
                        </Badge>
                      )}
                      {counts.notes > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 gap-0.5">
                          <FileText className="h-2.5 w-2.5" />
                          {counts.notes}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Metrics - Grid Responsive (Always Visible) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:flex lg:flex-wrap gap-2">
              {/* T2L - Time to Line (Always Visible, Compact) */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 cursor-help">
                      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground hidden sm:block">T2L</span>
                        <span className="font-bold text-blue-900 dark:text-blue-100 whitespace-nowrap text-xs sm:text-sm">
                          {timeToLine?.total_hours ? formatTimeDuration(timeToLine?.total_hours * 60 * 60 * 1000) : '-'}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{t('get_ready.vehicle_list.t2l_full')}</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {t('get_ready.vehicle_list.t2l_description')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Work Items (Always Visible, Compact) */}
              <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/30 px-2 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                <Wrench className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">Work</span>
                  <span className="font-bold text-purple-900 dark:text-purple-100 text-xs sm:text-sm">
                    {counts.workItems}
                  </span>
                </div>
              </div>

              {/* Current Step Time - Previous + Current (Compact) */}
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">Step</span>

                  {/* Simplified: Show current time (total if revisited) */}
                  <span className="font-bold text-amber-900 dark:text-amber-100 whitespace-nowrap text-xs sm:text-sm">
                    {currentVisit?.current_visit_hours
                      ? formatTimeDuration(currentVisit.current_visit_hours * 60 * 60 * 1000)
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Total Cost (NEW - Compact) */}
              <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 px-2 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">Cost</span>
                  <span className="font-bold text-green-900 dark:text-green-100 whitespace-nowrap text-xs sm:text-sm">
                    ${counts.totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Step Dropdown - Editable (Reuses table component) */}
              <div className="col-span-3 sm:col-span-1">
                <StepDropdown
                  currentStepId={vehicle.step_id}
                  currentStepName={vehicle.step_name || vehicle.current_step?.name || t('get_ready.detail_panel.no_step')}
                  steps={steps}
                  isMoving={isMoving}
                  onStepChange={handleMoveToStep}
                  onAdvanceStep={handleAdvanceStep}
                  variant="badge"
                  className="w-full"
                />
              </div>

              {/* Add to Recon Button - Show only if NOT in Recon and has permission */}
              {!reconOrder && !statusLoading && hasModulePermission('recon_orders', 'create_orders') && (
                <div className="col-span-3 sm:col-span-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddToRecon}
                    className="w-full h-full bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    {t('stock.vehicleDetails.actions.addToRecon')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mt-4">
            {/* Work Items Tab */}
            <TabsTrigger value="work-items" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 relative">
              <div className="relative">
                <Wrench className="h-4 w-4" />
                {counts.workItems > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px] sm:hidden">
                    {counts.workItems}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] sm:text-sm">{t('get_ready.tabs.work_items')}</span>
              {counts.workItems > 0 && (
                <Badge variant="secondary" className="hidden sm:flex ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.workItems}
                </Badge>
              )}
            </TabsTrigger>

            {/* Media Tab */}
            <TabsTrigger value="media" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 relative">
              <div className="relative">
                <Image className="h-4 w-4" />
                {counts.media > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px] sm:hidden">
                    {counts.media}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] sm:text-sm">{t('get_ready.tabs.media')}</span>
              {counts.media > 0 && (
                <Badge variant="secondary" className="hidden sm:flex ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.media}
                </Badge>
              )}
            </TabsTrigger>

            {/* Notes Tab */}
            <TabsTrigger value="notes" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 relative">
              <div className="relative">
                <MessageSquare className="h-4 w-4" />
                {counts.notes > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px] sm:hidden">
                    {counts.notes}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] sm:text-sm">{t('get_ready.tabs.notes')}</span>
              {counts.notes > 0 && (
                <Badge variant="secondary" className="hidden sm:flex ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.notes}
                </Badge>
              )}
            </TabsTrigger>

            {/* Vendors Tab */}
            <TabsTrigger value="vendors" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 relative">
              <div className="relative">
                <Users className="h-4 w-4" />
                {counts.vendors > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px] sm:hidden">
                    {counts.vendors}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] sm:text-sm">{t('get_ready.tabs.vendors')}</span>
              {counts.vendors > 0 && (
                <Badge variant="secondary" className="hidden sm:flex ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.vendors}
                </Badge>
              )}
            </TabsTrigger>

            {/* Timeline Tab */}
            <TabsTrigger value="timeline" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 py-2 relative">
              <div className="relative">
                <Clock className="h-4 w-4" />
                {counts.timeline > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px] sm:hidden">
                    {counts.timeline}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] sm:text-sm">{t('get_ready.tabs.timeline')}</span>
              {counts.timeline > 0 && (
                <Badge variant="secondary" className="hidden sm:flex ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.timeline}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Work Items Tab */}
          <TabsContent value="work-items" className="px-4 pt-4 pb-6 overflow-auto">
            <VehicleWorkItemsTab vehicleId={selectedVehicleId} onSwitchTab={setActiveTab} />
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="px-4 pt-4 pb-6">
            <VehicleMediaTab vehicleId={selectedVehicleId} />
          </TabsContent>

          <TabsContent value="notes" className="px-4 pt-4 pb-6">
            <VehicleNotesTab vehicleId={selectedVehicleId} />
          </TabsContent>

          {/* Vendors Tab - NEW: Full vendor integration */}
          <TabsContent value="vendors" className="px-4 pt-4 pb-6">
            <VehicleVendorsTab vehicleId={selectedVehicleId} />
          </TabsContent>

          <TabsContent value="timeline" className="px-4 pt-4 pb-8">
            {selectedVehicleId && (
              <VehicleActivityLog vehicleId={selectedVehicleId} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Recon Order Modal - Opens with auto-populated vehicle data */}
      {preFillOrderData && (
        <ReconOrderModal
          open={showReconModal}
          onClose={() => setShowReconModal(false)}
          onSave={handleSaveReconOrder}
          order={preFillOrderData}
        />
      )}
    </div>
  );
}
