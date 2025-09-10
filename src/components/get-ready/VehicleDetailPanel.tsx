import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Image, 
  MessageSquare, 
  Users, 
  Clock, 
  DollarSign,
  Plus,
  AlertTriangle,
  CheckCircle,
  Circle,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicleDetail } from '@/hooks/useGetReadyVehicles';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';

interface VehicleDetailPanelProps {
  className?: string;
}

export function VehicleDetailPanel({ className }: VehicleDetailPanelProps) {
  const { t } = useTranslation();
  const { selectedVehicleId } = useGetReadyStore();
  const { data: vehicleDetail, isLoading } = useVehicleDetail(selectedVehicleId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Circle className="h-4 w-4 text-blue-600" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'declined': return <Pause className="h-4 w-4 text-red-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'declined': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!selectedVehicleId) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/20", className)}>
        <div className="text-center text-muted-foreground">
          <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {t('get_ready.detail_panel.no_selection.title')}
          </h3>
          <p className="text-sm">
            {t('get_ready.detail_panel.no_selection.description')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!vehicleDetail) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {t('get_ready.detail_panel.error.title')}
          </h3>
          <p className="text-sm">
            {t('get_ready.detail_panel.error.description')}
          </p>
        </div>
      </div>
    );
  }

  const vehicle = vehicleDetail.vehicle_info as any;
  const workItems = (vehicleDetail.work_items as any[]) || [];
  const media = (vehicleDetail.media as any[]) || [];
  const notes = (vehicleDetail.notes as any[]) || [];

  // Calculate work item counters
  const workItemCounters = workItems.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const needAttention = (workItemCounters.pending || 0) + (workItems.filter((item: any) => item.approval_required).length || 0);
  const inProgress = workItemCounters.in_progress || 0;
  const declined = workItemCounters.declined || 0;
  const completed = workItemCounters.completed || 0;

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Vehicle Header */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-center justify-between">
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
            <TabsTrigger value="work-items" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.work_items')}</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.media')}</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.notes')}</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.vendors')}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.timeline')}</span>
            </TabsTrigger>
            <TabsTrigger value="appraisal" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{t('get_ready.tabs.appraisal')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Work Items Tab */}
          <TabsContent value="work-items" className="flex-1 overflow-hidden p-4">
            <div className="h-full flex flex-col">
              {/* Counters */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="text-2xl font-bold">{needAttention}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('get_ready.work_items.need_attention')}
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{inProgress}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('get_ready.work_items.in_progress')}
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">{declined}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('get_ready.work_items.declined')}
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{completed}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('get_ready.work_items.completed')}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Add Work Item Button */}
              <div className="mb-4">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('get_ready.work_items.add_work_item')}
                </Button>
              </div>

              {/* Work Items List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {workItems.length > 0 ? (
                  workItems.map((item: any) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(item.status)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={cn("text-xs", getStatusColor(item.status))}>
                                {t(`get_ready.work_items.status.${item.status}`)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.work_type}
                              </Badge>
                              {item.estimated_cost > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ${item.estimated_cost}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">{t('get_ready.work_items.no_items')}</div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Other tabs with placeholder content */}
          <TabsContent value="media" className="flex-1 p-4">
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">{t('get_ready.media.coming_soon')}</div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="flex-1 p-4">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">{t('get_ready.notes.coming_soon')}</div>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="flex-1 p-4">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">{t('get_ready.vendors.coming_soon')}</div>
            </div>
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
