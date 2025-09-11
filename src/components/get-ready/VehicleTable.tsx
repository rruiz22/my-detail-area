import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Image, 
  FileText, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Pause,
  RefreshCw,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOverviewTable } from '@/hooks/useGetReadyVehicles';
import { useGetReadyStore, type ReconVehicle } from '@/hooks/useGetReadyStore';

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
    <div className={cn("border rounded-lg", className)}>
      {/* Table Header with Actions */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">
            {t('get_ready.vehicle_list.title', 'Vehicle List')}
          </h3>
          <Badge variant="outline" className="text-xs">
            {vehicles?.length || 0} {t('get_ready.vehicle_list.vehicles', 'vehicles')}
          </Badge>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('get_ready.table.step')}</TableHead>
            <TableHead className="w-16">{t('get_ready.table.image')}</TableHead>
            <TableHead>{t('get_ready.table.stock')}</TableHead>
            <TableHead>{t('get_ready.table.vehicle')}</TableHead>
            <TableHead className="w-20 text-center">{t('get_ready.table.media')}</TableHead>
            <TableHead className="w-32">{t('get_ready.table.work_items')}</TableHead>
            <TableHead className="w-24">{t('get_ready.table.days_in_step')}</TableHead>
            <TableHead className="w-32">{t('get_ready.table.notes')}</TableHead>
            <TableHead className="w-20">{t('get_ready.table.priority')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedVehicleId === vehicle.id && "bg-muted/50"
              )}
              onClick={() => handleRowClick(vehicle)}
            >
              {/* Step Badge */}
              <TableCell>
                <Badge 
                  variant="outline"
                  className="text-xs"
                  style={{ 
                    borderColor: vehicle.current_step_color,
                    color: vehicle.current_step_color 
                  }}
                >
                  {vehicle.current_step_order}
                </Badge>
              </TableCell>

              {/* Vehicle Image */}
              <TableCell>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarFallback className="rounded-md bg-muted">
                    <Image className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              </TableCell>

              {/* Stock Number */}
              <TableCell>
                <div className="font-medium">{vehicle.stock_number}</div>
                <div className="text-xs text-muted-foreground">
                  {vehicle.short_vin}
                </div>
              </TableCell>

              {/* Vehicle Info */}
              <TableCell>
                <div className="font-medium">
                  {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                </div>
                {vehicle.vehicle_trim && (
                  <div className="text-xs text-muted-foreground">
                    {vehicle.vehicle_trim}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {vehicle.current_step_name}
                </div>
              </TableCell>

              {/* Media Count */}
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{vehicle.media_count}</span>
                </div>
              </TableCell>

              {/* Work Items */}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {vehicle.work_item_counts?.pending && vehicle.work_item_counts.pending > 0 && (
                    <Badge variant="outline" className="text-xs h-5">
                      <AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
                      {vehicle.work_item_counts.pending}
                    </Badge>
                  )}
                  {vehicle.work_item_counts?.in_progress && vehicle.work_item_counts.in_progress > 0 && (
                    <Badge variant="outline" className="text-xs h-5">
                      <Circle className="h-3 w-3 mr-1 text-blue-600" />
                      {vehicle.work_item_counts.in_progress}
                    </Badge>
                  )}
                  {vehicle.work_item_counts?.completed && vehicle.work_item_counts.completed > 0 && (
                    <Badge variant="outline" className="text-xs h-5">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
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
              <TableCell>
                <div className="text-sm font-medium">{vehicle.days_in_step}</div>
              </TableCell>

              {/* Notes Preview */}
              <TableCell>
                <div className="text-xs text-muted-foreground line-clamp-2 max-w-32">
                  {vehicle.notes_preview || t('get_ready.table.no_notes')}
                </div>
              </TableCell>

              {/* Priority */}
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getPriorityColor(vehicle.priority))}
                >
                  {t(`common.priority.${vehicle.priority}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}