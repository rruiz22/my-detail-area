import { ApprovalCharts } from "@/components/get-ready/approvals/ApprovalCharts";
import { ApprovalFilters } from "@/components/get-ready/approvals/ApprovalFilters";
import { ApprovalHeader } from "@/components/get-ready/approvals/ApprovalHeader";
import { ApprovalHistoryTable } from "@/components/get-ready/approvals/ApprovalHistoryTable";
import { ApprovalMetricsDashboard } from "@/components/get-ready/approvals/ApprovalMetricsDashboard";
import { PendingApprovalsTable } from "@/components/get-ready/approvals/PendingApprovalsTable";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { useGetReady } from "@/hooks/useGetReady";
import {
  cleanupLegacyWorkflowFilter,
  useGetReadyPriorityFilter,
  useGetReadySearchQuery,
  useGetReadySortPreferences,
} from "@/hooks/useGetReadyPersistence";
import { useGetReadyStore } from "@/hooks/useGetReadyStore";
import { useGetReadyVehiclesInfinite } from "@/hooks/useGetReadyVehicles";
import { useServerExport } from "@/hooks/useServerExport";
import { useVehicleManagement } from "@/hooks/useVehicleManagement";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GetReadySetup } from "@/pages/GetReadySetup";
import { formatVehiclesForExport } from "@/utils/exportUtils";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Search,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GetReadyActivityFeed } from "./GetReadyActivityFeed";
import { GetReadyDashboardWidget } from "./GetReadyDashboardWidget";
import { GetReadyOverview } from "./GetReadyOverview";
import { GetReadyVehicleList } from "./GetReadyVehicleList";
import { VehicleDetailPanel } from "./VehicleDetailPanel";
import { VehicleFormModal } from "./VehicleFormModal";
import { VehicleTable } from "./VehicleTable";

interface GetReadySplitContentProps {
  className?: string;
}

interface WorkItemType {
  id: string;
  title: string;
  description?: string;
  work_type?: string;
  estimated_cost?: number;
  priority?: string;
  approval_required?: boolean;
  approval_status?: string;
}

interface VehicleWithApproval {
  id: string;
  stock_number: string;
  work_items?: WorkItemType[];
  pending_approval_work_items?: WorkItemType[];
  requires_approval?: boolean;
  approval_status?: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  year?: number;
  make?: string;
  model?: string;
  [key: string]: unknown;
}

