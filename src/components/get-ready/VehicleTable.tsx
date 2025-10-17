import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useGetReadyStore, type ReconVehicle } from '@/hooks/useGetReadyStore';
import { useOverviewTable } from '@/hooks/useGetReadyVehicles';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    CheckCircle,
    Circle,
    Clock,
    Eye,
    FileText,
    Image,
    Pause,
    Printer,
    RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VehicleTableProps {
  className?: string;
}

export function VehicleTable({ className }: VehicleTableProps) {
  const { t } = useTranslation();
  const { data: vehicles, isLoading } = useOverviewTable();
  const { selectedVehicleId, setSelectedVehicleId } = useGetReadyStore();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Circle className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'on_hold': return <Pause className="h-4 w-4 text-gray-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleRowClick = (vehicle: ReconVehicle) => {
    setSelectedVehicleId(vehicle.id === selectedVehicleId ? null : vehicle.id);
  };

  if (isLoading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className={cn("border rounded-lg p-8 text-center", className)}>
        <div className="text-muted-foreground">
          <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {t('get_ready.no_vehicles.title')}
          </h3>
          <p className="text-sm">
            {t('get_ready.no_vehicles.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Table Header with Actions */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">
              {t('get_ready.vehicle_list.title', 'Vehicle List')}
            </h3>
            <Badge variant="outline" className="text-xs">
              {vehicles?.length || 0} {t('get_ready.vehicle_list.vehicles', 'vehicles')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('get_ready.table.click_to_view', 'Click on a row to view vehicle details')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>

          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            {t('common.print', 'Print')}
          </Button>
        </div>
      </div>

      <div className="overflow-auto max-h-[320px]">
      <Table data-sticky-header>
        <TableHeader className="sticky top-0 bg-background z-10 after:absolute after:inset-x-0 after:bottom-0 after:border-b">
          <TableRow className="h-9 hover:bg-transparent border-b-0">
            <TableHead className="w-12 py-2 bg-background text-center">#</TableHead>
            <TableHead className="py-2 bg-background">{t('get_ready.table.vehicle_stock')}</TableHead>
            <TableHead className="w-32 py-2 bg-background">{t('get_ready.table.step_workflow')}</TableHead>
            <TableHead className="w-40 py-2 bg-background">{t('get_ready.table.progress_time')}</TableHead>
            <TableHead className="w-24 py-2 bg-background">{t('get_ready.table.priority')}</TableHead>
            <TableHead className="w-16 py-2 bg-background text-center">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle, index) => (
            <TableRow
              key={vehicle.id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedVehicleId === vehicle.id && "bg-muted/50"
              )}
              onClick={() => handleRowClick(vehicle)}
            >
              {/* Row Number */}
              <TableCell className="py-2 text-center text-xs font-medium text-muted-foreground">
                {index + 1}
              </TableCell>

              {/* Vehicle & Stock - Grouped */}
              <TableCell className="py-2">
                <div className="flex items-start gap-2">
                  <Avatar className="h-10 w-10 rounded-sm flex-shrink-0">
                    <AvatarFallback className="rounded-sm bg-muted">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">
                      {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                      {vehicle.vehicle_trim && <span className="text-muted-foreground"> ({vehicle.vehicle_trim})</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-medium">ST: {vehicle.stock_number}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="font-mono">
                          VIN: {(vehicle.vin || vehicle.short_vin)?.slice(-8)}
                        </span>
                      </div>
                      {/* Small media/notes badges */}
                      {((vehicle.media_count ?? 0) > 0 || (vehicle.notes_preview?.length ?? 0) > 0) && (
                        <div className="flex items-center gap-1">
                          {(vehicle.media_count ?? 0) > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-100 text-purple-700 gap-0.5">
                              <Image className="h-2.5 w-2.5" />
                              {vehicle.media_count}
                            </Badge>
                          )}
                          {(vehicle.notes_preview?.length ?? 0) > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-700 gap-0.5">
                              <FileText className="h-2.5 w-2.5" />
                              {vehicle.notes_preview.length}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Step & Workflow - Grouped */}
              <TableCell className="py-2">
                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className="text-xs font-medium"
                    style={{
                      borderColor: vehicle.current_step_color,
                      color: vehicle.current_step_color
                    }}
                  >
                    {vehicle.current_step_name}
                  </Badge>
                  <div className="text-xs text-muted-foreground capitalize">
                    {vehicle.workflow_type || 'Standard'}
                  </div>
                </div>
              </TableCell>

              {/* Progress & Time - Grouped */}
              <TableCell className="py-2">
                <div className="space-y-1.5">
                  {/* Time in Step */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{vehicle.days_in_step}</span>
                  </div>

                  {/* Work Items Counts */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {vehicle.work_item_counts?.pending > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        {vehicle.work_item_counts.pending}
                      </span>
                    )}
                    {vehicle.work_item_counts?.in_progress > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-blue-600">
                        <Circle className="h-3 w-3" />
                        {vehicle.work_item_counts.in_progress}
                      </span>
                    )}
                    {vehicle.work_item_counts?.completed > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {vehicle.work_item_counts.completed}
                      </span>
                    )}
                    {vehicle.media_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Image className="h-3 w-3" />
                        {vehicle.media_count}
                      </span>
                    )}
                  </div>

                  {/* Assigned To */}
                  <div className="text-xs text-muted-foreground">
                    👤 {vehicle.assigned_to || t('get_ready.table.unassigned')}
                  </div>
                </div>
              </TableCell>

              {/* Priority */}
              <TableCell className="py-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getPriorityColor(vehicle.priority))}
                >
                  {t(`common.priority.${vehicle.priority}`)}
                </Badge>
              </TableCell>

              {/* Actions */}
              <TableCell className="py-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(vehicle);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
