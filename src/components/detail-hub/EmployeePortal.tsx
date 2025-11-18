import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, Search, Edit, Trash2, Camera, Shield, Clock, DollarSign, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// REAL DATABASE INTEGRATION
import {
  useDetailHubEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  type DetailHubEmployee
} from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<DetailHubEmployee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<DetailHubEmployee | null>(null);

  const { selectedDealerId } = useDealerFilter();

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
  // CRUD OPERATIONS
  // =====================================================

  const handleOpenDialog = (employee?: DetailHubEmployee) => {
    if (employee) {
      setEditingEmployee(employee);

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
      deleteEmployee(employeeToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setEmployeeToDelete(null);
        },
      });
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

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('detail_hub.employees.add_employee')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? t('detail_hub.employees.edit') : t('detail_hub.employees.add_employee')}
                </DialogTitle>
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
                      <FormControl>
                        <Input
                          type="password"
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
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t('detail_hub.employees.kiosk_pin_help')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('detail_hub.employees.search_employees')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
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
                  <TableCell>${employee.hourlyRate.toFixed(2)}/hr</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.lastPunch ? new Date(employee.lastPunch).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(employee.rawData)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(employee.rawData)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete employee{' '}
              <strong>
                {employeeToDelete?.first_name} {employeeToDelete?.last_name}
              </strong>{' '}
              ({employeeToDelete?.employee_number}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Employee'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.active_employees')}</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.active')} {t('time.today')}</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.hourly_rate')}</p>
                <p className="text-2xl font-bold">
                  ${employees.length > 0 ? (employees.reduce((sum, emp) => sum + emp.hourlyRate, 0) / employees.length).toFixed(2) : '0.00'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeePortal;
