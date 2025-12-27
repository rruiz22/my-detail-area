/**
 * Employee Wizard Modal
 *
 * Two-step wizard for creating/editing employees with their dealership assignments.
 * Step 1: Basic employee information
 * Step 2: Dealership assignments with schedule configuration
 *
 * Consolidates employee creation and assignment setup in a single guided flow.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

// UI Components
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Components
import { ReminderPreviewDialog } from "./ReminderPreviewDialog";

// Icons
import {
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Eye,
  EyeOff,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  User
} from "lucide-react";

// Utilities
import { useToast } from "@/hooks/use-toast";
import { useDealerships } from "@/hooks/useDealerships";
import {
  useCreateEmployee,
  useUpdateEmployee,
  type DetailHubEmployee
} from "@/hooks/useDetailHubDatabase";
import {
  useCreateAssignment,
  useDeleteAssignment,
  useEmployeeAssignments,
  useUpdateAssignment,
  type ScheduleTemplate
} from "@/hooks/useEmployeeAssignments";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// =====================================================
// TYPES & VALIDATION
// =====================================================

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
  preferred_language: z.enum(["en", "es", "pt-BR"]).default("en"),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface PendingAssignment {
  id: string; // temp ID for new, real ID for existing
  dealership_id: number;
  dealership_name: string;
  dealership_logo?: string | null;
  schedule_template: ScheduleTemplate;
  notes: string;
  /** True if this is an existing assignment from database */
  isExisting?: boolean;
}

interface EmployeeWizardModalProps {
  /** Whether the modal is open */
  open: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Existing employee to edit (null for create mode) */
  editingEmployee?: DetailHubEmployee | null;

  /** Pre-selected dealer ID for new assignments */
  defaultDealerId?: number | null;

  /** Dealer ID for the current filter context */
  selectedDealerId?: number | null;
}

// =====================================================
// COMPONENT
// =====================================================

