import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, FileText, Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface WorkItem {
  id: string;
  title: string;
  description?: string;
  work_type: string;
  estimated_cost?: number;
  priority?: string;
}

interface PendingVehicle {
  id: string;
  stock_number: string;
  year?: number;
  vehicle_year?: number;
  make?: string;
  vehicle_make?: string;
  model?: string;
  vehicle_model?: string;
  vehicle_trim?: string;
  vin?: string;
  short_vin?: string;
  workflow_type?: string;
  days_in_step?: string;
  step_name?: string;
  intake_date?: string;
  media_count?: number;
  notes_preview?: any[];
  pending_approval_work_items?: WorkItem[];
  work_items?: WorkItem[];
}

interface PendingApprovalsTableProps {
  vehicles: PendingVehicle[];
  onSelectVehicle: (vehicleId: string) => void;
}

export function PendingApprovalsTable({ vehicles, onSelectVehicle }: PendingApprovalsTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRowClick = (vehicleId: string) => {
    onSelectVehicle(vehicleId);
    navigate('/get-ready/details');
  };

  const getWorkItems = (vehicle: PendingVehicle): WorkItem[] => {
    return vehicle.pending_approval_work_items || vehicle.work_items || [];
  };

  const calculateDaysWaiting = (intakeDate?: string) => {
    if (!intakeDate) return 0;
    const days = Math.floor((Date.now() - new Date(intakeDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getPriorityColor = (days: number) => {
    if (days >= 7) return 'text-red-600';
    if (days >= 3) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('get_ready.approvals.queue.pending_title')}</span>
            <Badge variant="secondary">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {t('get_ready.approvals.queue.no_pending')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('get_ready.approvals.queue.pending_title')}</span>
          <Badge variant="secondary">{vehicles.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-visible">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px] w-[20%] text-center">Vehicle</TableHead>
                <TableHead className="min-w-[90px] w-[8%] text-center">Workflow</TableHead>
                <TableHead className="min-w-[100px] w-[10%] text-center">Current Step</TableHead>
                <TableHead className="min-w-[70px] w-[8%] text-center">Days</TableHead>
                <TableHead className="min-w-[70px] w-[8%] text-center">Work Items</TableHead>
                <TableHead className="min-w-[200px] text-center">Items Needing Approval</TableHead>
                <TableHead className="min-w-[60px] w-[6%] text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const workItems = getWorkItems(vehicle);
                const daysWaiting = calculateDaysWaiting(vehicle.intake_date);
                const year = vehicle.year || vehicle.vehicle_year;
                const make = vehicle.make || vehicle.vehicle_make;
                const model = vehicle.model || vehicle.vehicle_model;

                return (
                  <TableRow
                    key={vehicle.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => handleRowClick(vehicle.id)}
                  >
                    {/* Vehicle Info - Matches GetReadyVehicleList format */}
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-1">
                        {/* Vehicle Name */}
                        <div className="font-medium text-sm text-foreground text-center">
                          {year} {make} {model}
                          {vehicle.vehicle_trim && <span className="text-muted-foreground"> ({vehicle.vehicle_trim})</span>}
                        </div>
                        {/* Stock & VIN */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">ST: {vehicle.stock_number}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="font-mono">
                            VIN: {(vehicle.vin || vehicle.short_vin)?.slice(-8) || 'N/A'}
                          </span>
                        </div>
                        {/* Media/Notes Badges */}
                        {((vehicle.media_count ?? 0) > 0 || (vehicle.notes_preview?.length ?? 0) > 0) && (
                          <div className="flex items-center justify-center gap-1 mt-0.5">
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
                    </TableCell>

                    {/* Workflow Type */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-xs">
                          {vehicle.workflow_type?.toUpperCase() || 'STANDARD'}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Current Step */}
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {vehicle.step_name || 'N/A'}
                      </span>
                    </TableCell>

                    {/* Days Waiting */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className={cn('h-3 w-3', getPriorityColor(daysWaiting))} />
                        <span className={cn('text-sm font-medium', getPriorityColor(daysWaiting))}>
                          {daysWaiting}d
                        </span>
                      </div>
                    </TableCell>

                    {/* Work Items Count */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="text-xs">
                          {workItems.length}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Work Items Details */}
                    <TableCell className="text-center">
                      <div className="space-y-1.5 max-w-md">
                        {workItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded border border-amber-200 dark:border-amber-800"
                          >
                            <AlertCircle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground line-clamp-1">
                                {item.title}
                              </span>
                              {item.estimated_cost && (
                                <span className="text-muted-foreground ml-1">
                                  (${item.estimated_cost.toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {workItems.length > 3 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            +{workItems.length - 3} more...
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
