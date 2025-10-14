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
            <TableHead className="w-16 py-2 bg-background">{t('get_ready.table.step')}</TableHead>
            <TableHead className="w-16 py-2 bg-background">{t('get_ready.table.image')}</TableHead>
            <TableHead className="py-2 bg-background">{t('get_ready.table.stock')}</TableHead>
            <TableHead className="py-2 bg-background">{t('get_ready.table.vehicle')}</TableHead>
            <TableHead className="w-20 text-center py-2 bg-background">{t('get_ready.table.media')}</TableHead>
            <TableHead className="w-32 py-2 bg-background">{t('get_ready.table.work_items')}</TableHead>
            <TableHead className="w-24 py-2 bg-background">{t('get_ready.table.days_in_step')}</TableHead>
            <TableHead className="w-32 py-2 bg-background">{t('get_ready.table.notes')}</TableHead>
            <TableHead className="w-20 py-2 bg-background">{t('get_ready.table.priority')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              className={cn(
                "cursor-pointer transition-colors h-12",
                selectedVehicleId === vehicle.id && "bg-muted/50"
              )}
              onClick={() => handleRowClick(vehicle)}
            >
              {/* Step Badge */}
              <TableCell className="py-1">
                <Badge
                  variant="outline"
                  className="text-xs h-5"
                  style={{
                    borderColor: vehicle.current_step_color,
                    color: vehicle.current_step_color
                  }}
                >
                  {vehicle.current_step_order}
                </Badge>
              </TableCell>

              {/* Vehicle Image */}
              <TableCell className="py-1">
                <Avatar className="h-8 w-8 rounded-sm">
                  <AvatarFallback className="rounded-sm bg-muted">
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              </TableCell>

              {/* Stock Number */}
              <TableCell className="py-1">
                <div className="font-medium text-sm">{vehicle.stock_number}</div>
              </TableCell>

              {/* Vehicle Info */}
              <TableCell className="py-1">
                <div className="font-medium text-sm">
                  {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model} {vehicle.vehicle_trim && `(${vehicle.vehicle_trim})`}
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground/60">L8V: </span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {(vehicle.vin || vehicle.short_vin)?.slice(-8)}
                  </span>
                </div>
              </TableCell>

              {/* Media Count */}
              <TableCell className="text-center py-1">
                <div className="flex items-center justify-center gap-1">
                  <Image className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{vehicle.media_count}</span>
                </div>
              </TableCell>

              {/* Work Items */}
              <TableCell className="py-1">
                <div className="flex flex-wrap gap-1">
                  {vehicle.work_item_counts?.pending && vehicle.work_item_counts.pending > 0 && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5 text-yellow-600" />
                      {vehicle.work_item_counts.pending}
                    </Badge>
                  )}
                  {vehicle.work_item_counts?.in_progress && vehicle.work_item_counts.in_progress > 0 && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      <Circle className="h-2.5 w-2.5 mr-0.5 text-blue-600" />
                      {vehicle.work_item_counts.in_progress}
                    </Badge>
                  )}
                  {vehicle.work_item_counts?.completed && vehicle.work_item_counts.completed > 0 && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      <CheckCircle className="h-2.5 w-2.5 mr-0.5 text-green-600" />
                      {vehicle.work_item_counts.completed}
                    </Badge>
                  )}
                  {/* Show placeholder when no work items data */}
                  {!vehicle.work_item_counts && (
                    <span className="text-xs text-muted-foreground">
                      {t('get_ready.table.no_work_items')}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Days in Step */}
              <TableCell className="py-1">
                <div className="text-sm font-medium">{vehicle.days_in_step}</div>
              </TableCell>

              {/* Notes Preview */}
              <TableCell className="py-1">
                <div className="text-xs text-muted-foreground line-clamp-1 max-w-32">
                  {vehicle.notes_preview || t('get_ready.table.no_notes')}
                </div>
              </TableCell>

              {/* Priority */}
              <TableCell className="py-1">
                <Badge
                  variant="outline"
                  className={cn("text-xs h-5", getPriorityColor(vehicle.priority))}
                >
                  {t(`common.priority.${vehicle.priority}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
