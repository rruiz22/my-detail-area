import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAssignVendorToWorkItem, useWorkItems } from '@/hooks/useVehicleWorkItems';
import { useVendors } from '@/hooks/useVendors';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Briefcase,
    CheckCircle2,
    Circle,
    Clock,
    DollarSign,
    Users
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleVendorsTabProps {
  vehicleId: string;
  className?: string;
}

export function VehicleVendorsTab({ vehicleId, className }: VehicleVendorsTabProps) {
  const { t } = useTranslation();
  const { data: workItems = [], isLoading: workItemsLoading } = useWorkItems(vehicleId);
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const assignVendor = useAssignVendorToWorkItem();

  const handleAssignVendor = async (workItemId: string, vendorId: string) => {
    await assignVendor.mutateAsync({
      workItemId,
      vendorId: vendorId === 'unassign' ? null : vendorId,
      vehicleId
    });
  };

  // Calculate vendor summary
  const vendorSummary = React.useMemo(() => {
    const workItemsWithVendors = workItems.filter(wi => wi.assigned_vendor_id);
    const uniqueVendorIds = [...new Set(workItemsWithVendors.map(wi => wi.assigned_vendor_id))];

    const totalEstimatedCost = workItemsWithVendors.reduce((sum, wi) => sum + (wi.estimated_cost || 0), 0);
    const totalActualCost = workItemsWithVendors.reduce((sum, wi) => sum + (wi.actual_cost || 0), 0);
    const completedCount = workItemsWithVendors.filter(wi => wi.status === 'completed').length;
    const inProgressCount = workItemsWithVendors.filter(wi => wi.status === 'in_progress').length;
    const pendingCount = workItemsWithVendors.filter(wi => wi.status === 'pending').length;

    return {
      totalVendors: uniqueVendorIds.length,
      totalWorkItems: workItemsWithVendors.length,
      estimatedCost: totalEstimatedCost,
      actualCost: totalActualCost,
      completed: completedCount,
      inProgress: inProgressCount,
      pending: pendingCount
    };
  }, [workItems]);

  // Group work items by vendor
  const workItemsByVendor = React.useMemo(() => {
    const grouped = new Map<string, typeof workItems>();

    workItems.forEach(workItem => {
      if (workItem.assigned_vendor_id) {
        const existing = grouped.get(workItem.assigned_vendor_id) || [];
        grouped.set(workItem.assigned_vendor_id, [...existing, workItem]);
      }
    });

    return grouped;
  }, [workItems]);

  const isLoading = workItemsLoading || vendorsLoading;

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state only if there are NO work items at all
  if (workItems.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="text-center text-muted-foreground max-w-md">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {t('get_ready.vendors.no_vendors_assigned')}
          </h3>
          <p className="text-sm mb-4">
            {t('get_ready.vendors.no_vendors_assigned_description')}
          </p>
          <Button variant="outline" size="sm">
            <Briefcase className="h-4 w-4 mr-2" />
            {t('get_ready.vendors.assign_vendor_to_work_item')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards - Only show if there are vendors assigned */}
      {vendorSummary.totalWorkItems > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('get_ready.vendors.total_vendors')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{vendorSummary.totalVendors}</div>
              <Users className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {vendorSummary.totalWorkItems} {t('get_ready.vendors.work_items')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('get_ready.vendors.estimated_cost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${vendorSummary.estimatedCost.toLocaleString()}</div>
              <DollarSign className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('get_ready.vendors.actual')}: ${vendorSummary.actualCost.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('get_ready.vendors.progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium">{vendorSummary.completed}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Circle className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{vendorSummary.inProgress}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">{vendorSummary.pending}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((vendorSummary.completed / vendorSummary.totalWorkItems) * 100)}% {t('common.completed')}
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Vendors List - Only show if there are vendors assigned */}
      {vendorSummary.totalWorkItems > 0 && (
      <div className="space-y-4 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          {t('get_ready.vendors.assigned_vendors')}
        </h3>

        {Array.from(workItemsByVendor.entries()).map(([vendorId, vendorWorkItems]) => {
          const vendor = vendors.find(v => v.id === vendorId);
          if (!vendor) return null;

          const totalCost = vendorWorkItems.reduce((sum, wi) => sum + (wi.estimated_cost || 0), 0);
          const completedCount = vendorWorkItems.filter(wi => wi.status === 'completed').length;

          return (
            <Card key={vendorId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {vendor.name}
                      <Badge variant="secondary" className="text-xs">
                        {vendorWorkItems.length} {t('get_ready.vendors.work_items')}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {vendor.specialties.map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">${totalCost.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {completedCount}/{vendorWorkItems.length} {t('common.completed')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vendorWorkItems.map((workItem) => (
                    <div
                      key={workItem.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {workItem.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : workItem.status === 'in_progress' ? (
                          <Circle className="h-4 w-4 text-blue-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{workItem.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {workItem.work_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${workItem.estimated_cost?.toLocaleString() || '0'}
                          </div>
                          {workItem.estimated_hours && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {workItem.estimated_hours}h
                            </div>
                          )}
                        </div>
                        <Badge variant={
                          workItem.status === 'completed' ? 'default' :
                          workItem.status === 'in_progress' ? 'secondary' :
                          'outline'
                        }>
                          {workItem.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {vendor.contact_info?.phone && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {t('get_ready.vendors.contact')}: {vendor.contact_info.phone}
                      {vendor.contact_info.contact_person && ` (${vendor.contact_info.contact_person})`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {/* Unassigned Work Items */}
      {workItems.filter(wi => !wi.assigned_vendor_id).length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              {t('get_ready.vendors.unassigned_work_items')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workItems
                .filter(wi => !wi.assigned_vendor_id)
                .map((workItem) => (
                  <div
                    key={workItem.id}
                    className="flex items-center justify-between gap-3 p-3 rounded border bg-card"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{workItem.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {workItem.work_type.replace('_', ' ')}
                      </div>
                    </div>
                    <Select
                      onValueChange={(value) => handleAssignVendor(workItem.id, value)}
                      disabled={assignVendor.isPending}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t('get_ready.vendors.select_vendor')} />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors
                          .filter(v => v.is_active)
                          .map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              <div className="flex items-center gap-2">
                                <span>{vendor.name}</span>
                                {vendor.specialties.includes(workItem.work_type as any) && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('get_ready.vendors.specialty_match')}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        {vendors.filter(v => v.is_active).length === 0 && (
                          <SelectItem value="no-vendors" disabled>
                            {t('get_ready.vendors.no_active_vendors')}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
