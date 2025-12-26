import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeePortalPersistence } from "@/hooks/useEmployeePortalPersistence";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Ban, Building2, Calendar, Camera, Clock, DollarSign, Edit2, Eye, EyeOff, FileText, Filter, Scan, Search, Shield, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmployeeAuditLogsModal } from "./EmployeeAuditLogsModal";
import { FaceEnrollmentModal } from "./FaceEnrollmentModal";
import { EmployeeAssignmentsTable } from "./EmployeeAssignmentsTable";
import { EmployeeWizardModal } from "./EmployeeWizardModal";

// REAL DATABASE INTEGRATION
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import {
  useDeleteEmployee,
  useDetailHubEmployees,
  useUpdateEmployee,
  type DetailHubEmployee
} from "@/hooks/useDetailHubDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CACHE_TIMES, GC_TIMES } from "@/constants/cacheConfig";
import { ShiftHoursCell } from "./ShiftHoursCell";
import { AutoClosedPunchReviewModal } from "./AutoClosedPunchReviewModal";

const EmployeePortal = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<DetailHubEmployee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<DetailHubEmployee | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedEmployeeForLogs, setSelectedEmployeeForLogs] = useState<DetailHubEmployee | null>(null);
  const [showTerminatedModal, setShowTerminatedModal] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [employeeToReactivate, setEmployeeToReactivate] = useState<DetailHubEmployee | null>(null);
  const [faceEnrollmentOpen, setFaceEnrollmentOpen] = useState(false);
  const [employeeForFaceEnrollment, setEmployeeForFaceEnrollment] = useState<DetailHubEmployee | null>(null);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [employeeForAssignments, setEmployeeForAssignments] = useState<DetailHubEmployee | null>(null);
  const [showAutoCloseReviewModal, setShowAutoCloseReviewModal] = useState(false);
  const [selectedAutoCloseEntryId, setSelectedAutoCloseEntryId] = useState<string | null>(null);

  // 🔒 PRIVACY: Track which employees have hourly rate visible
  const [visibleSalaries, setVisibleSalaries] = useState<Set<string>>(new Set());

  const { selectedDealerId } = useDealerFilter();

  // Persistent filters with localStorage
  const {
    filters,
    setFilters,
    clearAdvancedFilters,
    getActiveFiltersCount
  } = useEmployeePortalPersistence();

  const {
    searchQuery,
    selectedStatus,
    selectedRole,
    selectedDepartment,
    showAdvancedFilters
  } = filters;

  // REAL DATABASE INTEGRATION
  const { data: dbEmployees = [], isLoading, error } = useDetailHubEmployees();
  const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

  // Fetch all employee assignments with dealership data (optimized single query)
  const { data: assignmentsMap = {} } = useQuery({
    queryKey: ['employee-assignments-map', selectedDealerId],
    queryFn: async () => {
      if (!selectedDealerId) return {};

      const { data, error } = await supabase
        .from('detail_hub_employee_assignments')
        .select(`
          id,
          employee_id,
          dealership_id,
          schedule_template,
          status,
          dealership:dealerships(
            id,
            name,
            logo_url
          )
        `)
        .order('status', { ascending: true }); // Active assignments first

      if (error) {
        console.error('Error fetching assignments:', error);
        return {};
      }

      // Group assignments by employee_id for O(1) lookup
      const grouped = (data || []).reduce((acc: Record<string, any[]>, assignment) => {
        const empId = assignment.employee_id;
        if (!acc[empId]) {
          acc[empId] = [];
        }
        acc[empId].push(assignment);
        return acc;
      }, {});

      return grouped;
    },
    enabled: !!selectedDealerId,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });

  // Fetch last punch for each employee (optimized single query)
  const { data: lastPunchMap = {} } = useQuery({
    queryKey: ['employee-last-punch-map', selectedDealerId],
    queryFn: async () => {
      if (!selectedDealerId) return {};

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .select('employee_id, clock_in, clock_out')
        .order('clock_in', { ascending: false });

      if (error) {
        console.error('Error fetching last punches:', error);
        return {};
      }

      // Get the most recent punch (clock_in or clock_out) for each employee
      const punchMap = (data || []).reduce((acc: Record<string, string>, entry) => {
        const empId = entry.employee_id;

        // Skip if we already have a punch for this employee (since we ordered by clock_in desc)
        if (acc[empId]) return acc;

        // Use clock_out if available and more recent, otherwise use clock_in
        const lastPunch = entry.clock_out || entry.clock_in;
        acc[empId] = lastPunch;

        return acc;
      }, {});

      return punchMap;
    },
    enabled: !!selectedDealerId,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (more frequent for time entries)
    gcTime: GC_TIMES.SHORT, // 5 minutes
  });

  // Fetch auto-close entries for each employee (requires supervisor review)
  const { data: autoCloseMap = {} } = useQuery({
    queryKey: ['employee-auto-close-map', selectedDealerId],
    queryFn: async () => {
      if (!selectedDealerId) return {};

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .select('id, employee_id, auto_closed_at, auto_close_reason, requires_supervisor_review')
        .eq('dealership_id', selectedDealerId)
        .not('auto_closed_at', 'is', null) // Only entries that were auto-closed
        .order('auto_closed_at', { ascending: false });

      if (error) {
        console.error('Error fetching auto-close entries:', error);
        return {};
      }

      // Group auto-close entries by employee_id
      const grouped = (data || []).reduce((acc: Record<string, any[]>, entry) => {
        const empId = entry.employee_id;
        if (!acc[empId]) {
          acc[empId] = [];
        }
        acc[empId].push(entry);
        return acc;
      }, {});

      return grouped;
    },
    enabled: !!selectedDealerId,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (near real-time for review queue)
    gcTime: GC_TIMES.SHORT, // 5 minutes
  });

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  const handleOpenDialog = (employee?: DetailHubEmployee) => {
    if (employee) {
      setEditingEmployee(employee);
    } else {
      setEditingEmployee(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDeleteClick = (employee: DetailHubEmployee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (employeeToDelete) {
      // Soft delete: Change status to terminated instead of deleting
      if (employeeToDelete.status !== 'terminated') {
        updateEmployee(
          {
            id: employeeToDelete.id,
            updates: {
              status: 'terminated',
            },
          },
          {
            onSuccess: () => {
              setDeleteDialogOpen(false);
              setEmployeeToDelete(null);
            },
          }
        );
      } else {
        // Hard delete: Only for already terminated employees
        deleteEmployee(employeeToDelete.id, {
          onSuccess: () => {
            setDeleteDialogOpen(false);
            setEmployeeToDelete(null);
          },
        });
      }
    }
  };

  const handleReactivateClick = (employee: DetailHubEmployee) => {
    setEmployeeToReactivate(employee);
    setReactivateDialogOpen(true);
  };

  const handleReactivateConfirm = () => {
    if (employeeToReactivate) {
      updateEmployee(
        {
          id: employeeToReactivate.id,
          updates: {
            status: 'active',
          },
        },
        {
          onSuccess: () => {
            setReactivateDialogOpen(false);
            setEmployeeToReactivate(null);
          },
        }
      );
    }
  };

  const handleAutoCloseReviewClick = (employeeId: string) => {
    const entries = autoCloseMap[employeeId] || [];
    const pendingEntry = entries.find(e => e.requires_supervisor_review);

    if (pendingEntry) {
      setSelectedAutoCloseEntryId(pendingEntry.id);
      setShowAutoCloseReviewModal(true);
    }
  };

  // =====================================================
  // DATA TRANSFORMATION
  // =====================================================

  const employees = dbEmployees.length > 0 ? dbEmployees.map(emp => ({
    id: emp.id,
    employee_number: emp.employee_number,
    name: `${emp.first_name} ${emp.last_name}`,
    email: emp.email || '',
    phone: emp.phone || '',
    role: emp.role,
    department: emp.department,
    status: emp.status,
    hourlyRate: emp.hourly_rate || 0,
    hireDate: emp.hire_date,
    lastPunch: lastPunchMap[emp.id] || null,
    avatar: "/placeholder.svg",
    rawData: emp,
  })) : [];

  const terminatedEmployees = employees.filter(emp => emp.status === 'terminated');

  const filteredEmployees = employees.filter(employee => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employee_number.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;

    // Role filter
    const matchesRole = selectedRole === 'all' || employee.role === selectedRole;

    // Department filter
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;

    return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      active: { variant: "default", className: "bg-green-100 text-green-800" },
      inactive: { variant: "secondary", className: "" },
      suspended: { variant: "outline", className: "bg-yellow-100 text-yellow-800" },
      terminated: { variant: "destructive", className: "" },
    };
    const config = statusMap[status] || statusMap.inactive;
    return (
      <Badge variant={config.variant} className={config.className}>
        {t(`detail_hub.employees.${status}`)}
      </Badge>
    );
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      detailer: t('detail_hub.employees.roles.detailer'),
      car_wash: t('detail_hub.employees.roles.car_wash'),
      supervisor: t('detail_hub.employees.roles.supervisor'),
      manager: t('detail_hub.employees.roles.manager'),
      technician: t('detail_hub.employees.roles.technician'),
    };
    return roleMap[role] || role;
  };

  const getDepartmentLabel = (department: string) => {
    const deptMap: Record<string, string> = {
      detail: t('detail_hub.employees.departments.detail'),
      car_wash: t('detail_hub.employees.departments.car_wash'),
      service: t('detail_hub.employees.departments.service'),
      management: t('detail_hub.employees.departments.management'),
    };
    return deptMap[department] || department;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.employees.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.employees.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTerminatedModal(true)}
            className="text-gray-600"
          >
            <Ban className="w-4 h-4 mr-2" />
            {t('detail_hub.employees.view_terminated')}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t('detail_hub.employees.add_employee')}
          </Button>

          <EmployeeWizardModal
            open={isDialogOpen}
            onClose={handleCloseDialog}
            editingEmployee={editingEmployee}
            selectedDealerId={selectedDealerId}
          />
        </div>
      </div>

      {/* Quick Stats - Moved to top */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-enhanced border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.total_employees')}</p>
                <p className="text-3xl font-bold text-blue-600">{employees.length}</p>
              </div>
              <Shield className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-enhanced border-green-200 bg-green-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.active_employees')}</p>
                <p className="text-3xl font-bold text-green-600">{employees.filter(e => e.status === 'active').length}</p>
              </div>
              <Clock className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-enhanced border-orange-200 bg-orange-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.hourly_rate')}</p>
                <p className="text-3xl font-bold text-orange-600">
                  ${employees.length > 0 ? (employees.reduce((sum, emp) => sum + emp.hourlyRate, 0) / employees.length).toFixed(2) : '0.00'}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-enhanced border-indigo-200 bg-indigo-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.departments.title')}</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {[...new Set(employees.map(e => e.department))].length}
                </p>
              </div>
              <UserPlus className="w-10 h-10 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Advanced Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('detail_hub.employees.search_employees')}
                value={searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                className="max-w-sm"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setFilters({ showAdvancedFilters: !showAdvancedFilters })}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              {t('detail_hub.timecard.filters.advanced')}
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0.5 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAdvancedFilters}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                {t('detail_hub.timecard.filters.clear_filters')}
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('detail_hub.timecard.filters.status.label')}</Label>
                <Select value={selectedStatus} onValueChange={(val) => setFilters({ selectedStatus: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('detail_hub.timecard.filters.status.all')}</SelectItem>
                    <SelectItem value="active">{t('detail_hub.employees.active')}</SelectItem>
                    <SelectItem value="inactive">{t('detail_hub.employees.inactive')}</SelectItem>
                    <SelectItem value="suspended">{t('detail_hub.employees.suspended')}</SelectItem>
                    <SelectItem value="terminated">{t('detail_hub.employees.terminated')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('detail_hub.employees.role')}</Label>
                <Select value={selectedRole} onValueChange={(val) => setFilters({ selectedRole: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('detail_hub.timecard.filters.status.all')}</SelectItem>
                    <SelectItem value="detailer">{t('detail_hub.employees.roles.detailer')}</SelectItem>
                    <SelectItem value="car_wash">{t('detail_hub.employees.roles.car_wash')}</SelectItem>
                    <SelectItem value="supervisor">{t('detail_hub.employees.roles.supervisor')}</SelectItem>
                    <SelectItem value="manager">{t('detail_hub.employees.roles.manager')}</SelectItem>
                    <SelectItem value="technician">{t('detail_hub.employees.roles.technician')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('detail_hub.employees.department')}</Label>
                <Select value={selectedDepartment} onValueChange={(val) => setFilters({ selectedDepartment: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('detail_hub.timecard.filters.status.all')}</SelectItem>
                    <SelectItem value="detail">{t('detail_hub.employees.departments.detail')}</SelectItem>
                    <SelectItem value="car_wash">{t('detail_hub.employees.departments.car_wash')}</SelectItem>
                    <SelectItem value="service">{t('detail_hub.employees.departments.service')}</SelectItem>
                    <SelectItem value="management">{t('detail_hub.employees.departments.management')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail_hub.employees.employee_list')} ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detail_hub.employees.employee_details')}</TableHead>
                <TableHead>{t('detail_hub.employees.shift_hours_dealers')}</TableHead>
                <TableHead>{t('detail_hub.employees.status')}</TableHead>
                <TableHead>{t('detail_hub.employees.hourly_rate')}</TableHead>
                <TableHead>{t('detail_hub.employees.last_punch')}</TableHead>
                <TableHead>{t('detail_hub.employees.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      {t('detail_hub.common.loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onDoubleClick={() => handleOpenDialog(employee.rawData)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.employee_number}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ShiftHoursCell
                      employeeId={employee.id}
                      assignments={assignmentsMap[employee.id] || []}
                    />
                  </TableCell>
                  <TableCell>{getStatusBadge(employee.status)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => {
                        setVisibleSalaries(prev => {
                          const updated = new Set(prev);
                          if (updated.has(employee.id)) {
                            updated.delete(employee.id);
                          } else {
                            updated.add(employee.id);
                          }
                          return updated;
                        });
                      }}
                      className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer group"
                      title={visibleSalaries.has(employee.id) ? "Click to hide salary" : "Click to reveal salary"}
                    >
                      {visibleSalaries.has(employee.id) ? (
                        <>
                          <span className="font-medium text-emerald-600">
                            ${employee.hourlyRate.toFixed(2)}/hr
                          </span>
                          <EyeOff className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-gray-400">••••••</span>
                          <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                        </>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">
                    {employee.lastPunch ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {format(new Date(employee.lastPunch), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(employee.lastPunch), 'h:mm a')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* View Logs */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployeeForLogs(employee.rawData);
                          setShowLogsModal(true);
                        }}
                        title={t('detail_hub.timecard.actions.view_logs')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                      </button>

                      {/* Edit Employee */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(employee.rawData);
                        }}
                        title={t('detail_hub.timecard.actions.edit')}
                        className="p-1 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>

                      {/* Enroll Face ID */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmployeeForFaceEnrollment(employee.rawData);
                          setFaceEnrollmentOpen(true);
                        }}
                        title={t('detail_hub.employees.enroll_face_id')}
                        className={`p-1 rounded transition-colors ${
                          employee.rawData.face_descriptor
                            ? 'bg-green-50 hover:bg-green-100'
                            : 'hover:bg-indigo-50'
                        }`}
                      >
                        {employee.rawData.face_descriptor ? (
                          <Scan className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </button>

                      {/* Dealership Assignments */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmployeeForAssignments(employee.rawData);
                          setShowAssignmentsModal(true);
                        }}
                        title="Manage Dealership Assignments"
                        className="p-1 hover:bg-purple-50 rounded transition-colors"
                      >
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      </button>

                      {/* Terminate/Delete Employee */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(employee.rawData);
                        }}
                        title={
                          employee.rawData.status === 'terminated'
                            ? t('detail_hub.employees.delete_permanently')
                            : t('detail_hub.employees.terminate_employee')
                        }
                        className={`p-1 rounded transition-colors ${
                          employee.rawData.status === 'terminated'
                            ? 'hover:bg-red-100'
                            : 'hover:bg-orange-50'
                        }`}
                      >
                        {employee.rawData.status === 'terminated' ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <Ban className="w-3.5 h-3.5 text-orange-600" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete/Terminate Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {employeeToDelete?.status === 'terminated'
                ? t('detail_hub.employees.confirm_delete_title')
                : t('detail_hub.employees.confirm_terminate_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {employeeToDelete?.status === 'terminated' ? (
                <>
                  {t('detail_hub.employees.confirm_delete_message')}{' '}
                  <strong>
                    {employeeToDelete?.first_name} {employeeToDelete?.last_name}
                  </strong>{' '}
                  ({employeeToDelete?.employee_number}). {t('detail_hub.employees.cannot_undo')}
                </>
              ) : (
                <>
                  {t('detail_hub.employees.confirm_terminate_message')}{' '}
                  <strong>
                    {employeeToDelete?.first_name} {employeeToDelete?.last_name}
                  </strong>{' '}
                  ({employeeToDelete?.employee_number}). {t('detail_hub.employees.can_reactivate')}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isUpdating}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting || isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {(isDeleting || isUpdating) ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : employeeToDelete?.status === 'terminated' ? (
                t('detail_hub.employees.delete_permanently')
              ) : (
                t('detail_hub.employees.terminate_employee')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employee Audit Logs Modal */}
      <EmployeeAuditLogsModal
        open={showLogsModal}
        onOpenChange={setShowLogsModal}
        employeeId={selectedEmployeeForLogs?.id || null}
        employeeName={selectedEmployeeForLogs ? `${selectedEmployeeForLogs.first_name} ${selectedEmployeeForLogs.last_name}` : ''}
      />

      {/* Face Enrollment Modal */}
      {employeeForFaceEnrollment && (
        <FaceEnrollmentModal
          open={faceEnrollmentOpen}
          onClose={() => {
            setFaceEnrollmentOpen(false);
            setEmployeeForFaceEnrollment(null);
          }}
          employee={employeeForFaceEnrollment}
          onEnrollmentComplete={() => {
            // Refetch employees to update face_descriptor status
            // The hook will automatically refetch
          }}
        />
      )}

      {/* Dealership Assignments Modal */}
      <Dialog open={showAssignmentsModal} onOpenChange={setShowAssignmentsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dealership Assignments
              {employeeForAssignments && (
                <span className="text-gray-500">
                  - {employeeForAssignments.first_name} {employeeForAssignments.last_name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage which dealerships this employee can work at and configure their schedule for each location.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {employeeForAssignments && (
              <EmployeeAssignmentsTable
                employeeId={employeeForAssignments.id}
                employeeName={`${employeeForAssignments.first_name} ${employeeForAssignments.last_name}`}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Terminated Employees Modal */}
      <Dialog open={showTerminatedModal} onOpenChange={setShowTerminatedModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('detail_hub.employees.terminated_employees')}</DialogTitle>
            <DialogDescription>
              {t('detail_hub.employees.terminated_employees_description')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[600px] pr-4">
            {terminatedEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserCheck className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  {t('detail_hub.employees.no_terminated_employees')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {terminatedEmployees.map((employee) => (
                  <Card key={employee.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                          <UserX className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{employee.name}</h3>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {t('detail_hub.employees.terminated')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {t('detail_hub.employees.employee_number')}: {employee.employee_number}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('detail_hub.employees.role')}: </span>
                              <span className="font-medium">
                                {employee.role === 'detailer' && t('detail_hub.employees.roles.detailer')}
                                {employee.role === 'car_wash' && t('detail_hub.employees.roles.car_wash')}
                                {employee.role === 'supervisor' && t('detail_hub.employees.roles.supervisor')}
                                {employee.role === 'manager' && t('detail_hub.employees.roles.manager')}
                                {employee.role === 'technician' && t('detail_hub.employees.roles.technician')}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('detail_hub.employees.department')}: </span>
                              <span className="font-medium">
                                {employee.department === 'detail' && t('detail_hub.employees.departments.detail')}
                                {employee.department === 'car_wash' && t('detail_hub.employees.departments.car_wash')}
                                {employee.department === 'service' && t('detail_hub.employees.departments.service')}
                                {employee.department === 'management' && t('detail_hub.employees.departments.management')}
                              </span>
                            </div>
                            {employee.email && (
                              <div>
                                <span className="text-muted-foreground">{t('common.email')}: </span>
                                <span className="font-medium">{employee.email}</span>
                              </div>
                            )}
                            {employee.phone && (
                              <div>
                                <span className="text-muted-foreground">{t('common.phone')}: </span>
                                <span className="font-medium">{employee.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivateClick(employee.rawData)}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          {t('detail_hub.employees.reactivate')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(employee.rawData)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('detail_hub.employees.delete_permanently')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('detail_hub.employees.confirm_reactivate_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail_hub.employees.confirm_reactivate_message')}{' '}
              <strong>
                {employeeToReactivate?.first_name} {employeeToReactivate?.last_name}
              </strong>{' '}
              ({employeeToReactivate?.employee_number})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateConfirm}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                t('detail_hub.employees.reactivate')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Close Review Modal */}
      <AutoClosedPunchReviewModal
        timeEntryId={selectedAutoCloseEntryId}
        isOpen={showAutoCloseReviewModal}
        onClose={() => {
          setShowAutoCloseReviewModal(false);
          setSelectedAutoCloseEntryId(null);
        }}
      />
    </div>
  );
};

export default EmployeePortal;
