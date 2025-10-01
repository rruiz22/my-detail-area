import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  Image,
  MessageSquare,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Circle,
  X,
  GripHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicleDetail } from '@/hooks/useGetReadyVehicles';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { VehicleWorkItemsTab } from './tabs/VehicleWorkItemsTab';
import { VehicleMediaTab } from './tabs/VehicleMediaTab';
import { VehicleVendorsTab } from './tabs/VehicleVendorsTab';
import { useWorkItems } from '@/hooks/useVehicleWorkItems';
import { useVehicleMedia } from '@/hooks/useVehicleMedia';

interface VehicleDetailPanelProps {
  className?: string;
}

export function VehicleDetailPanel({ className }: VehicleDetailPanelProps) {
  const { t } = useTranslation();
  const { selectedVehicleId, setSelectedVehicleId } = useGetReadyStore();
  const { data: vehicleDetail, isLoading } = useVehicleDetail(selectedVehicleId);

  // Panel resize functionality
  const MIN_HEIGHT = 600;  // Minimum height in pixels for desktop
  const MAX_HEIGHT = 800;  // Maximum height in pixels
  const DEFAULT_HEIGHT = 500; // Default height in pixels

  const [panelHeight, setPanelHeight] = useState(() => {
    // Load saved height from localStorage or use default
    const saved = localStorage.getItem('vehicle-detail-panel-height');
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  });

  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const panelRect = panelRef.current.getBoundingClientRect();
      const newHeight = e.clientY - panelRect.top;

      // Clamp between MIN and MAX
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      setPanelHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save to localStorage
      localStorage.setItem('vehicle-detail-panel-height', panelHeight.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelHeight]);

  // Update cursor during resize
  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Fetch counts for each tab
  const { data: workItems = [] } = useWorkItems(selectedVehicleId);
  const { data: mediaFiles = [] } = useVehicleMedia(selectedVehicleId || '');

  // Calculate counts for each tab
  const counts = React.useMemo(() => {
    const workItemsWithVendors = workItems.filter(wi => wi.assigned_vendor_id);

    return {
      workItems: workItems.length,
      media: mediaFiles.length,
      notes: 0, // TODO: Implement notes count when notes feature is ready
      vendors: workItemsWithVendors.length,
      timeline: 0, // TODO: Implement timeline count when timeline feature is ready
      appraisal: 0 // TODO: Implement appraisal count when appraisal feature is ready
    };
  }, [workItems, mediaFiles]);

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

  const vehicle = vehicleDetail as Record<string, unknown>;

  return (
    <div
      ref={panelRef}
      className={cn("flex flex-col bg-background border rounded-lg shadow-lg animate-in slide-in-from-bottom duration-300 relative", className)}
      style={{ height: `${panelHeight}px` }}
    >
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-primary/20 transition-colors group z-50",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className={cn(
            "bg-muted/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm",
            isResizing && "opacity-100"
          )}>
            <GripHorizontal className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Vehicle Header */}
      <div className="p-4 border-b bg-card/50 relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleClose}
          aria-label={t('get_ready.detail_panel.close')}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-between pr-10">
          <div>
            <h2 className="text-lg font-semibold">
              {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Stock: {vehicle.stock_number}</span>
              <span>•</span>
              <span>VIN: {vehicle.vin}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              ${vehicle.retail_value?.toLocaleString() || 'N/A'}
            </div>
            <Badge variant="outline" className="text-xs">
              {vehicle.current_step?.name || 'No Step'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="work-items" className="h-full flex flex-col">
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
          <TabsContent value="work-items" className="flex-1 overflow-hidden p-4">
            <VehicleWorkItemsTab vehicleId={selectedVehicleId} />
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="flex-1 overflow-hidden p-4">
            <VehicleMediaTab vehicleId={selectedVehicleId} />
          </TabsContent>

          <TabsContent value="notes" className="flex-1 p-4">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">{t('get_ready.notes.coming_soon')}</div>
            </div>
          </TabsContent>

          {/* Vendors Tab - NEW: Full vendor integration */}
          <TabsContent value="vendors" className="flex-1 overflow-hidden p-4">
            <VehicleVendorsTab vehicleId={selectedVehicleId} />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 p-4">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">{t('get_ready.timeline.coming_soon')}</div>
            </div>
          </TabsContent>

          <TabsContent value="appraisal" className="flex-1 p-4">
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
