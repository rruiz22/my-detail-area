import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeePortalPersistence } from "@/hooks/useEmployeePortalPersistence";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Ban, Calendar, Camera, ClipboardList, Clock, DollarSign, Edit2, Eye, EyeOff, FileText, Filter, Scan, Search, Shield, Sparkles, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { EmployeeAuditLogsModal } from "./EmployeeAuditLogsModal";
import { FaceEnrollmentModal } from "./FaceEnrollmentModal";

// REAL DATABASE INTEGRATION
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import {
  useCreateEmployee,
  useDeleteEmployee,
  useDetailHubEmployees,
  useUpdateEmployee,
  type DetailHubEmployee
} from "@/hooks/useDetailHubDatabase";
import { supabase } from "@/integrations/supabase/client";

// =====================================================
// VALIDATION SCHEMA
// =====================================================

// Note: Validation messages are now handled by FormMessage component with translations
const employeeFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["detailer", "car_wash", "supervisor", "manager", "technician"]),
  department: z.enum(["detail", "car_wash", "service", "management"]),
  hourly_rate: z.coerce.number().positive("Hourly rate must be positive").nullable().optional(),
  hire_date: z.date(),
  status: z.enum(["active", "inactive", "suspended", "terminated"]).default("active"),
  pin_code: z.string()
    .min(1, "PIN code is required")
    .regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),

  // NEW: Schedule template fields
  auto_generate_schedules: z.boolean().default(false),
  template_shift_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  template_shift_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  template_days_of_week: z.array(z.number().min(0).max(6)).optional(),
  template_break_minutes: z.coerce.number().min(0).max(120).optional(),
  template_break_is_paid: z.boolean().default(false),
  schedule_generation_days_ahead: z.coerce.number().min(7).max(90).default(30),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const EmployeePortal = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<DetailHubEmployee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<DetailHubEmployee | null>(null);
  const [showPIN, setShowPIN] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedEmployeeForLogs, setSelectedEmployeeForLogs] = useState<DetailHubEmployee | null>(null);
  const [showTerminatedModal, setShowTerminatedModal] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [employeeToReactivate, setEmployeeToReactivate] = useState<DetailHubEmployee | null>(null);
  const [faceEnrollmentOpen, setFaceEnrollmentOpen] = useState(false);
  const [employeeForFaceEnrollment, setEmployeeForFaceEnrollment] = useState<DetailHubEmployee | null>(null);

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
  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

  // Form setup
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: null,
      phone: null,
      role: "detailer",
      department: "detail",
      hourly_rate: null,
      hire_date: new Date(),
      status: "active",
      pin_code: "",
      // Schedule template defaults
      auto_generate_schedules: false,
      template_shift_start: "08:00",
      template_shift_end: "17:00",
      template_days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
      template_break_minutes: 30,
      template_break_is_paid: false,
      schedule_generation_days_ahead: 30,
    },
  });

  // =====================================================
  // EMPLOYEE NUMBER GENERATION
  // =====================================================
  const generateEmployeeNumber = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('detail_hub_employees')
        .select('employee_number')
        .order('employee_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return 'EMP001';
      }

      const lastNumber = data[0].employee_number;
      const numericPart = parseInt(lastNumber.replace('EMP', ''), 10);
      const nextNumber = numericPart + 1;
      return `EMP${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating employee number:', error);
      return 'EMP001';
    }
  };

  // =====================================================
  // PIN CODE GENERATION
  // =====================================================
  const generateQuickPIN = async (): Promise<string> => {
    // Generate a random 6-digit PIN and ensure it's unique
    let pin: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate random 6-digit PIN
      pin = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        // Check if PIN already exists in database
        const { data, error } = await supabase
          .from('detail_hub_employees')
          .select('pin_code')
          .eq('pin_code', pin)
          .maybeSingle();

        if (error) {
          console.error('Error checking PIN uniqueness:', error);
          break;
        }

        // If no employee found with this PIN, it's unique
        if (!data) {
          isUnique = true;
          return pin;
        }

        attempts++;
      } catch (error) {
        console.error('Error generating unique PIN:', error);
        break;
      }
    }

    // Fallback: return a timestamp-based PIN if all attempts fail
    return Date.now().toString().slice(-6);
  };

  const handleGeneratePIN = async () => {
    const newPIN = await generateQuickPIN();
    form.setValue('pin_code', newPIN);
  };

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  const handleOpenDialog = (employee?: DetailHubEmployee) => {
    if (employee) {
      setEditingEmployee(employee);

      // ✅ FIX: Show PIN when editing (so user can see existing PIN)
      setShowPIN(true);

      // Parse schedule template if exists
      const template = employee.schedule_template as any;

      form.reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        department: employee.department,
        hourly_rate: employee.hourly_rate,
        hire_date: new Date(employee.hire_date),
        status: employee.status,
        pin_code: employee.pin_code || "",
        // Load template values
        auto_generate_schedules: employee.auto_generate_schedules || false,
        template_shift_start: template?.shift_start_time || "08:00",
        template_shift_end: template?.shift_end_time || "17:00",
        template_days_of_week: template?.days_of_week || [1, 2, 3, 4, 5],
        template_break_minutes: template?.required_break_minutes || 30,
        template_break_is_paid: template?.break_is_paid || false,
        schedule_generation_days_ahead: employee.schedule_generation_days_ahead || 30,
      });
    } else {
      setEditingEmployee(null);

      // ✅ FIX: Hide PIN when creating new employee (will be auto-generated)
      setShowPIN(false);

      form.reset({
        first_name: "",
        last_name: "",
        email: null,
        phone: null,
        role: "detailer",
        department: "detail",
        hourly_rate: null,
        hire_date: new Date(),
        status: "active",
        pin_code: "",
        auto_generate_schedules: false,
        template_shift_start: "08:00",
        template_shift_end: "17:00",
        template_days_of_week: [1, 2, 3, 4, 5],
        template_break_minutes: 30,
        template_break_is_paid: false,
        schedule_generation_days_ahead: 30,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setShowPIN(false); // ✅ FIX: Reset PIN visibility when closing dialog
    form.reset();
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    if (selectedDealerId === 'all') {
      return;
    }

    // Build schedule template JSONB if auto-generate is enabled
    const scheduleTemplate = values.auto_generate_schedules ? {
      shift_start_time: values.template_shift_start,
      shift_end_time: values.template_shift_end,
      days_of_week: values.template_days_of_week || [1,2,3,4,5],
      required_break_minutes: values.template_break_minutes || 30,
      break_is_paid: values.template_break_is_paid || false,
      early_punch_allowed_minutes: 5,
      late_punch_grace_minutes: 5,
      assigned_kiosk_id: null,
    } : null;

    if (editingEmployee) {
      // UPDATE existing employee
      updateEmployee(
        {
          id: editingEmployee.id,
          updates: {
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email || null,
            phone: values.phone || null,
            role: values.role,
            department: values.department,
            hourly_rate: values.hourly_rate || null,
            hire_date: format(values.hire_date, 'yyyy-MM-dd'),
            status: values.status,
            pin_code: values.pin_code,
            // Schedule template
            schedule_template: scheduleTemplate,
            auto_generate_schedules: values.auto_generate_schedules,
            schedule_generation_days_ahead: values.schedule_generation_days_ahead,
          },
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      // CREATE new employee
      const employeeNumber = await generateEmployeeNumber();

      createEmployee(
        {
          dealership_id: selectedDealerId as number,
          employee_number: employeeNumber,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          role: values.role,
          department: values.department,
          hourly_rate: values.hourly_rate || null,
          hire_date: format(values.hire_date, 'yyyy-MM-dd'),
          status: values.status,
          pin_code: values.pin_code,
          // Schedule template
          schedule_template: scheduleTemplate,
          auto_generate_schedules: values.auto_generate_schedules,
          schedule_generation_days_ahead: values.schedule_generation_days_ahead,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    }
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
    lastPunch: emp.updated_at,
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <UserPlus className="w-4 h-4 mr-2" />
                {t('detail_hub.employees.add_employee')}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? t('detail_hub.employees.edit') : t('detail_hub.employees.add_employee')}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee
                    ? t('detail_hub.employees.edit_description')
                    : t('detail_hub.employees.add_description')}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.first_name')}</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.last_name')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.email')}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john.smith@dealership.com"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.phone')}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(555) 123-4567"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('detail_hub.employees.role')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('validation.option_required')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="detailer">{t('detail_hub.employees.roles.detailer')}</SelectItem>
                            <SelectItem value="technician">{t('detail_hub.employees.roles.technician')}</SelectItem>
                            <SelectItem value="car_wash">{t('detail_hub.employees.roles.car_wash')}</SelectItem>
                            <SelectItem value="supervisor">{t('detail_hub.employees.roles.supervisor')}</SelectItem>
                            <SelectItem value="manager">{t('detail_hub.employees.roles.manager')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('detail_hub.employees.department')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('validation.option_required')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="detail">{t('detail_hub.employees.departments.detail')}</SelectItem>
                            <SelectItem value="car_wash">{t('detail_hub.employees.departments.car_wash')}</SelectItem>
                            <SelectItem value="service">{t('detail_hub.employees.departments.service')}</SelectItem>
                            <SelectItem value="management">{t('detail_hub.employees.departments.management')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('detail_hub.employees.hourly_rate')} ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="25.00"
                            step="0.01"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('detail_hub.employees.hire_date')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>{t('detail_hub.timecard.pick_date')}</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('detail_hub.employees.status')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">{t('detail_hub.employees.active')}</SelectItem>
                            <SelectItem value="inactive">{t('detail_hub.employees.inactive')}</SelectItem>
                            <SelectItem value="suspended">{t('detail_hub.employees.suspended')}</SelectItem>
                            <SelectItem value="terminated">{t('detail_hub.employees.terminated')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pin_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {t('detail_hub.employees.kiosk_pin')}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <FormControl>
                              <Input
                                type={showPIN ? "text" : "password"}
                                placeholder={t('detail_hub.employees.kiosk_pin_placeholder')}
                                maxLength={6}
                                pattern="\d*"
                                inputMode="numeric"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  field.onChange(value);
                                }}
                                required
                                className="pr-10"
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPIN(!showPIN)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                              title={showPIN ? t('common.hide') : t('common.show')}
                            >
                              {showPIN ? (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGeneratePIN}
                            className="shrink-0"
                            title={t('detail_hub.employees.generate_pin')}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('detail_hub.employees.kiosk_pin_help')}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Schedule Template Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {t('detail_hub.employees.schedule_template')}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {t('detail_hub.employees.schedule_template_description')}
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="auto_generate_schedules"
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="auto_generate"
                            checked={field.value}
                            onChange={field.onChange}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <label htmlFor="auto_generate" className="text-sm cursor-pointer">
                            {t('detail_hub.employees.auto_generate_schedules')}
                          </label>
                        </div>
                      )}
                    />
                  </div>

                  {form.watch('auto_generate_schedules') && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Shift Times */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="template_shift_start"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('detail_hub.employees.default_start_time')}</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} className="font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="template_shift_end"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('detail_hub.employees.default_end_time')}</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} className="font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Days of Week */}
                      <FormField
                        control={form.control}
                        name="template_days_of_week"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('detail_hub.employees.work_days')}</FormLabel>
                            <div className="grid grid-cols-7 gap-2">
                              {[
                                { value: 0, label: 'S' },
                                { value: 1, label: 'M' },
                                { value: 2, label: 'T' },
                                { value: 3, label: 'W' },
                                { value: 4, label: 'T' },
                                { value: 5, label: 'F' },
                                { value: 6, label: 'S' },
                              ].map((day) => {
                                const isSelected = (field.value || []).includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => {
                                      const current = field.value || [];
                                      const updated = isSelected
                                        ? current.filter((d: number) => d !== day.value)
                                        : [...current, day.value].sort();
                                      field.onChange(updated);
                                    }}
                                    className={cn(
                                      "h-10 w-full rounded-md border-2 font-medium transition-colors text-sm",
                                      isSelected
                                        ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                                        : "border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                                    )}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Break Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="template_break_minutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('detail_hub.employees.default_break')}</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Input type="number" min="0" max="120" step="15" {...field} className="w-20" />
                                  <span className="text-sm text-gray-600">{t('detail_hub.schedules.minutes')}</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="template_break_is_paid"
                          render={({ field }) => (
                            <FormItem className="flex flex-col justify-end">
                              <div className="flex items-center gap-2 h-10">
                                <input
                                  type="checkbox"
                                  id="template_break_paid"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <label htmlFor="template_break_paid" className="text-sm cursor-pointer">
                                  {t('detail_hub.employees.paid_break')}
                                </label>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Days Ahead */}
                      <FormField
                        control={form.control}
                        name="schedule_generation_days_ahead"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('detail_hub.employees.days_ahead')}</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input type="number" min="7" max="90" step="1" {...field} className="w-20" />
                                <span className="text-sm text-gray-600">
                                  {t('detail_hub.employees.days_ahead_description')}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-center py-2">
                  <Button type="button" variant="outline" className="w-40">
                    <Camera className="w-4 h-4 mr-2" />
                    {t('detail_hub.employees.enroll_face_id')}
                  </Button>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    {t('detail_hub.common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {isCreating || isUpdating ? (
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingEmployee ? t('common.save') : t('detail_hub.employees.add_employee')}
                  </Button>
                </div>
              </form>
            </Form>
            </div>
          </DialogContent>
        </Dialog>
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
                <TableHead>{t('detail_hub.employees.role')}</TableHead>
                <TableHead>{t('detail_hub.employees.department')}</TableHead>
                <TableHead>{t('detail_hub.employees.status')}</TableHead>
                <TableHead>{t('detail_hub.employees.hourly_rate')}</TableHead>
                <TableHead>{t('detail_hub.employees.last_punch')}</TableHead>
                <TableHead>{t('detail_hub.employees.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      {t('detail_hub.common.loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
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
                  <TableCell>{getRoleLabel(employee.role)}</TableCell>
                  <TableCell>{getDepartmentLabel(employee.department)}</TableCell>
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

                      {/* View Timecard */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Navigate to timecard view
                        }}
                        title={t('detail_hub.employees.view_timecard')}
                        className="p-1 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
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
    </div>
  );
};

export default EmployeePortal;