export function EmployeeWizardModal({
  open,
  onClose,
  editingEmployee,
  defaultDealerId,
  selectedDealerId
}: EmployeeWizardModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: dealerships } = useDealerships();
  const queryClient = useQueryClient();

  // Mutations
  const { mutateAsync: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutateAsync: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const { mutateAsync: createAssignment, isPending: isCreatingAssignment } = useCreateAssignment();
  const { mutateAsync: updateAssignment, isPending: isUpdatingAssignment } = useUpdateAssignment();
  const { mutateAsync: deleteAssignment, isPending: isDeletingAssignment } = useDeleteAssignment();

  // Fetch existing assignments when editing an employee
  const { data: existingAssignments } = useEmployeeAssignments(editingEmployee?.id || null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [showPIN, setShowPIN] = useState(false);

  // Pending assignments (not yet saved to DB)
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);

  // Track existing assignments marked for deletion
  const [assignmentsToDelete, setAssignmentsToDelete] = useState<string[]>([]);

  // Currently editing assignment (inline form)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  // Form for employee data
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
      preferred_language: "en",
    },
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setShowPIN(false);
      setEditingAssignmentId(null);
      setAssignmentsToDelete([]); // Reset deletion list

      if (editingEmployee) {
        // Edit mode: populate form with existing data
        form.reset({
          first_name: editingEmployee.first_name,
          last_name: editingEmployee.last_name,
          email: editingEmployee.email,
          phone: editingEmployee.phone,
          role: editingEmployee.role as EmployeeFormValues["role"],
          department: editingEmployee.department as EmployeeFormValues["department"],
          hourly_rate: editingEmployee.hourly_rate,
          hire_date: new Date(editingEmployee.hire_date),
          status: editingEmployee.status as EmployeeFormValues["status"],
          pin_code: editingEmployee.pin_code || "",
          preferred_language: (editingEmployee.preferred_language as EmployeeFormValues["preferred_language"]) || "en",
        });
        // Edit mode: assignments will be loaded separately via useEffect below
      } else {
        // Create mode: reset form and pre-select current dealer
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
          preferred_language: "en",
        });

        // Pre-select current dealer as default assignment
        const dealerIdToUse = defaultDealerId || selectedDealerId;
        if (dealerIdToUse && dealerships) {
          const dealer = dealerships.find(d => d.id === dealerIdToUse);
          if (dealer) {
            setPendingAssignments([{
              id: `temp-${Date.now()}`,
              dealership_id: dealer.id,
              dealership_name: dealer.name,
              dealership_logo: dealer.logo_url,
              schedule_template: getDefaultScheduleTemplate(),
              notes: "",
              isExisting: false
            }]);
          } else {
            setPendingAssignments([]);
          }
        } else {
          setPendingAssignments([]);
        }
      }
    }
  }, [open, editingEmployee, defaultDealerId, selectedDealerId, dealerships, form]);

  // Load existing assignments when editing an employee
  useEffect(() => {
    if (open && editingEmployee && existingAssignments && existingAssignments.length > 0) {
      // Convert existing assignments to PendingAssignment format
      const converted: PendingAssignment[] = existingAssignments
        .filter(a => a.status === 'active') // Only show active assignments
        .map(a => ({
          id: a.id, // Use real ID for existing assignments
          dealership_id: a.dealership_id,
          dealership_name: a.dealership.name,
          dealership_logo: a.dealership.logo_url,
          schedule_template: a.schedule_template || getDefaultScheduleTemplate(),
          notes: a.notes || '',
          isExisting: true
        }));
      setPendingAssignments(converted);
    } else if (open && editingEmployee && existingAssignments && existingAssignments.length === 0) {
      // Employee has no active assignments
      setPendingAssignments([]);
    }
  }, [open, editingEmployee, existingAssignments]);

  // =====================================================
  // HELPERS
  // =====================================================

  function getDefaultScheduleTemplate(): ScheduleTemplate {
    return {
      shift_start_time: '08:00',
      shift_end_time: '18:00', // 8am - 6pm default
      days_of_week: [1, 2, 3, 4, 5, 6], // Monday-Saturday
      early_punch_allowed_minutes: 5, // Can punch in 5 min early
      late_punch_grace_minutes: undefined, // No late limit
      required_break_minutes: 30,
      break_is_paid: false,
      require_face_validation: false,
      auto_close_enabled: false,
      auto_close_first_reminder: 30, // Single reminder at 30 min after shift end
      auto_close_second_reminder: undefined, // No second reminder
      auto_close_window_minutes: 60 // Auto-close at 60 min after shift end
    };
  }

  function generatePIN() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    form.setValue("pin_code", pin);
  }

  function formatDaysOfWeek(days: number[] | undefined): string {
    if (!days || days.length === 0) return 'No days';
    if (days.length === 7) return 'All days';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sortedDays = [...days].sort((a, b) => a - b);

    // Check if days are consecutive
    let isConsecutive = true;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] !== sortedDays[i - 1] + 1) {
        isConsecutive = false;
        break;
      }
    }

    if (isConsecutive && sortedDays.length > 2) {
      return `${dayNames[sortedDays[0]]}-${dayNames[sortedDays[sortedDays.length - 1]]}`;
    }

    return sortedDays.map(d => dayNames[d]).join(', ');
  }

  // =====================================================
  // HANDLERS
  // =====================================================

  async function handleNext() {
    // Validate step 1 before moving to step 2
    const isValid = await form.trigger();
    if (isValid) {
      setCurrentStep(2);
    }
  }

  function handleBack() {
    setCurrentStep(1);
  }

  function handleAddAssignment() {
    // Open a blank assignment form
    const newAssignment: PendingAssignment = {
      id: `temp-${Date.now()}`,
      dealership_id: 0,
      dealership_name: "",
      dealership_logo: null,
      schedule_template: getDefaultScheduleTemplate(),
      notes: "",
      isExisting: false
    };
    setPendingAssignments(prev => [...prev, newAssignment]);
    setEditingAssignmentId(newAssignment.id);
  }

  function handleRemoveAssignment(assignmentId: string) {
    // Find the assignment to check if it's existing
    const assignmentToRemove = pendingAssignments.find(a => a.id === assignmentId);

    if (assignmentToRemove?.isExisting) {
      // Mark existing assignment for deletion (will be processed on save)
      setAssignmentsToDelete(prev => [...prev, assignmentId]);
    }

    // Remove from UI state
    setPendingAssignments(prev => prev.filter(a => a.id !== assignmentId));

    if (editingAssignmentId === assignmentId) {
      setEditingAssignmentId(null);
    }
  }

  function handleUpdateAssignment(assignmentId: string, updates: Partial<PendingAssignment>) {
    setPendingAssignments(prev =>
      prev.map(a => a.id === assignmentId ? { ...a, ...updates } : a)
    );
  }

  function handleSelectDealer(assignmentId: string, dealerId: number) {
    const dealer = dealerships?.find(d => d.id === dealerId);
    if (dealer) {
      handleUpdateAssignment(assignmentId, {
        dealership_id: dealer.id,
        dealership_name: dealer.name,
        dealership_logo: dealer.logo_url
      });
    }
  }

  async function handleSubmit() {
    // Final validation
    const isValid = await form.trigger();
    if (!isValid) {
      setCurrentStep(1);
      return;
    }

    // Validate assignments (required for new employees)
    if (!editingEmployee && pendingAssignments.length === 0) {
      toast({
        title: t('detail_hub.wizard.error_no_assignments'),
        description: t('detail_hub.wizard.error_no_assignments_description'),
        variant: "destructive"
      });
      return;
    }

    // Validate all assignments have a dealer selected
    const invalidAssignment = pendingAssignments.find(a => !a.dealership_id);
    if (invalidAssignment) {
      toast({
        title: t('detail_hub.wizard.error_incomplete_assignment'),
        description: t('detail_hub.wizard.error_select_dealer'),
        variant: "destructive"
      });
      return;
    }

    const formData = form.getValues();

    try {
      if (editingEmployee) {
        // Update existing employee
        await updateEmployee({
          id: editingEmployee.id,
          updates: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            department: formData.department,
            hourly_rate: formData.hourly_rate || null,
            hire_date: format(formData.hire_date, "yyyy-MM-dd"),
            status: formData.status,
            pin_code: formData.pin_code,
            preferred_language: formData.preferred_language,
          }
        });

        // Handle assignments in edit mode
        let updatedCount = 0;
        let createdCount = 0;
        let deletedCount = 0;

        // First, delete assignments marked for removal
        for (const assignmentId of assignmentsToDelete) {
          await deleteAssignment(assignmentId);
          deletedCount++;
        }

        // Then, update existing and create new assignments
        for (const assignment of pendingAssignments) {
          if (assignment.isExisting) {
            // Update existing assignment
            await updateAssignment({
              assignmentId: assignment.id,
              updates: {
                schedule_template: assignment.schedule_template,
                notes: assignment.notes || undefined
              }
            });
            updatedCount++;
          } else {
            // Create new assignment for existing employee
            await createAssignment({
              employee_id: editingEmployee.id,
              dealership_id: assignment.dealership_id,
              schedule_template: assignment.schedule_template,
              notes: assignment.notes || undefined
            });
            createdCount++;
          }
        }

        // Toast is handled by useUpdateEmployee hook
      } else {
        // Create new employee
        const newEmployee = await createEmployee({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          department: formData.department,
          hourly_rate: formData.hourly_rate || null,
          hire_date: format(formData.hire_date, "yyyy-MM-dd"),
          status: formData.status,
          pin_code: formData.pin_code,
          preferred_language: formData.preferred_language,
          dealership_id: selectedDealerId || pendingAssignments[0]?.dealership_id || 1
        });

        // Create all pending assignments
        for (const assignment of pendingAssignments) {
          await createAssignment({
            employee_id: newEmployee.id,
            dealership_id: assignment.dealership_id,
            schedule_template: assignment.schedule_template,
            notes: assignment.notes || undefined
          });
        }
        // Toast is handled by useCreateEmployee hook
      }

      // Refresh employee list after save
      queryClient.invalidateQueries({ queryKey: ['detail-hub', 'employees'] });

      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({
        title: t('detail_hub.employees.toast.error'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  }

  const isSubmitting = isCreating || isUpdating || isCreatingAssignment || isUpdatingAssignment || isDeletingAssignment;
  const isEditMode = !!editingEmployee;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isEditMode ? (
              <>
                <User className="h-6 w-6 text-blue-600" />
                {t('detail_hub.employees.edit')}
              </>
            ) : (
              <>
                <User className="h-6 w-6 text-emerald-600" />
                {t('detail_hub.employees.add_employee')}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t('detail_hub.employees.edit_description')
              : t('detail_hub.wizard.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper - shown for both create and edit modes */}
        <div className="flex items-center justify-center gap-4 py-4 border-b shrink-0">
          <StepIndicator
            step={1}
            currentStep={currentStep}
            label={t('detail_hub.wizard.step1_label')}
            icon={<User className="h-4 w-4" />}
          />
          <ChevronRight className="h-5 w-5 text-gray-300" />
          <StepIndicator
            step={2}
            currentStep={currentStep}
            label={t('detail_hub.wizard.step2_label')}
            icon={<Building2 className="h-4 w-4" />}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <Step1EmployeeInfo
              form={form}
              showPIN={showPIN}
              setShowPIN={setShowPIN}
              generatePIN={generatePIN}
              t={t}
            />
          )}

          {currentStep === 2 && (
            <Step2Assignments
              pendingAssignments={pendingAssignments}
              editingAssignmentId={editingAssignmentId}
              setEditingAssignmentId={setEditingAssignmentId}
              dealerships={dealerships || []}
              onAddAssignment={handleAddAssignment}
              onRemoveAssignment={handleRemoveAssignment}
              onUpdateAssignment={handleUpdateAssignment}
              onSelectDealer={handleSelectDealer}
              formatDaysOfWeek={formatDaysOfWeek}
              t={t}
              isEditMode={isEditMode}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t shrink-0 px-6 pb-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>

          <div className="flex items-center gap-2">
            {/* Back button - shown on step 2 */}
            {currentStep === 2 && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('common.back')}
              </Button>
            )}

            {/* Next button - shown on step 1 */}
            {currentStep === 1 && (
              <Button onClick={handleNext}>
                {t('common.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {/* Save/Create button - shown on step 2 */}
            {currentStep === 2 && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isEditMode ? t('common.save') : t('detail_hub.wizard.create_employee')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

function StepIndicator({
  step,
  currentStep,
  label,
  icon
}: {
  step: number;
  currentStep: number;
  label: string;
  icon: React.ReactNode;
}) {
  const isActive = currentStep === step;
  const isComplete = currentStep > step;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
      isActive && "bg-emerald-100 text-emerald-800",
      isComplete && "bg-emerald-50 text-emerald-600",
      !isActive && !isComplete && "bg-gray-100 text-gray-500"
    )}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
        isActive && "bg-emerald-600 text-white",
        isComplete && "bg-emerald-500 text-white",
        !isActive && !isComplete && "bg-gray-300 text-gray-600"
      )}>
        {isComplete ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

interface Step1Props {
  form: ReturnType<typeof useForm<EmployeeFormValues>>;
  showPIN: boolean;
  setShowPIN: (show: boolean) => void;
  generatePIN: () => void;
  t: (key: string) => string;
}

function Step1EmployeeInfo({ form, showPIN, setShowPIN, generatePIN, t }: Step1Props) {
  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              {t('detail_hub.wizard.basic_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        placeholder="john.smith@company.com"
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
              <FormField
                control={form.control}
                name="preferred_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('detail_hub.employees.preferred_language')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="pt-BR">Português</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {t('detail_hub.employees.preferred_language_help')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Role & Department */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600" />
              {t('detail_hub.wizard.role_department')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                          <SelectValue />
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
                          <SelectValue />
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
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : t('detail_hub.timecard.pick_date')}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
                      <SelectTrigger className="w-48">
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
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              {t('detail_hub.wizard.security')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="pin_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    {t('detail_hub.employees.kiosk_pin')}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1 max-w-xs">
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
                          className="pr-10"
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPIN(!showPIN)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
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
                      onClick={generatePIN}
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
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

interface Step2Props {
  pendingAssignments: PendingAssignment[];
  editingAssignmentId: string | null;
  setEditingAssignmentId: (id: string | null) => void;
  dealerships: Array<{ id: number; name: string; logo_url: string | null }>;
  onAddAssignment: () => void;
  onRemoveAssignment: (id: string) => void;
  onUpdateAssignment: (id: string, updates: Partial<PendingAssignment>) => void;
  onSelectDealer: (assignmentId: string, dealerId: number) => void;
  formatDaysOfWeek: (days: number[] | undefined) => string;
  t: (key: string) => string;
  isEditMode?: boolean;
}

function Step2Assignments({
  pendingAssignments,
  editingAssignmentId,
  setEditingAssignmentId,
  dealerships,
  onAddAssignment,
  onRemoveAssignment,
  onUpdateAssignment,
  onSelectDealer,
  formatDaysOfWeek,
  t,
  isEditMode
}: Step2Props) {
  // Get dealers not already assigned
  const assignedDealerIds = pendingAssignments.map(a => a.dealership_id);
  const availableDealers = dealerships.filter(d => !assignedDealerIds.includes(d.id));

  return (
    <div className="space-y-6">
      {/* Required Assignment Alert - Only show destructive in create mode */}
      {pendingAssignments.length === 0 && !isEditMode && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('detail_hub.wizard.error_no_assignments_description')}
          </AlertDescription>
        </Alert>
      )}
      {/* Info alert in edit mode when no assignments */}
      {pendingAssignments.length === 0 && isEditMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('detail_hub.wizard.no_active_assignments')}
          </AlertDescription>
        </Alert>
      )}

      {/* Assignment List */}
      <div className="space-y-4">
        {pendingAssignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            isEditing={editingAssignmentId === assignment.id}
            onEdit={() => setEditingAssignmentId(assignment.id)}
            onClose={() => setEditingAssignmentId(null)}
            onRemove={() => onRemoveAssignment(assignment.id)}
            onUpdate={(updates) => onUpdateAssignment(assignment.id, updates)}
            onSelectDealer={(dealerId) => onSelectDealer(assignment.id, dealerId)}
            availableDealers={availableDealers}
            allDealerships={dealerships}
            formatDaysOfWeek={formatDaysOfWeek}
            t={t}
          />
        ))}
      </div>

      {/* Add Assignment Button */}
      {availableDealers.length > 0 && (
        <Button
          variant="outline"
          className="w-full border-dashed border-2"
          onClick={onAddAssignment}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('detail_hub.wizard.add_another_assignment')}
        </Button>
      )}

      {availableDealers.length === 0 && pendingAssignments.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          {t('detail_hub.wizard.all_dealers_assigned')}
        </p>
      )}
    </div>
  );
}

interface AssignmentCardProps {
  assignment: PendingAssignment;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<PendingAssignment>) => void;
  onSelectDealer: (dealerId: number) => void;
  availableDealers: Array<{ id: number; name: string; logo_url: string | null }>;
  allDealerships: Array<{ id: number; name: string; logo_url: string | null }>;
  formatDaysOfWeek: (days: number[] | undefined) => string;
  t: (key: string) => string;
}

function AssignmentCard({
  assignment,
  isEditing,
  onEdit,
  onClose,
  onRemove,
  onUpdate,
  onSelectDealer,
  availableDealers,
  allDealerships,
  formatDaysOfWeek,
  t
}: AssignmentCardProps) {
  const schedule = assignment.schedule_template;
  const [showPreview, setShowPreview] = useState(false);

  if (isEditing) {
    return (
      <Card className="border-2 border-emerald-300 bg-emerald-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              {t('detail_hub.wizard.configure_assignment')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <Check className="h-4 w-4" />
              </Button>
              {/* Show delete button - for existing assignments, it will mark for deletion */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
                title={assignment.isExisting ? t('detail_hub.wizard.mark_for_deletion') : t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show selected dealer name OR dealer selection dropdown */}
          {assignment.dealership_id ? (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-200">
              {assignment.dealership_logo ? (
                <img
                  src={assignment.dealership_logo}
                  alt=""
                  className="h-8 w-8 object-contain rounded"
                />
              ) : (
                <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{assignment.dealership_name}</p>
                <p className="text-xs text-gray-500">{t('detail_hub.wizard.dealership_assigned')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t('detail_hub.wizard.select_dealership')}</Label>
              <Select onValueChange={(val) => onSelectDealer(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('detail_hub.wizard.select_dealership_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableDealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id.toString()}>
                      <div className="flex items-center gap-2">
                        {dealer.logo_url && (
                          <img src={dealer.logo_url} alt="" className="h-4 w-4 object-contain" />
                        )}
                        {dealer.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shift Times & Punch Windows Card */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                {t('detail_hub.wizard.shift_hours_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Shift Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t('detail_hub.wizard.shift_start')}</Label>
                  <Input
                    type="time"
                    value={schedule.shift_start_time || '08:00'}
                    onChange={(e) => onUpdate({
                      schedule_template: { ...schedule, shift_start_time: e.target.value }
                    })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('detail_hub.wizard.shift_end')}</Label>
                  <Input
                    type="time"
                    value={schedule.shift_end_time || '18:00'}
                    onChange={(e) => onUpdate({
                      schedule_template: { ...schedule, shift_end_time: e.target.value }
                    })}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Punch Windows */}
              <div className="pt-3 border-t border-blue-100">
                <h4 className="text-xs font-medium text-gray-700 mb-3">{t('detail_hub.wizard.punch_windows_title')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('detail_hub.wizard.early_punch')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      placeholder={t('detail_hub.wizard.no_limit')}
                      value={schedule.early_punch_allowed_minutes ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        onUpdate({
                          schedule_template: {
                            ...schedule,
                            early_punch_allowed_minutes: value !== undefined && isNaN(value) ? undefined : value
                          }
                        });
                      }}
                      className="bg-white"
                    />
                    <p className="text-[10px] text-gray-500">{t('detail_hub.wizard.early_punch_help')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('detail_hub.wizard.late_punch')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      placeholder={t('detail_hub.wizard.no_limit')}
                      value={schedule.late_punch_grace_minutes ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        onUpdate({
                          schedule_template: {
                            ...schedule,
                            late_punch_grace_minutes: value !== undefined && isNaN(value) ? undefined : value
                          }
                        });
                      }}
                      className="bg-white"
                    />
                    <p className="text-[10px] text-gray-500">{t('detail_hub.wizard.late_punch_help')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Days */}
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                {t('detail_hub.wizard.work_days')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { value: 0, label: 'Sun', fullName: 'Sunday' },
                    { value: 1, label: 'Mon', fullName: 'Monday' },
                    { value: 2, label: 'Tue', fullName: 'Tuesday' },
                    { value: 3, label: 'Wed', fullName: 'Wednesday' },
                    { value: 4, label: 'Thu', fullName: 'Thursday' },
                    { value: 5, label: 'Fri', fullName: 'Friday' },
                    { value: 6, label: 'Sat', fullName: 'Saturday' },
                  ].map((day) => {
                    const isSelected = (schedule.days_of_week || []).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        title={day.fullName}
                        onClick={() => {
                          const current = schedule.days_of_week || [];
                          const updated = isSelected
                            ? current.filter((d) => d !== day.value)
                            : [...current, day.value].sort();
                          onUpdate({
                            schedule_template: { ...schedule, days_of_week: updated }
                          });
                        }}
                        className={cn(
                          "h-10 w-full rounded-lg border-2 text-sm font-semibold transition-all",
                          isSelected
                            ? "bg-emerald-500 border-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                            : "bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 text-center">
                  {t('detail_hub.wizard.days_selected', { count: (schedule.days_of_week || []).length })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Break Configuration */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-600" />
                {t('detail_hub.wizard.break_config_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-sm">{t('detail_hub.wizard.break_duration')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={schedule.required_break_minutes ?? 30}
                    onChange={(e) => onUpdate({
                      schedule_template: { ...schedule, required_break_minutes: parseInt(e.target.value) || 0 }
                    })}
                    className="bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={schedule.break_is_paid ?? false}
                    onCheckedChange={(checked) => onUpdate({
                      schedule_template: { ...schedule, break_is_paid: checked }
                    })}
                  />
                  <Label className="text-sm">{t('detail_hub.wizard.break_is_paid')}</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {t('detail_hub.wizard.security_settings_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {t('detail_hub.wizard.require_face_validation')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('detail_hub.wizard.require_face_validation_help')}
                  </p>
                </div>
                <Switch
                  checked={schedule.require_face_validation ?? false}
                  onCheckedChange={(checked) => onUpdate({
                    schedule_template: { ...schedule, require_face_validation: checked }
                  })}
                />
              </div>
              {schedule.require_face_validation && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{t('detail_hub.wizard.face_validation_warning')}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Close */}
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                {t('detail_hub.employees.auto_close_section_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {t('detail_hub.employees.auto_close_enabled')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('detail_hub.employees.auto_close_enabled_help')}
                  </p>
                </div>
                <Switch
                  checked={schedule.auto_close_enabled ?? false}
                  onCheckedChange={(checked) => onUpdate({
                    schedule_template: { ...schedule, auto_close_enabled: checked }
                  })}
                />
              </div>

            {schedule.auto_close_enabled && (
              <div className="space-y-3 pt-2 border-t border-indigo-100">
                <h4 className="text-xs font-medium text-gray-700">{t('detail_hub.employees.auto_close_timing')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('detail_hub.wizard.reminder')}</Label>
                    <Input
                      type="number"
                      min="5"
                      max="180"
                      value={schedule.auto_close_first_reminder ?? 30}
                      onChange={(e) => onUpdate({
                        schedule_template: { ...schedule, auto_close_first_reminder: parseInt(e.target.value) || 30 }
                      })}
                      className="bg-white"
                    />
                    <p className="text-[10px] text-gray-500">{t('detail_hub.wizard.reminder_help')}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('detail_hub.wizard.auto_close')}</Label>
                    <Input
                      type="number"
                      min="30"
                      max="480"
                      value={schedule.auto_close_window_minutes ?? 60}
                      onChange={(e) => onUpdate({
                        schedule_template: { ...schedule, auto_close_window_minutes: parseInt(e.target.value) || 60 }
                      })}
                      className="bg-white"
                    />
                    <p className="text-[10px] text-gray-500">{t('detail_hub.wizard.auto_close_help')}</p>
                  </div>
                </div>

                {/* Preview Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t('detail_hub.employees.preview_reminder')}
                </Button>

                {/* Preview Dialog */}
                <ReminderPreviewDialog
                  open={showPreview}
                  onClose={() => setShowPreview(false)}
                  shiftEndTime={schedule.shift_end_time || '18:00'}
                  reminderMinutes={schedule.auto_close_first_reminder ?? 30}
                  autoCloseMinutes={schedule.auto_close_window_minutes ?? 60}
                />
              </div>
            )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-gray-200 bg-gray-50/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">{t('detail_hub.wizard.notes_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t('detail_hub.wizard.notes_placeholder')}
                value={assignment.notes || ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                rows={2}
                className="bg-white resize-none"
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  }

  // Collapsed view
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        !assignment.dealership_id && "border-red-300 bg-red-50/30",
        assignment.isExisting && "border-l-4 border-l-emerald-500"
      )}
      onClick={onEdit}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {assignment.dealership_logo ? (
              <img
                src={assignment.dealership_logo}
                alt=""
                className="h-10 w-10 object-contain rounded"
              />
            ) : (
              <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">
                  {assignment.dealership_name || t('detail_hub.wizard.select_dealership_placeholder')}
                </p>
                {/* Status badge for existing vs new */}
                {assignment.isExisting ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300">
                    {t('detail_hub.wizard.existing_assignment')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-300">
                    {t('detail_hub.wizard.new_assignment')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {schedule.shift_start_time} - {schedule.shift_end_time}
                </span>
                <span>{formatDaysOfWeek(schedule.days_of_week)}</span>
                {schedule.auto_close_enabled && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-700">
                    <Bell className="h-2.5 w-2.5 mr-0.5" />
                    Auto-Close
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Delete button - for existing assignments, shows warning color */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={assignment.isExisting
              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              : "text-red-600 hover:text-red-700 hover:bg-red-50"
            }
            title={assignment.isExisting ? t('detail_hub.wizard.mark_for_deletion') : t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
