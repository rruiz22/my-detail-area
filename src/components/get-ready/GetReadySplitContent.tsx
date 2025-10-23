import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetReady } from "@/hooks/useGetReady";
import { useGetReadyStore } from "@/hooks/useGetReadyStore";
import { useGetReadyVehiclesInfinite } from "@/hooks/useGetReadyVehicles";
import { useVehicleManagement } from "@/hooks/useVehicleManagement";
import { useNavigate, useParams } from "react-router-dom";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatVehiclesForExport } from "@/utils/exportUtils";
import { useServerExport } from "@/hooks/useServerExport";
import { GetReadyOverview } from "./GetReadyOverview";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { GetReadyAlerts } from "./GetReadyAlerts";
import { GetReadyDashboardWidget } from "./GetReadyDashboardWidget";
import { GetReadyVehicleList } from "./GetReadyVehicleList";
import { GetReadyWorkflowActions } from "./GetReadyWorkflowActions";
import { VehicleDetailPanel } from "./VehicleDetailPanel";
import { VehicleFormModal } from "./VehicleFormModal";
import { VehicleTable } from "./VehicleTable";
import { GetReadyVehicle } from "@/types/getReady";
import {
  useGetReadySearchQuery,
  useGetReadyWorkflowFilter,
  useGetReadyPriorityFilter,
  useGetReadySortPreferences,
} from "@/hooks/useGetReadyPersistence";

interface GetReadySplitContentProps {
  className?: string;
}

