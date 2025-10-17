import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useVehicleDetail, type VehicleDetail } from '@/hooks/useGetReadyVehicles';
import { useVehicleMedia } from '@/hooks/useVehicleMedia';
import { useVehicleNotes } from '@/hooks/useVehicleNotes';
import { useCurrentStepVisit, useVehicleTimeToLine } from '@/hooks/useVehicleStepHistory';
import { useWorkItems } from '@/hooks/useVehicleWorkItems';
import { useVehicleActivityLog } from '@/hooks/useVehicleActivityLog';
import { cn } from '@/lib/utils';
import { formatTimeDuration } from '@/utils/timeFormatUtils';
import {
    AlertTriangle,
    Circle,
    Clock,
    DollarSign,
    Image,
    MessageSquare,
    Users,
    Wrench,
    X
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { selectedVehicleId, setSelectedVehicleId } = useGetReadyStore();
  const { data: vehicleDetail, isLoading } = useVehicleDetail(selectedVehicleId);

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

    return {
      workItems: workItems.length,
      media: mediaFiles.length,
      notes: notes.length,
      vendors: workItemsWithVendors.length,
      timeline: activityCount,
      appraisal: 0 // Appraisal feature not yet implemented in database
    };
  }, [workItems, mediaFiles, notes, activityCount]);

  const [activeTab, setActiveTab] = React.useState('work-items');

  const handleClose = () => {
    setSelectedVehicleId(null);
  };

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
      className={cn("flex-1 flex flex-col bg-background border rounded-lg shadow-lg animate-in slide-in-from-bottom duration-300 h-[calc(100vh-12rem)] min-h-[700px]", className)}
    >
      {/* Vehicle Header - Enhanced with Time Tracking */}
      <div className="border-b bg-gradient-to-br from-card/50 to-muted/30 relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 z-10"
          onClick={handleClose}
          aria-label={t('get_ready.detail_panel.close')}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="p-4">
          {/* Single Row: Vehicle Info + All Time Cards Aligned Right */}
          <div className="flex items-center justify-between gap-4 pr-10">
            {/* Left: Vehicle Info */}
            <div className="flex-shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                {vehicle.vehicle_trim && (
                  <span className="text-sm font-normal text-muted-foreground">({vehicle.vehicle_trim})</span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="font-medium">Stock: {vehicle.stock_number}</span>
                <span>•</span>
                <span>VIN: {vehicle.vin}</span>
              </div>
            </div>

            {/* Right: All Time Cards + Step Badge - Fully Responsive */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* T2L - Time to Line (Hidden on small screens) */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden md:flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 cursor-help">
                      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-muted-foreground block">{t('get_ready.vehicle_list.t2l_full')}</span>
                        <span className="font-bold text-blue-900 dark:text-blue-100 whitespace-nowrap text-sm">
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

              {/* Work Items (Hidden on small screens) */}
              <div className="hidden lg:flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800">
                <Wrench className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground block">{t('get_ready.tabs.work_items')}</span>
                  <span className="font-bold text-purple-900 dark:text-purple-100 text-sm">
                    {counts.workItems}
                  </span>
                </div>
              </div>

              {/* Current Step Time - Previous + Current */}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground block">{t('get_ready.time_tracking.current_step')}</span>

                  {/* Show Previous + Current if revisited, otherwise just Current */}
                  {currentVisit?.previous_visits_hours && currentVisit.previous_visits_hours > 0 ? (
                    <div className="flex items-center gap-2">
                      {/* Previous Time (with tooltip) */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col cursor-help">
                              <span className="text-[10px] text-muted-foreground uppercase">{t('get_ready.time_tracking.previous_time')}</span>
                              <span className="font-bold text-amber-700 dark:text-amber-300 text-xs whitespace-nowrap">
                                {formatTimeDuration(currentVisit.previous_visits_hours * 60 * 60 * 1000)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{t('get_ready.time_tracking.previous_visits_tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Separator */}
                      <div className="h-8 w-px bg-amber-300 dark:bg-amber-700" />

                      {/* Current Time */}
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase">{t('get_ready.time_tracking.current_time')}</span>
                        <span className="font-bold text-amber-900 dark:text-amber-100 text-sm whitespace-nowrap">
                          {formatTimeDuration(currentVisit.current_visit_hours * 60 * 60 * 1000)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* First visit - show only current time (no Previous/Current labels) */
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-amber-900 dark:text-amber-100 whitespace-nowrap text-sm">
                        {currentVisit?.current_visit_hours ? formatTimeDuration(currentVisit.current_visit_hours * 60 * 60 * 1000) : '-'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Badge */}
              <Badge
                variant="outline"
                className="text-sm px-3 py-2 font-semibold"
                style={{
                  borderColor: vehicle.step_color || '#6B7280',
                  color: vehicle.step_color || '#6B7280',
                  borderWidth: '2px'
                }}
              >
                {vehicle.step_name || vehicle.current_step?.name || 'No Step'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-6 mx-4 mt-4">
            <TabsTrigger value="work-items" className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.work_items')}</span>
              {counts.workItems > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.workItems}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.media')}</span>
              {counts.media > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.media}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.notes')}</span>
              {counts.notes > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.notes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.vendors')}</span>
              {counts.vendors > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.vendors}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.timeline')}</span>
              {counts.timeline > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.timeline}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="appraisal" className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.appraisal')}</span>
              {counts.appraisal > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {counts.appraisal}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Work Items Tab */}
          <TabsContent value="work-items" className="flex-1 overflow-hidden px-4 pt-4 pb-6">
            <VehicleWorkItemsTab vehicleId={selectedVehicleId} onSwitchTab={setActiveTab} />
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="flex-1 overflow-hidden px-4 pt-4 pb-6">
            <VehicleMediaTab vehicleId={selectedVehicleId} />
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-hidden px-4 pt-4 pb-6">
            <VehicleNotesTab vehicleId={selectedVehicleId} />
          </TabsContent>

          {/* Vendors Tab - NEW: Full vendor integration */}
          <TabsContent value="vendors" className="flex-1 overflow-hidden px-4 pt-4 pb-6">
            <VehicleVendorsTab vehicleId={selectedVehicleId} />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 overflow-auto px-4 pt-4 pb-8">
            {selectedVehicleId && (
              <VehicleActivityLog vehicleId={selectedVehicleId} />
            )}
          </TabsContent>

          <TabsContent value="appraisal" className="flex-1 px-4 pt-4 pb-6">
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">{t('get_ready.appraisal.coming_soon')}</div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
