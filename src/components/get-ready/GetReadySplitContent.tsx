import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import { Download, MoreHorizontal, Plus, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { GetReadyAlerts } from './GetReadyAlerts';
import { GetReadyDashboardWidget } from './GetReadyDashboardWidget';
import { GetReadyVehicleList } from './GetReadyVehicleList';
import { GetReadyWorkflowActions } from './GetReadyWorkflowActions';
import { VehicleDetailPanel } from './VehicleDetailPanel';
import { VehicleTable } from './VehicleTable';
import { VehicleFormModal } from './VehicleFormModal';

interface GetReadySplitContentProps {
  className?: string;
}

export function GetReadySplitContent({ className }: GetReadySplitContentProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { splitLayout, selectedStepId, selectedVehicleId } = useGetReadyStore();
  const { steps, refetchSteps, refetchKPIs } = useGetReady();

  // State for filters when in details view
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('days_in_step');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Vehicle form modal state
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Use the selected step from sidebar, or 'all' if none selected
  const selectedStep = selectedStepId || 'all';

  const handleRefresh = () => {
    refetchSteps();
    refetchKPIs();
  };

  const hasActiveFilters = selectedWorkflow !== 'all' || selectedPriority !== 'all' || searchQuery.length > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedWorkflow('all');
    setSelectedPriority('all');
  };

  // Determine which content to show based on route
  const isOverview = location.pathname === '/get-ready' || location.pathname === '/get-ready/';
  const isDetailsView = location.pathname === '/get-ready/details';

  // Overview Tab - Dashboard Content
  if (isOverview) {
    return (
      <div className={cn("h-full overflow-auto space-y-6", className)}>
        {/* KPIs Dashboard */}
        <GetReadyDashboardWidget />

        {/* Quick Actions and Alerts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoreHorizontal className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GetReadyWorkflowActions />
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <GetReadyAlerts compact />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Details View Tab - Enhanced Vehicle List
  if (isDetailsView) {
    return (
      <div className={cn("h-full flex flex-col space-y-4", className)}>
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedStep === 'all'
                ? 'Vehicle Management'
                : `${steps.find(s => s.id === selectedStep)?.name || 'Step'} - Vehicles`
              }
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedStep === 'all'
                ? 'Enhanced vehicle list with advanced filtering'
                : `Showing vehicles in ${steps.find(s => s.id === selectedStep)?.name || 'selected'} step`
              }
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.actions.refresh')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.actions.export')}
            </Button>
            <Button size="sm" onClick={() => {
              setEditingVehicleId(null);
              setVehicleFormOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('get_ready.vehicle_form.add_vehicle')}
            </Button>
          </div>
        </div>

        {/* Compact Filters Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border">
          {/* Step indicator (read-only from sidebar) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Step:</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {selectedStep === 'all' ? 'All Steps' : steps.find(s => s.id === selectedStep)?.name || 'All Steps'}
            </Badge>
          </div>

          {/* Workflow filter */}
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="standard">{t('get_ready.workflow.standard')}</SelectItem>
              <SelectItem value="express">{t('get_ready.workflow.express')}</SelectItem>
              <SelectItem value="priority">{t('get_ready.workflow.priority')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days_in_step">Days in Step</SelectItem>
                <SelectItem value="days_to_frontline">Days to Finish</SelectItem>
                <SelectItem value="priority_score">Priority Score</SelectItem>
                <SelectItem value="sla_status">SLA Status</SelectItem>
                <SelectItem value="stock_number">Stock Number</SelectItem>
                <SelectItem value="created_at">Date Added</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          <div className="flex-1" />

          {/* Clear filters button (only when active) */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Enhanced Vehicle List with Detail Panel Below */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Vehicle List - Fixed height to show 4 rows with infinite scroll */}
          <div className="flex-none">
            <GetReadyVehicleList
              searchQuery={searchQuery}
              selectedStep={selectedStep}
              selectedWorkflow={selectedWorkflow}
              selectedPriority={selectedPriority}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </div>

          {/* Detail Panel Below - Only when vehicle is selected */}
          {selectedVehicleId && (
            <div className="flex-none border-t pt-4">
              <VehicleDetailPanel />
            </div>
          )}
        </div>

        {/* Vehicle Form Modal */}
        <VehicleFormModal
          open={vehicleFormOpen}
          onOpenChange={setVehicleFormOpen}
          vehicleId={editingVehicleId}
          onSuccess={() => {
            refetchSteps();
            refetchKPIs();
          }}
        />
      </div>
    );
  }

  // Default: Original Table/Detail Panel Layout for other tabs
  if (!splitLayout) {
    return (
      <div className={cn("h-full", className)}>
        <VehicleTable className="h-full" />
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Upper Panel - Vehicle Table */}
      <div className="flex-1 min-h-0 border-b">
        <VehicleTable className="h-full" />
      </div>

      {/* Lower Panel - Vehicle Detail */}
      <div className="h-96 min-h-0">
        <VehicleDetailPanel className="h-full" />
      </div>
    </div>
  );
}