export function GetReadySplitContent({ className }: GetReadySplitContentProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicleId } = useParams<{ vehicleId?: string }>();
  const { toast } = useToast();
  const {
    splitLayout,
    selectedStepId,
    selectedVehicleId,
    setSelectedVehicleId,
    setSelectedStepId,
  } = useGetReadyStore();
  const { steps, refetchSteps, refetchKPIs } = useGetReady();
  const { deleteVehicle, isDeleting } = useVehicleManagement();
  const { exportToExcel, exportToCSV, isExporting } = useServerExport({ reportType: 'get_ready' });

  // State for filters when in details view - WITH LOCALSTORAGE PERSISTENCE
  const [searchQuery, setSearchQuery] = useGetReadySearchQuery();
  const [selectedWorkflow, setSelectedWorkflow] = useGetReadyWorkflowFilter();
  const [selectedPriority, setSelectedPriority] = useGetReadyPriorityFilter();
  const { sortBy, setSortBy, sortOrder, setSortOrder } =
    useGetReadySortPreferences();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Vehicle form modal state
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Ref to track processed vehicle IDs from URL to prevent infinite loops
  const processedVehicleIdRef = useRef<string | null>(null);

  // Use the selected step from sidebar, or 'all' if none selected
  const selectedStep = selectedStepId || "all";

  // Fetch vehicles for export (infinite query to get all vehicles)
  const { data: vehiclesData } = useGetReadyVehiclesInfinite({
    searchQuery,
    selectedStep,
    selectedWorkflow,
    selectedPriority,
    sortBy,
    sortOrder,
  });

  // Fetch ALL vehicles without step filter for Approvals tab
  const { data: allVehiclesData } = useGetReadyVehiclesInfinite({});

  // Flatten all vehicles from infinite query
  const allVehicles =
    vehiclesData?.pages.flatMap((page) => page.vehicles) ?? [];

  // All vehicles without filters (for Approvals tab)
  const allVehiclesUnfiltered =
    allVehiclesData?.pages.flatMap((page) => page.vehicles) ?? [];

  const { currentDealership } = useAccessibleDealerships();

  // ✅ Handle vehicle ID from URL (from Global Search) - Direct DB query
  useEffect(() => {
    if (vehicleId && vehicleId !== processedVehicleIdRef.current && currentDealership?.id) {
      const fetchVehicleFromUrl = async () => {
        console.log('🔍 [Get Ready] Fetching vehicle from URL:', vehicleId);

        const { data, error } = await supabase
          .from('get_ready_vehicles')
          .select('id, stock_number, vin, vehicle_year, vehicle_make, vehicle_model, step_id, get_ready_steps(name)')
          .eq('id', vehicleId)
          .eq('dealer_id', currentDealership.id)
          .is('deleted_at', null)
          .single();

        processedVehicleIdRef.current = vehicleId;

        if (!error && data) {
          console.log('✅ [Get Ready] Found vehicle:', data.stock_number, 'in step:', (data.get_ready_steps as any)?.name);

          navigate('/get-ready/details', { replace: true });

          if (data.step_id) {
            setSelectedStepId(data.step_id);
          }

          setSelectedVehicleId(vehicleId);

          toast({
            description: `Viewing ${data.vehicle_year} ${data.vehicle_make} ${data.vehicle_model}`,
            variant: 'default',
          });
        } else {
          console.warn('⚠️ [Get Ready] Vehicle not found or not accessible:', vehicleId, error);
          toast({
            description: t('get_ready.vehicle_not_found') || 'Vehicle not found',
            variant: 'destructive',
          });
          navigate('/get-ready/details', { replace: true });
        }
      };

      fetchVehicleFromUrl();
    }

    if (!vehicleId) {
      processedVehicleIdRef.current = null;
    }
  }, [vehicleId, currentDealership?.id, navigate, setSelectedStepId, setSelectedVehicleId, toast, t]);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      // Invalidate ALL Get Ready queries for complete refresh
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return [
            'get-ready-vehicles',      // Vehicle list
            'get-ready-vehicle-detail', // Detail panel
            'vehicle-notes',           // Notes tab
            'note-replies',           // Note replies
            'vehicle-work-items',     // Work items tab
            'vehicle-media',          // Media tab
            'vehicle-activity-log',   // Timeline tab
            'get-ready-steps',        // Sidebar steps
            'get-ready-kpis',         // Sidebar KPIs
          ].includes(key);
        }
      });

      console.log('✅ [Refresh] All Get Ready queries invalidated');

      toast({
        description: t("common.data_refreshed") || "Data refreshed successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("❌ [Refresh] Manual refresh failed:", error);
      toast({
        description: t("common.refresh_failed") || "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    if (allVehicles.length === 0) {
      toast({
        description: "No vehicles to export",
        variant: "destructive",
      });
      return;
    }

    // Format vehicles for export
    const formattedData = formatVehiclesForExport(allVehicles);

    // Generate filename
    const stepName =
      selectedStep === "all"
        ? "all-steps"
        : steps.find((s) => s.id === selectedStep)?.name || "vehicles";
    const filename = `get-ready-${stepName.toLowerCase().replace(/\s+/g, "-")}`;

    // Export based on format (now using server-side generation for Excel)
    if (format === "csv") {
      exportToCSV(formattedData, filename);
    } else if (format === "excel") {
      await exportToExcel(formattedData, filename);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await deleteVehicle(vehicleId);
      toast({
        description:
          t("get_ready.vehicle_deleted") || "Vehicle deleted successfully",
        variant: "default",
      });
      // Refresh KPIs and steps after deletion
      refetchSteps();
      refetchKPIs();
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      toast({
        description: t("get_ready.delete_failed") || "Failed to delete vehicle",
        variant: "destructive",
      });
    }
  };

  const hasActiveFilters =
    selectedWorkflow !== "all" ||
    selectedPriority !== "all" ||
    searchQuery.length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedWorkflow("all");
    setSelectedPriority("all");
  };

  // Determine which content to show based on route
  const isOverview =
    location.pathname === "/get-ready" || location.pathname === "/get-ready/";
  const isDetailsView = location.pathname === "/get-ready/details";
  const isReportsView = location.pathname === "/get-ready/reports";
  const isApprovalsView = location.pathname === "/get-ready/approvals";

  // Overview Tab - Enhanced Dashboard with Real Data
  if (isOverview) {
    return <GetReadyOverview allVehicles={allVehicles} className={className} />;
  }

  // Reports View Tab - Analytics and Reports
  if (isReportsView) {
    return (
      <div className={cn("h-full overflow-auto space-y-6", className)}>
        {/* Reports Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("get_ready.reports.title") || "Reports & Analytics"}
          </h2>
          <p className="text-muted-foreground">
            {t("get_ready.reports.subtitle") ||
              "Generate and view detailed reports for your reconditioning workflow"}
          </p>
        </div>

        {/* Report Options */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View overall workflow performance metrics and KPIs
              </p>
              <Button className="w-full" onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export detailed vehicle movement and status history
              </p>
              <Button className="w-full" onClick={() => handleExport("csv")}>
                <FileText className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SLA Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review SLA compliance rates and identify bottlenecks
              </p>
              <Button className="w-full" onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* KPIs Summary for Reports */}
        <GetReadyDashboardWidget />

        {/* Recent Export History (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent exports. Generate a report above to see it listed here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter vehicles by approval status - USE UNFILTERED DATA for Approvals tab
  
  const pendingApprovalVehicles = allVehiclesUnfiltered.filter((v) => {
    // Vehicle-level approval
    const vehicleNeedsApproval = v.requires_approval === true && v.approval_status === "pending";

    // Work item-level approval
    const hasWorkItemsNeedingApproval = Array.isArray(v.pending_approval_work_items) && v.pending_approval_work_items.length > 0;

    return vehicleNeedsApproval || hasWorkItemsNeedingApproval;
  });

  const approvedTodayVehicles = allVehiclesUnfiltered.filter((v) => {
    // Include vehicles approved via modal OR auto-approved via work items
    if (!v.approved_at) return false;
    if (v.approval_status !== "approved" && v.approval_status !== "not_required") return false;

    const approvedDate = new Date(v.approved_at);
    const today = new Date();
    return (
      approvedDate.getDate() === today.getDate() &&
      approvedDate.getMonth() === today.getMonth() &&
      approvedDate.getFullYear() === today.getFullYear()
    );
  });

  const rejectedTodayVehicles = allVehiclesUnfiltered.filter((v) => {
    if (!v.rejected_at || v.approval_status !== "rejected") return false;
    const rejectedDate = new Date(v.rejected_at);
    const today = new Date();
    return (
      rejectedDate.getDate() === today.getDate() &&
      rejectedDate.getMonth() === today.getMonth() &&
      rejectedDate.getFullYear() === today.getFullYear()
    );
  });

  // Approvals View Tab - Approval Queue
  if (isApprovalsView) {
    return (
      <div className={cn("h-full overflow-auto space-y-6", className)}>
        {/* Approvals Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("get_ready.approvals.title") || "Approvals"}
          </h2>
          <p className="text-muted-foreground">
            {t("get_ready.approvals.subtitle") ||
              "Review and approve vehicles ready to move to the next step"}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("get_ready.approvals.summary.pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingApprovalVehicles.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("get_ready.approvals.summary.awaiting_review")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("get_ready.approvals.summary.approved_today")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {approvedTodayVehicles.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("get_ready.approvals.summary.processed_today")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("get_ready.approvals.summary.rejected_today")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {rejectedTodayVehicles.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("get_ready.approvals.summary.needs_attention")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Approval Queues */}
        <div className="grid gap-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("get_ready.approvals.queue.pending_title")}</span>
                <Badge variant="secondary">
                  {pendingApprovalVehicles.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApprovalVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("get_ready.approvals.queue.no_pending")}
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingApprovalVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id);
                        navigate("/get-ready/details");
                      }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {vehicle.workflow_type?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Stock: {vehicle.stock_number || "N/A"} •{" "}
                          {t("get_ready.steps.dis")}:{" "}
                          {vehicle.days_in_step || "0d"} • Step:{" "}
                          {vehicle.step_name}
                        </p>
                        {/* Show work items needing approval with details */}
                        {(vehicle as any).pending_approval_work_items &&
                          (vehicle as any).pending_approval_work_items.length >
                            0 && (
                            <div className="space-y-2">
                              {(vehicle as any).pending_approval_work_items.map(
                                (workItem: any) => (
                                  <div
                                    key={workItem.id}
                                    className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
                                  >
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-100 text-amber-700 border-amber-300 text-xs shrink-0 mt-0.5"
                                    >
                                      {t(
                                        "get_ready.work_items.approval_required",
                                      )}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">
                                        {workItem.title}
                                      </p>
                                      {workItem.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {workItem.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        {vehicle.approval_notes && (
                          <p className="text-xs text-muted-foreground italic">
                            "{vehicle.approval_notes}"
                          </p>
                        )}
                        {/* Click to approve indicator */}
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                            <ChevronRight className="h-3 w-3" />
                            {t("get_ready.approvals.actions.click_to_approve") || "Click to view and approve work items"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Approved */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("get_ready.approvals.queue.approved_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedTodayVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("get_ready.approvals.queue.no_approved")}
                </p>
              ) : (
                <div className="space-y-2">
                  {approvedTodayVehicles.slice(0, 5).map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id);
                        navigate("/get-ready/details");
                      }}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 cursor-pointer transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {vehicle.year || vehicle.vehicle_year} {vehicle.make || vehicle.vehicle_make}{" "}
                          {vehicle.model || vehicle.vehicle_model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {vehicle.stock_number}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Rejected */}
          {rejectedTodayVehicles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("get_ready.approvals.queue.rejected_title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rejectedTodayVehicles.slice(0, 5).map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id);
                        navigate("/get-ready/details");
                      }}
                      className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {vehicle.year || vehicle.vehicle_year} {vehicle.make || vehicle.vehicle_make}{" "}
                          {vehicle.model || vehicle.vehicle_model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {vehicle.stock_number}
                        </p>
                        {vehicle.rejection_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 italic">
                            {t("get_ready.approvals.modal.rejection_reason")}:{" "}
                            {vehicle.rejection_reason}
                          </p>
                        )}
                      </div>
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Details View Tab - Enhanced Vehicle List
  if (isDetailsView) {
    return (
      <div className={cn("h-full flex flex-col space-y-4", className)}>
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedStep === "all"
                ? "Vehicle Management"
                : `${steps.find((s) => s.id === selectedStep)?.name || "Step"} - Vehicles`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedStep === "all"
                ? "Enhanced vehicle list with advanced filtering"
                : `Showing vehicles in ${steps.find((s) => s.id === selectedStep)?.name || "selected"} step`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box - Now in Details View with Clear Button */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('get_ready.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-9 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                >
                  <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isManualRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isManualRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {t("common.action_buttons.refresh")}
              </span>
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <Download
                    className={`h-4 w-4 mr-2 ${isExporting ? "animate-pulse" : ""}`}
                  />
                  <span className="hidden sm:inline">
                    {isExporting
                      ? t("common.action_buttons.exporting")
                      : t("common.action_buttons.export")}
                  </span>
                  <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {t("common.action_buttons.export")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("common.action_buttons.export_csv")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {t("common.action_buttons.export_excel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => {
                setEditingVehicleId(null);
                setVehicleFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {t("get_ready.vehicle_form.add_vehicle")}
              </span>
            </Button>
          </div>
        </div>

        {/* Compact Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border">
          {/* Step indicator (read-only from sidebar) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Step:</span>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20"
            >
              {selectedStep === "all"
                ? "All Steps"
                : steps.find((s) => s.id === selectedStep)?.name || "All Steps"}
            </Badge>
            {/* Global search indicator */}
            {searchQuery && selectedStep !== "all" && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400">
                <Search className="h-3 w-3 mr-1" />
                Searching all steps
              </Badge>
            )}
          </div>

          {/* Workflow filter */}
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="standard">
                {t("get_ready.workflow.standard")}
              </SelectItem>
              <SelectItem value="express">
                {t("get_ready.workflow.express")}
              </SelectItem>
              <SelectItem value="priority">
                {t("get_ready.workflow.priority")}
              </SelectItem>
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
                <SelectItem value="days_to_frontline">
                  Days to Finish
                </SelectItem>
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
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>

          <div className="flex-1" />

          {/* Clear filters button (only when active) */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={clearFilters}
            >
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
              onEditVehicle={(vehicleId) => {
                setEditingVehicleId(vehicleId);
                setVehicleFormOpen(true);
              }}
              onDeleteVehicle={handleDeleteVehicle}
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