export function GetReadySplitContent({ className }: GetReadySplitContentProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicleId } = useParams<{ vehicleId?: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [selectedPriority, setSelectedPriority] = useGetReadyPriorityFilter();
  const { sortBy, setSortBy, sortOrder, setSortOrder } =
    useGetReadySortPreferences();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Vehicle form modal state
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<{
    stock_number?: string;
    vin?: string;
    vehicle_year?: number;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_trim?: string;
    vehicle_color?: string;
    mileage?: number;
  } | null>(null);

  // Ref to track processed vehicle IDs from URL to prevent infinite loops
  const processedVehicleIdRef = useRef<string | null>(null);
  const prefillProcessedRef = useRef(false);

  // Use the selected step from sidebar, or 'all' if none selected
  const selectedStep = selectedStepId || "all";

  // ✅ One-time cleanup of legacy workflow filter from localStorage
  useEffect(() => {
    cleanupLegacyWorkflowFilter();
  }, []);

  // Auto-open modal when prefillData is provided (e.g., from Stock page)
  useEffect(() => {
    const state = location.state as {
      prefillData?: {
        stock_number?: string;
        vin?: string;
        vehicle_year?: number;
        vehicle_make?: string;
        vehicle_model?: string;
        vehicle_trim?: string;
        vehicle_color?: string;
        mileage?: number;
      };
      highlightId?: string;
    } | null;

    if (state?.prefillData && !prefillProcessedRef.current) {
      console.log('📝 [Get Ready] Detected prefillData from navigation:', state.prefillData);
      setPrefillData(state.prefillData);
      setVehicleFormOpen(true);
      prefillProcessedRef.current = true;

      // Clear the state to prevent re-opening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Fetch vehicles for export (infinite query to get all vehicles)
  const { data: vehiclesData } = useGetReadyVehiclesInfinite({
    searchQuery,
    selectedStep,
    selectedPriority,
    sortBy,
    sortOrder,
  });

  // Fetch ALL vehicles without step filter for Approvals tab
  const {
    data: allVehiclesData,
    fetchNextPage: fetchNextApprovalPage,
    hasNextPage: hasNextApprovalPage,
    isFetchingNextPage: isFetchingNextApprovalPage
  } = useGetReadyVehiclesInfinite({});

  // PHASE 3 OPTIMIZATION: Removed auto-fetch ALL pages loop
  // Now using server-side RPC function get_pending_approvals_count() for accurate counts
  // This eliminates 10-20 queries per page load

  // Flatten all vehicles from infinite query
  const allVehicles =
    vehiclesData?.pages.flatMap((page) => (page as { vehicles: unknown[] }).vehicles) ?? [];

  // All vehicles without filters (for Approvals tab)
  const allVehiclesUnfiltered = useMemo(
    () => allVehiclesData?.pages.flatMap((page) => (page as { vehicles: VehicleWithApproval[] }).vehicles) ?? [],
    [allVehiclesData?.pages]
  );

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
          const stepName = data.get_ready_steps && typeof data.get_ready_steps === 'object' && 'name' in data.get_ready_steps
            ? data.get_ready_steps.name
            : 'unknown';
          console.log('✅ [Get Ready] Found vehicle:', data.stock_number, 'in step:', stepName);

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
      // Targeted refresh: only invalidate visible data (vehicle list, steps, KPIs)
      // Detail panel, notes, work items, media, and activity log are only invalidated if panel is open
      await queryClient.invalidateQueries({
        queryKey: ['get-ready-vehicles', 'infinite'],
        exact: false
      });

      await queryClient.invalidateQueries({
        queryKey: ['get-ready-steps'],
        exact: false
      });

      await queryClient.invalidateQueries({
        queryKey: ['get-ready-kpis'],
        exact: false
      });

      // Only invalidate detail panel if a vehicle is selected
      if (selectedVehicleId) {
        await queryClient.invalidateQueries({
          queryKey: ['get-ready-vehicle-detail', selectedVehicleId],
          exact: false
        });
      }

      console.log('✅ [Refresh] Get Ready core queries invalidated (targeted scope)');

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
        description: t("get_ready.export.no_vehicles"),
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
    selectedPriority !== "all" ||
    searchQuery.length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedPriority("all");
  };

  // Determine which content to show based on route
  const isOverview =
    location.pathname === "/get-ready/overview" ||
    location.pathname === "/get-ready" ||
    location.pathname === "/get-ready/";
  const isDetailsView = location.pathname === "/get-ready/details";
  const isReportsView = location.pathname === "/get-ready/reports";
  const isActivityView = location.pathname === "/get-ready/activity";
  const isApprovalsView = location.pathname === "/get-ready/approvals";
  const isSetupView = location.pathname === "/get-ready/setup";

  // ✅ FIX: Move ALL useMemo hooks BEFORE any early returns
  // Filter vehicles by approval status - USE UNFILTERED DATA for Approvals tab
  // ✅ IMPROVED: Only count vehicles that have active work items needing approval
  // ✅ OPTIMIZED: Wrapped in useMemo to prevent re-execution on every render
  const pendingApprovalVehicles = useMemo(() => {
    return allVehiclesUnfiltered.filter((v) => {
      // Vehicle-level approval check
      const vehicleNeedsApproval = v.requires_approval === true && v.approval_status === "pending";

      if (!vehicleNeedsApproval) {
        return false;
      }

      // ✅ CRITICAL: Must have at least ONE work item that needs approval
      // A work item needs approval if: approval_required=true AND approval_status NOT IN ('declined', 'approved')
      const workItemsNeedingApproval = (v.work_items || []).filter(
        (wi: { approval_required?: boolean; approval_status?: string }) =>
          wi.approval_required &&
          wi.approval_status !== 'declined' &&
          wi.approval_status !== 'approved'
      );

      return workItemsNeedingApproval.length > 0;
    });
  }, [allVehiclesUnfiltered]);

  // ✅ OPTIMIZED: Wrapped in useMemo to prevent re-execution on every render
  const approvedTodayVehicles = useMemo(() => {
    return allVehiclesUnfiltered.filter((v) => {
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
  }, [allVehiclesUnfiltered]);

  // ✅ OPTIMIZED: Wrapped in useMemo to prevent re-execution on every render
  const rejectedTodayVehicles = useMemo(() => {
    return allVehiclesUnfiltered.filter((v) => {
      if (!v.rejected_at || v.approval_status !== "rejected") return false;
      const rejectedDate = new Date(v.rejected_at);
      const today = new Date();
      return (
        rejectedDate.getDate() === today.getDate() &&
        rejectedDate.getMonth() === today.getMonth() &&
        rejectedDate.getFullYear() === today.getFullYear()
      );
    });
  }, [allVehiclesUnfiltered]);

  // ✅ FIX: Early returns AFTER all hooks
  // Overview Tab - Enhanced Dashboard with Real Data
  // ⚠️ IMPORTANT: Overview must ALWAYS show data from ALL steps, not filtered by selected step
  if (isOverview) {
    return <GetReadyOverview allVehicles={allVehiclesUnfiltered} className={className} />;
  }

  // Setup Tab - System Configuration (admin permission required)
  if (isSetupView) {
    return (
      <div className={cn("h-full overflow-auto", className)}>
        <PermissionGuard module="get_ready" permission="admin" checkDealerModule={true}>
          <GetReadySetup />
        </PermissionGuard>
      </div>
    );
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

  // Activity View Tab - Complete Activity Log
  if (isActivityView) {
    return (
      <div className={cn("h-full overflow-auto", className)}>
        <GetReadyActivityFeed />
      </div>
    );
  }

  // Approvals View Tab - Enterprise Dashboard
  if (isApprovalsView) {
    return (
      <div className={cn("h-full overflow-auto", className)}>
        <div className="space-y-6 p-6">
          {/* Enterprise Header */}
          <ApprovalHeader />

          {/* Metrics Dashboard - 6 KPI Cards */}
          <ApprovalMetricsDashboard />

          {/* Charts Section - 2x2 Grid */}
          <ApprovalCharts />

          {/* Advanced Filters + Search */}
          <ApprovalFilters />

          {/* Pending Approvals - Optimized Table View */}
          <PendingApprovalsTable
            vehicles={pendingApprovalVehicles.map(v => ({
              ...v,
              work_items: (v.work_items || []).map((wi) => ({
                id: wi.id,
                title: wi.title,
                description: wi.description,
                work_type: wi.work_type || 'general',
                estimated_cost: wi.estimated_cost,
                priority: wi.priority
              })),
              pending_approval_work_items: (v.pending_approval_work_items || []).map((wi) => ({
                id: wi.id,
                title: wi.title,
                description: wi.description,
                work_type: wi.work_type || 'general',
                estimated_cost: wi.estimated_cost,
                priority: wi.priority
              }))
            }))}
            onSelectVehicle={setSelectedVehicleId}
          />

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
                          {vehicle.year} {vehicle.make}{" "}
                          {vehicle.model}
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
          <Card>
            <CardHeader>
              <CardTitle>
                {t("get_ready.approvals.queue.rejected_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedTodayVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("get_ready.approvals.queue.no_rejected")}
                </p>
              ) : (
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
                          {vehicle.year} {vehicle.make}{" "}
                          {vehicle.model}
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
              )}
            </CardContent>
          </Card>

          {/* Historical Data Table */}
          <ApprovalHistoryTable />
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
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto overflow-x-hidden">
          {/* Vehicle List - Compact height to show rows */}
          <div className="flex-shrink-0">
            <GetReadyVehicleList
              searchQuery={searchQuery}
              selectedStep={selectedStep}
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

          {/* Detail Panel Below - Expands naturally without height restriction */}
          {selectedVehicleId && (
            <div className="border-t pt-4 pb-4">
              <VehicleDetailPanel />
            </div>
          )}
        </div>

        {/* Vehicle Form Modal */}
        <VehicleFormModal
          open={vehicleFormOpen}
          onOpenChange={(open) => {
            setVehicleFormOpen(open);
            if (!open) {
              setPrefillData(null);
              setEditingVehicleId(null);
              prefillProcessedRef.current = false;
            }
          }}
          vehicleId={editingVehicleId}
          initialData={prefillData}
          onSuccess={() => {
            refetchSteps();
            refetchKPIs();
            setPrefillData(null);
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
