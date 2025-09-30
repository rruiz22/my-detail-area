import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetReady } from '@/hooks/useGetReady';
import { useGetReadyVehiclesList } from '@/hooks/useGetReadyVehicles';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    ArrowRight,
    Car,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    Loader2,
    MoreHorizontal,
    User,
    XCircle
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GetReadyVehicleListProps {
  searchQuery: string;
  selectedStep: string;
  selectedWorkflow: string;
  selectedPriority: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  className?: string;
}

export function GetReadyVehicleList({
  searchQuery,
  selectedStep,
  selectedWorkflow,
  selectedPriority,
  sortBy,
  sortOrder,
  className
}: GetReadyVehicleListProps) {
  const { t } = useTranslation();
  const { steps } = useGetReady();
  const { setSelectedVehicleId, selectedVehicleId } = useGetReadyStore();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Action handlers
  const handleViewDetails = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleEditVehicle = (vehicleId: string) => {
    // TODO: Open edit modal - will be connected to parent component's modal
    console.log('Edit vehicle:', vehicleId);
  };

  const handleAdvanceStep = (vehicleId: string) => {
    // TODO: Implement advance to next step functionality
    console.log('Advance step for vehicle:', vehicleId);
  };

  // Fetch real vehicles from Supabase
  const { data: vehicles = [], isLoading } = useGetReadyVehiclesList({
    searchQuery,
    selectedStep,
    selectedWorkflow,
    selectedPriority,
    sortBy,
    sortOrder
  });

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
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Vehicles ({vehicles.length})
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
          </div>
        </div>

        {/* Grid View */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{vehicle.stock_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('get_ready.actions.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetails(vehicle.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.view_details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditVehicle(vehicle.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.edit_vehicle')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAdvanceStep(vehicle.id)}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.advance_step')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status and Progress */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={getWorkflowColor(vehicle.workflow_type)}>
                    {t(`get_ready.workflow.${vehicle.workflow_type}`)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {getSLAStatusIcon(vehicle.sla_status)}
                    <span className="text-xs text-muted-foreground">
                      {vehicle.progress}%
                    </span>
                  </div>
                </div>

                <Progress value={vehicle.progress} className="h-2" />

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Step:</span>
                    <div className="font-medium">{vehicle.step_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">T2L:</span>
                    <div className="font-medium">{vehicle.t2l}d</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DIS:</span>
                    <div className="font-medium">{vehicle.days_in_step}d</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DTF:</span>
                    <div className="font-medium">{vehicle.days_to_frontline}d</div>
                  </div>
                </div>

                {/* Assigned To */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{vehicle.assigned_to}</span>
                  <Badge size="sm" className={getPriorityColor(vehicle.priority)}>
                    {vehicle.priority}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Table View
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Vehicles ({vehicles.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="h-full flex flex-col">
        <div className="flex-none p-4 border-b">
          <p className="text-sm text-muted-foreground">
            {t('get_ready.table.click_to_view')}
          </p>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[100px]">{t('get_ready.table.image')}</TableHead>
                <TableHead>{t('get_ready.table.stock')}</TableHead>
                <TableHead>{t('get_ready.table.vehicle')}</TableHead>
                <TableHead>{t('get_ready.table.step')}</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>T2L</TableHead>
                <TableHead>{t('get_ready.table.days_in_step')}</TableHead>
                <TableHead>DTF</TableHead>
                <TableHead>{t('get_ready.table.priority')}</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  onClick={() => handleViewDetails(vehicle.id)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedVehicleId === vehicle.id && "bg-primary/10 border-l-4 border-l-primary"
                  )}
                >
                {/* Image */}
                <TableCell>
                  <Avatar className="h-10 w-14 rounded">
                    <AvatarImage src={vehicle.images[0]} alt={`${vehicle.make} ${vehicle.model}`} />
                    <AvatarFallback>
                      <Car className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </TableCell>

                {/* Stock Number */}
                <TableCell className="font-medium">
                  {vehicle.stock_number}
                </TableCell>

                {/* Vehicle Info */}
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {vehicle.trim} • {vehicle.vin.slice(-6)}
                    </div>
                  </div>
                </TableCell>

                {/* Step */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: steps.find(s => s.id === vehicle.step_id)?.color }}
                    />
                    {vehicle.step_name}
                  </div>
                </TableCell>

                {/* Workflow */}
                <TableCell>
                  <Badge variant="outline" className={getWorkflowColor(vehicle.workflow_type)}>
                    {t(`get_ready.workflow.${vehicle.workflow_type}`)}
                  </Badge>
                </TableCell>

                {/* T2L */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getSLAStatusIcon(vehicle.sla_status)}
                    <span className="font-medium">{vehicle.t2l}d</span>
                  </div>
                </TableCell>

                {/* Days in Step */}
                <TableCell>
                  <span className="font-medium">{vehicle.days_in_step}d</span>
                </TableCell>

                {/* Days to Frontline */}
                <TableCell>
                  <span className="font-medium">{vehicle.days_to_frontline}d</span>
                </TableCell>

                {/* Priority */}
                <TableCell>
                  <Badge size="sm" className={getPriorityColor(vehicle.priority)}>
                    {vehicle.priority}
                  </Badge>
                </TableCell>

                {/* Progress */}
                <TableCell>
                  <div className="w-24">
                    <div className="flex items-center gap-2">
                      <Progress value={vehicle.progress} className="h-2" />
                      <span className="text-xs text-muted-foreground w-8">
                        {vehicle.progress}%
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Assigned */}
                <TableCell>
                  <div className="text-sm">{vehicle.assigned_to}</div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('get_ready.actions.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetails(vehicle.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.view_details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditVehicle(vehicle.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.edit_vehicle')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAdvanceStep(vehicle.id)}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        {t('get_ready.actions.advance_step')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Empty State */}
      {vehicles.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">{t('get_ready.no_vehicles.title')}</h3>
              <p>{t('get_ready.no_vehicles.description')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
