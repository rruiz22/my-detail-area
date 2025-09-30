import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockVehicles } from '@/data/mockVehicles';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    ArrowRight,
    Car,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    MoreHorizontal,
    User,
    XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Using centralized mock vehicle data

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter and sort vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = mockVehicles.filter(vehicle => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!vehicle.stock_number.toLowerCase().includes(query) &&
            !vehicle.vin.toLowerCase().includes(query) &&
            !`${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase().includes(query) &&
            !vehicle.assigned_to.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Step filter
      if (selectedStep !== 'all' && vehicle.step_id !== selectedStep) {
        return false;
      }

      // Workflow filter
      if (selectedWorkflow !== 'all' && vehicle.workflow_type !== selectedWorkflow) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && vehicle.priority !== selectedPriority) {
        return false;
      }

      return true;
    });

    // Sort vehicles
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchQuery, selectedStep, selectedWorkflow, selectedPriority, sortBy, sortOrder]);

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

  if (viewMode === 'grid') {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Vehicles ({filteredAndSortedVehicles.length})
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
          {filteredAndSortedVehicles.map((vehicle) => (
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
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Vehicle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Advance Step
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
          Vehicles ({filteredAndSortedVehicles.length})
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
      <Card>
        <Table>
          <TableHeader>
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
            {filteredAndSortedVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
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
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Vehicle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Advance Step
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Empty State */}
      {filteredAndSortedVehicles.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
              <p>Try adjusting your filters or search criteria.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
