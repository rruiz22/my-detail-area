import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Clock,
  Coffee,
  UserCheck,
  Building2,
  Grid3x3,
  List,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  X,
  ThumbsUp
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// REAL DATABASE INTEGRATION
import {
  useCurrentlyWorking,
  useLiveDashboardStats,
  useElapsedTime,
  CurrentlyWorkingEmployee
} from "@/hooks/useCurrentlyWorking";

// Employee Detail Modal
import { EmployeeDetailModal } from "./EmployeeDetailModal";
import { EditTimeEntryModal } from "./EditTimeEntryModal";
import { TimeEntryWithEmployee, useApproveEarlyPunch } from "@/hooks/useDetailHubDatabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import { useNavigate } from "react-router-dom";

const LiveStatusDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedDealerId } = useDealerFilter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEmployee, setSelectedEmployee] = useState<CurrentlyWorkingEmployee | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntryWithEmployee | null>(null);

  // Live clock state - updates every second
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time data (updates every 30 seconds)
  const { data: employees = [], isLoading } = useCurrentlyWorking();
  const { data: stats } = useLiveDashboardStats();

  // Auto-closed entries requiring review
  const { data: autoClosedCount = 0 } = useQuery({
    queryKey: ['auto-closed-count', selectedDealerId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('detail_hub_time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('requires_supervisor_review', true)
          .eq('punch_out_method', 'auto_close')
          .is('verified_at', null);

        if (selectedDealerId && selectedDealerId !== 'all') {
          query = query.eq('dealership_id', selectedDealerId);
        }

        const { count, error } = await query;
        if (error) {
          // Silently fail if columns don't exist (migration not applied)
          if (error.code === '42703' || error.message?.includes('column')) {
            return 0;
          }
          throw error;
        }
        return count || 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // Update clock every second for live time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Department label mapping - capitalized versions
  const getDepartmentLabel = (departmentKey: string): string => {
    // Format the key to display name (capitalize and replace underscore)
    if (departmentKey === 'car_wash') return 'Car Wash';
    if (departmentKey === 'detail') return 'Detail';
    if (departmentKey === 'service') return 'Service';
    if (departmentKey === 'management') return 'Management';
    // Fallback: capitalize first letter
    return departmentKey.charAt(0).toUpperCase() + departmentKey.slice(1);
  };

  // Handler for editing time entry - fetches full data from database
  const handleEditTimeEntry = async (employee: CurrentlyWorkingEmployee) => {
    try {
      // Fetch complete time entry with all fields from database
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .select(`
          *,
          employee:detail_hub_employees!employee_id(
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('id', employee.time_entry_id)
        .single();

      if (error) throw error;

      if (data && data.employee) {
        // Transform to TimeEntryWithEmployee format
        const timeEntryWithEmployee: TimeEntryWithEmployee = {
          ...data,
          employee_name: `${data.employee.first_name} ${data.employee.last_name}`,
          employee_number: data.employee.employee_number
        };

        setSelectedTimeEntry(timeEntryWithEmployee);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error fetching time entry for edit:', error);
    }
  };

  // Handler for closing edit modal and refreshing data
  const handleEditModalClose = () => {
    setShowEditModal(false);
    setSelectedTimeEntry(null);
    // Invalidate queries to refresh the dashboard
    queryClient.invalidateQueries({ queryKey: ['detail-hub', 'currently-working'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading live status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t('detail_hub.live_dashboard.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('detail_hub.live_dashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live Clock - Clean Design */}
          <div className="text-right mr-4">
            <div className="flex items-center justify-end gap-2 mb-1">
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
                LIVE
              </Badge>
            </div>
            <div className="text-4xl font-mono font-bold text-gray-900">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm text-gray-500">
              {format(currentTime, 'EEEE, MMMM dd')}
            </div>
          </div>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="card-enhanced">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('detail_hub.live_dashboard.stats.clocked_in')}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.total_clocked_in || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <UserCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('detail_hub.live_dashboard.stats.on_break')}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.total_on_break || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <Coffee className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('detail_hub.live_dashboard.stats.total_hours_today')}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.total_hours_today?.toFixed(1) || '0.0'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('detail_hub.live_dashboard.stats.active_departments')}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.unique_departments || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50">
                <Building2 className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Closed Requiring Review */}
        <Card
          className={cn(
            "card-enhanced cursor-pointer transition-all",
            autoClosedCount > 0 && "ring-2 ring-amber-300 bg-amber-50/50"
          )}
          onClick={() => navigate('/detail-hub?tab=timecards&filter=auto_closed')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('detail_hub.live_dashboard.stats.auto_closed')}
                </p>
                <p className={cn(
                  "text-3xl font-bold mt-2",
                  autoClosedCount > 0 ? "text-amber-600" : "text-gray-900"
                )}>
                  {autoClosedCount}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                autoClosedCount > 0 ? "bg-amber-100" : "bg-gray-100"
              )}>
                <AlertCircle className={cn(
                  "w-6 h-6",
                  autoClosedCount > 0 ? "text-amber-600" : "text-gray-400"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Grid/List */}
      {employees.length === 0 ? (
        <Card className="card-enhanced">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t('detail_hub.live_dashboard.no_employees_working')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-3"
        )}>
          {employees.map((employee) => (
            viewMode === 'grid' ? (
              <EmployeeCardGrid
                key={employee.employee_id}
                employee={employee}
                getDepartmentLabel={getDepartmentLabel}
                onView={() => {
                  setSelectedEmployee(employee);
                  setShowDetailModal(true);
                }}
                onEdit={() => handleEditTimeEntry(employee)}
              />
            ) : (
              <EmployeeCardList
                key={employee.employee_id}
                employee={employee}
                getDepartmentLabel={getDepartmentLabel}
                onView={() => {
                  setSelectedEmployee(employee);
                  setShowDetailModal(true);
                }}
                onEdit={() => handleEditTimeEntry(employee)}
              />
            )
          ))}
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {/* Edit Time Entry Modal */}
      <EditTimeEntryModal
        open={showEditModal}
        onOpenChange={handleEditModalClose}
        timeEntry={selectedTimeEntry}
      />
    </div>
  );
};

// =====================================================
// EMPLOYEE CARD - GRID VIEW
// =====================================================

interface EmployeeCardProps {
  employee: any;
  getDepartmentLabel: (key: string) => string;
  onView: () => void;
  onEdit: () => void;
}

function EmployeeCardGrid({ employee, getDepartmentLabel, onView, onEdit }: EmployeeCardProps) {
  const { t } = useTranslation();
  const elapsedTime = useElapsedTime(employee.clock_in);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const { mutate: approveEarlyPunch, isPending: isApproving } = useApproveEarlyPunch();

  return (
    <>
      <Card className="card-enhanced hover:shadow-md transition-all">
        <CardContent className="p-4">
          {/* Header with photo and status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar
                className="w-12 h-12 border-2 border-emerald-200 cursor-pointer hover:border-emerald-400 transition-all hover:scale-105"
                onClick={() => employee.photo_in_url && setShowPhotoModal(true)}
              >
                <AvatarImage src={employee.photo_in_url} />
                <AvatarFallback className="bg-gray-100 text-gray-700">
                  {employee.first_name[0]}{employee.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {employee.employee_name}
                </h3>
                <p className="text-xs text-gray-500">
                  {employee.employee_number}
                </p>
              </div>
            </div>
          {/* Status badge */}
          <Badge
            className={cn(
              employee.is_on_break
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200"
            )}
          >
            {employee.is_on_break ? (
              <>
                <Coffee className="w-3 h-3 mr-1" />
                {t('detail_hub.live_dashboard.on_break')}
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                {t('detail_hub.live_dashboard.active')}
              </>
            )}
          </Badge>
        </div>

        {/* Time information */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('detail_hub.live_dashboard.clocked_in_at')}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="font-medium text-gray-700 hover:text-emerald-600 hover:underline cursor-pointer transition-colors">
                  {format(new Date(employee.clock_in), 'MMM d, HH:mm')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Clock In Photo</h4>
                  {employee.photo_in_url ? (
                    <img
                      src={employee.photo_in_url}
                      alt="Clock in verification photo"
                      className="w-full rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-sm text-gray-500">No photo available</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Captured at {format(new Date(employee.clock_in), 'MMM d, yyyy HH:mm:ss')}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {t('detail_hub.live_dashboard.elapsed_time')}
            </span>
            <span className="font-mono font-bold text-lg text-gray-900">
              {elapsedTime}
            </span>
          </div>
          {employee.is_on_break && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-600">
                {t('detail_hub.live_dashboard.break_duration')}
              </span>
              <span className="font-medium text-amber-700">
                {employee.break_elapsed_minutes} min
              </span>
            </div>
          )}
        </div>

        {/* Department and kiosk */}
        <div className="flex gap-2 mb-3">
          <Badge variant="outline" className="text-xs bg-gray-50">
            <Building2 className="w-3 h-3 mr-1" />
            {getDepartmentLabel(employee.department)}
          </Badge>
          {employee.kiosk_name ? (
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              📍 {employee.kiosk_name}
            </Badge>
          ) : employee.kiosk_code ? (
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              📍 {employee.kiosk_code}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">
              📍 Kiosk
            </Badge>
          )}
        </div>

        {/* Schedule compliance indicator */}
        {employee.schedule_variance_minutes !== null && (
          <div className="mb-3">
            {Math.abs(employee.schedule_variance_minutes) <= 5 ? (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                <span>On time</span>
              </div>
            ) : employee.schedule_variance_minutes < 0 ? (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{Math.abs(employee.schedule_variance_minutes)} min early</span>
                {!employee.early_punch_approved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      approveEarlyPunch(employee.time_entry_id);
                    }}
                    disabled={isApproving}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                <span>{employee.schedule_variance_minutes} min late</span>
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={onView}
          >
            <Eye className="w-3 h-3 mr-1" />
            {t('detail_hub.live_dashboard.view_details')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={onEdit}
          >
            <Edit className="w-3 h-3 mr-1" />
            {t('detail_hub.live_dashboard.edit')}
          </Button>
        </div>
      </CardContent>
    </Card>

      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {employee.employee_name} - Clock In Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {employee.photo_in_url ? (
              <img
                src={employee.photo_in_url}
                alt={`${employee.employee_name} punch in photo`}
                className="w-full rounded-lg border-2 border-emerald-200"
              />
            ) : (
              <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No photo available</p>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <p className="font-medium">{employee.employee_number}</p>
                <p>{employee.department}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {format(new Date(employee.clock_in), 'MMM d, yyyy')}
                </p>
                <p>{format(new Date(employee.clock_in), 'HH:mm:ss')}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =====================================================
// EMPLOYEE CARD - LIST VIEW
// =====================================================

function EmployeeCardList({ employee, getDepartmentLabel, onView, onEdit }: EmployeeCardProps) {
  const { t } = useTranslation();
  const elapsedTime = useElapsedTime(employee.clock_in);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  return (
    <>
      <Card className="card-enhanced">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            {/* Left: Employee info */}
            <div className="flex items-center gap-3 flex-1">
              <Avatar
                className="w-10 h-10 border-2 border-emerald-200 cursor-pointer hover:border-emerald-400 transition-all hover:scale-105"
                onClick={() => employee.photo_in_url && setShowPhotoModal(true)}
              >
                <AvatarImage src={employee.photo_in_url} />
                <AvatarFallback className="bg-gray-100 text-gray-700">
                  {employee.first_name[0]}{employee.last_name[0]}
                </AvatarFallback>
              </Avatar>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">
                {employee.employee_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs bg-gray-50">
                  {getDepartmentLabel(employee.department)}
                </Badge>
                {employee.kiosk_name ? (
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                    📍 {employee.kiosk_name}
                  </Badge>
                ) : employee.kiosk_code ? (
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                    📍 {employee.kiosk_code}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">
                    📍 Kiosk
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Center: Time info */}
          <div className="flex items-center gap-6 flex-1 justify-center">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {t('detail_hub.live_dashboard.clock_in')}
              </p>
              <p className="font-medium text-sm text-gray-700">
                {format(new Date(employee.clock_in), 'MMM d, HH:mm')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {t('detail_hub.live_dashboard.elapsed')}
              </p>
              <p className="font-mono font-bold text-base text-gray-900">
                {elapsedTime}
              </p>
            </div>
            <div>
              <Badge
                className={cn(
                  employee.is_on_break
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                )}
              >
                {employee.is_on_break ? (
                  <>
                    <Coffee className="w-3 h-3 mr-1" />
                    Break ({employee.break_elapsed_minutes}m)
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                    Active
                  </>
                )}
              </Badge>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {employee.employee_name} - Clock In Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {employee.photo_in_url ? (
              <img
                src={employee.photo_in_url}
                alt={`${employee.employee_name} punch in photo`}
                className="w-full rounded-lg border-2 border-emerald-200"
              />
            ) : (
              <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No photo available</p>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <p className="font-medium">{employee.employee_number}</p>
                <p>{employee.department}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {format(new Date(employee.clock_in), 'MMM d, yyyy')}
                </p>
                <p>{format(new Date(employee.clock_in), 'HH:mm:ss')}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LiveStatusDashboard;
