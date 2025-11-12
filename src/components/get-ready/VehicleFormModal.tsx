import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VinInputWithScanner } from "@/components/ui/vin-input-with-scanner";
import { useToast } from "@/hooks/use-toast";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { useGetReady } from "@/hooks/useGetReady";
import { useVehicleManagement } from "@/hooks/useVehicleManagement.tsx";
import { useVinDecoding } from "@/hooks/useVinDecoding";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface VehicleFormData {
  stock_number: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  step_id: string;
  priority: "low" | "normal" | "medium" | "high" | "urgent";
  assigned_to: string;
  notes: string;
}

interface VehicleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string | null;
  onSuccess?: () => void;
  initialData?: Partial<VehicleFormData>;
}

const initialFormData: VehicleFormData = {
  stock_number: "",
  vin: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  step_id: "inspection",

  priority: "normal",
  assigned_to: "",
  notes: "",
};

export function VehicleFormModal({
  open,
  onOpenChange,
  vehicleId,
  onSuccess,
  initialData,
}: VehicleFormModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { steps } = useGetReady();
  const { currentDealership, dealerships } = useAccessibleDealerships();
  const { createVehicleAsync, updateVehicleAsync, isCreating, isUpdating } =
    useVehicleManagement();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof VehicleFormData, string>>
  >({});
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [duplicateVinWarning, setDuplicateVinWarning] = useState<{
    show: boolean;
    existingVehicles: Array<{
      stock_number: string;
      vehicle_year: number;
      vehicle_make: string;
      vehicle_model: string;
      status: string;
      get_ready_steps?: {
        name: string;
        color: string;
      };
    }>;
  }>({ show: false, existingVehicles: [] });

  const isEditMode = !!vehicleId;
  const loading = isCreating || isUpdating;

  // Pre-fill form when initialData is provided (e.g., from Stock page)
  useEffect(() => {
    if (initialData && open && !vehicleId) {
      setFormData(prev => ({
        ...prev,
        stock_number: initialData.stock_number?.toUpperCase() || '',
        vin: initialData.vin?.toUpperCase() || '',
        year: initialData.year?.toString() || '',
        make: initialData.make?.toUpperCase() || '',
        model: initialData.model?.toUpperCase() || '',
      }));
    }
  }, [initialData, open, vehicleId]);

  // Load vehicle data when in edit mode
  useEffect(() => {
    const loadVehicleData = async () => {
      if (!vehicleId || !open) return;

      setLoadingVehicle(true);
      try {
        const { data: vehicle, error } = await supabase
          .from("get_ready_vehicles")
          .select("*")
          .eq("id", vehicleId)
          .single();

        if (error) throw error;

        if (vehicle) {
          setFormData({
            stock_number: vehicle.stock_number || "",
            vin: vehicle.vin || "",
            year: vehicle.vehicle_year?.toString() || "",
            make: vehicle.vehicle_make || "",
            model: vehicle.vehicle_model || "",
            trim: vehicle.vehicle_trim || "",
            step_id: vehicle.step_id || "inspection",

            priority: vehicle.priority || "normal",
            assigned_to: vehicle.assigned_to || "",
            notes: vehicle.notes || "",
          });
        }
      } catch (error) {
        console.error("Error loading vehicle data:", error);
        toast({
          description: t("get_ready.vehicle_form.errors.save_failed"),
          variant: "destructive",
        });
      } finally {
        setLoadingVehicle(false);
      }
    };

    loadVehicleData();
  }, [vehicleId, open, toast, t]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setErrors({});
      setVinDecoded(false);
      setDuplicateVinWarning({ show: false, existingVehicles: [] });
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleFormData, string>> = {};

    if (!formData.stock_number.trim()) {
      newErrors.stock_number = t(
        "get_ready.vehicle_form.errors.stock_required",
      );
    }

    if (!formData.vin.trim()) {
      newErrors.vin = t("get_ready.vehicle_form.errors.vin_required");
    }
    // Removed length validation - allow any VIN format
    // Duplicate VIN will be caught by database constraint

    const yearNum = parseInt(formData.year);
    if (!formData.year.trim()) {
      newErrors.year = t("get_ready.vehicle_form.errors.year_required");
    } else if (
      isNaN(yearNum) ||
      yearNum < 1900 ||
      yearNum > new Date().getFullYear() + 1
    ) {
      newErrors.year = t("get_ready.vehicle_form.errors.year_invalid");
    }

    if (!formData.make.trim()) {
      newErrors.make = t("get_ready.vehicle_form.errors.make_required");
    }

    if (!formData.model.trim()) {
      newErrors.model = t("get_ready.vehicle_form.errors.model_required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, forceCreate = false) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!currentDealership?.id) {
      toast({
        description: "No dealership selected",
        variant: "destructive",
      });
      return;
    }

    // Clean and normalize input data
    const cleanStockNumber = formData.stock_number.trim().toUpperCase().replace(/\s+/g, '');
    const cleanVin = formData.vin.trim().toUpperCase().replace(/\s+/g, '');

    // Check for duplicate VIN before creating (only for new vehicles, not edits)
    if (!isEditMode && !forceCreate && cleanVin) {
      try {
        const { data: existingVehicles, error: checkError } = await supabase
          .from('get_ready_vehicles')
          .select(`
            stock_number,
            vehicle_year,
            vehicle_make,
            vehicle_model,
            status,
            get_ready_steps!get_ready_vehicles_step_id_fkey (
              name,
              color
            )
          `)
          .eq('dealer_id', currentDealership.id)
          .eq('vin', cleanVin)
          .is('deleted_at', null);

        if (checkError) {
          console.error('Error checking for duplicate VIN:', checkError);
        }

        if (existingVehicles && existingVehicles.length > 0) {
          // VIN already exists - show warning
          setDuplicateVinWarning({
            show: true,
            existingVehicles: existingVehicles
          });
          return; // Stop here and wait for user confirmation
        }
      } catch (error) {
        console.error('Error checking duplicate VIN:', error);
      }
    }

    try {
      const vehicleData = {
        stock_number: cleanStockNumber,
        vin: cleanVin,
        vehicle_year: parseInt(formData.year),
        vehicle_make: formData.make.trim().toUpperCase(),
        vehicle_model: formData.model.trim().toUpperCase(),
        vehicle_trim: formData.trim.trim().toUpperCase() || undefined,
        step_id: formData.step_id,

        priority: formData.priority,
        assigned_to: formData.assigned_to.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditMode && vehicleId) {
        // Use async version to properly handle errors
        await updateVehicleAsync({ id: vehicleId, ...vehicleData });
      } else {
        // Use async version to properly handle errors
        await createVehicleAsync(vehicleData);
      }

      // Only close modal and trigger success callback after mutation completes
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      // Error toast is handled by mutation's onError callback
      // Don't show additional toast here - let the mutation handle it
      // The mutation's onError will show the detailed error message
    }
  };

  const updateFormData = (field: keyof VehicleFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleVinChange = async (vin: string) => {
    updateFormData("vin", vin.toUpperCase());

    if (vin.length === 17 && !vinDecoded) {
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        setFormData((prev) => ({
          ...prev,
          year: vehicleData.year?.toString() || "",
          make: vehicleData.make || "",
          model: vehicleData.model || "",
          trim: vehicleData.trim || "",
        }));
        setVinDecoded(true);

        // Clear errors for auto-populated fields
        setErrors((prev) => ({
          ...prev,
          year: undefined,
          make: undefined,
          model: undefined,
        }));

        toast({
          description: t("get_ready.vehicle_form.vin_decoded"),
          variant: "default",
        });
      }
    } else if (vin.length < 17) {
      setVinDecoded(false);
    }
  };

  return (
    <>
      {/* Duplicate VIN Warning Dialog */}
      <AlertDialog open={duplicateVinWarning.show} onOpenChange={(open) => {
        if (!open) {
          setDuplicateVinWarning({ show: false, existingVehicles: [] });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("get_ready.duplicate_vin.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>{t("get_ready.duplicate_vin.description")}</p>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold text-sm text-foreground">
                  {t("get_ready.duplicate_vin.existing_vehicles")}:
                </p>
                {duplicateVinWarning.existingVehicles.map((vehicle, index) => (
                  <div key={index} className="text-xs bg-background p-2 rounded border">
                    <div className="font-mono font-semibold text-foreground">
                      {vehicle.stock_number}
                    </div>
                    <div className="text-muted-foreground">
                      {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                    </div>
                    {vehicle.get_ready_steps && (
                      <Badge
                        className="mt-1"
                        style={{
                          backgroundColor: vehicle.get_ready_steps.color,
                          color: '#fff'
                        }}
                      >
                        {vehicle.get_ready_steps.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-sm font-medium text-foreground">
                {t("get_ready.duplicate_vin.confirmation")}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.action_buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                setDuplicateVinWarning({ show: false, existingVehicles: [] });
                handleSubmit(e as any, true); // Force create
              }}
            >
              {t("get_ready.duplicate_vin.confirm_add")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Vehicle Form Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          preventOutsideClick={true}
          className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none border-0 overflow-hidden sm:max-w-2xl sm:h-auto sm:max-h-[98vh] sm:rounded-lg sm:border sm:mx-4">
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-4 border-b border-border sm:rounded-t-lg">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {isEditMode
              ? t("get_ready.vehicle_form.title.edit")
              : t("get_ready.vehicle_form.title.add")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {t("get_ready.vehicle_form.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 sm:px-10 max-h-[calc(100vh-140px)] sm:max-h-[calc(98vh-120px)]">
          {loadingVehicle ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t("common.loading")}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="py-6 space-y-6">
              {/* Dealership Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="dealership">
                    {t("sales_orders.dealership")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {t("dealerships.auto_selected")}
                  </Badge>
                </div>
                <Select
                  value={currentDealership?.id?.toString() || ""}
                  disabled={true}
                >
                  <SelectTrigger className="border-input bg-muted">
                    <SelectValue placeholder={t("sales_orders.select_dealership")} />
                  </SelectTrigger>
                  <SelectContent>
                    {dealerships.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id.toString()}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Number & VIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="stock_number">
                    {t("get_ready.vehicle_form.fields.stock_number")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="stock_number"
                    value={formData.stock_number}
                    onChange={(e) =>
                      updateFormData("stock_number", e.target.value.toUpperCase())
                    }
                    placeholder="B35678A"
                    className={errors.stock_number ? "border-red-500" : ""}
                  />
                  {formData.stock_number && formData.stock_number.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Will be saved as: <span className="font-mono font-semibold">{formData.stock_number.trim().toUpperCase().replace(/\s+/g, '')}</span>
                    </p>
                  )}
                  {errors.stock_number && (
                    <p className="text-xs text-red-500">
                      {errors.stock_number}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vin">
                      {t("get_ready.vehicle_form.fields.vin")}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    {vinDecoded && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <Zap className="h-3 w-3" />
                        <span>{t("get_ready.vehicle_form.vin_decoded")}</span>
                      </div>
                    )}
                  </div>
                  <VinInputWithScanner
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => handleVinChange(e.target.value)}
                    onVinScanned={handleVinChange}
                    placeholder="Enter VIN (any length accepted)"
                    className={errors.vin ? "border-red-500" : ""}
                    disabled={vinLoading}
                  />
                  {formData.vin && formData.vin.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Will be saved as: <span className="font-mono font-semibold">{formData.vin.trim().toUpperCase().replace(/\s+/g, '')}</span>
                      {formData.vin.length === 17 && ' (Auto-decode available)'}
                    </p>
                  )}
                  {errors.vin && (
                    <p className="text-xs text-red-500">{errors.vin}</p>
                  )}
                  {vinLoading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("get_ready.vehicle_form.decoding_vin")}
                    </p>
                  )}
                </div>
              </div>

              {/* Year, Make, Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="year">
                    {t("get_ready.vehicle_form.fields.year")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => updateFormData("year", e.target.value)}
                    placeholder="2024"
                    className={errors.year ? "border-red-500" : ""}
                  />
                  {errors.year && (
                    <p className="text-xs text-red-500">{errors.year}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="make">
                    {t("get_ready.vehicle_form.fields.make")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => updateFormData("make", e.target.value.toUpperCase())}
                    placeholder="HONDA"
                    className={errors.make ? "border-red-500" : ""}
                  />
                  {errors.make && (
                    <p className="text-xs text-red-500">{errors.make}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">
                    {t("get_ready.vehicle_form.fields.model")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => updateFormData("model", e.target.value.toUpperCase())}
                    placeholder="CIVIC"
                    className={errors.model ? "border-red-500" : ""}
                  />
                  {errors.model && (
                    <p className="text-xs text-red-500">{errors.model}</p>
                  )}
                </div>
              </div>

              {/* Trim */}
              <div className="space-y-1.5">
                <Label htmlFor="trim">
                  {t("get_ready.vehicle_form.fields.trim")}
                </Label>
                <Input
                  id="trim"
                  value={formData.trim}
                  onChange={(e) => updateFormData("trim", e.target.value.toUpperCase())}
                  placeholder="LX"
                />
              </div>

              {/* Step & Workflow Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="step_id">
                    {t("get_ready.vehicle_form.fields.step")}
                  </Label>
                  <Select
                    value={formData.step_id}
                    onValueChange={(value) => updateFormData("step_id", value)}
                  >
                    <SelectTrigger id="step_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {steps
                        .filter((step) => step.id !== "all")
                        .map((step) => (
                          <SelectItem key={step.id} value={step.id}>
                            {step.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority & Assigned To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">
                    {t("get_ready.vehicle_form.fields.priority")}
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      updateFormData("priority", value as "low" | "normal" | "medium" | "high" | "urgent")
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        {t("common.priority.low")}
                      </SelectItem>
                      <SelectItem value="normal">
                        {t("common.priority.normal")}
                      </SelectItem>
                      <SelectItem value="medium">
                        {t("common.priority.medium")}
                      </SelectItem>
                      <SelectItem value="high">
                        {t("common.priority.high")}
                      </SelectItem>
                      <SelectItem value="urgent">
                        {t("common.priority.urgent")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">
                    {t("get_ready.vehicle_form.fields.assigned_to")}
                  </Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to}
                    onChange={(e) =>
                      updateFormData("assigned_to", e.target.value)
                    }
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">
                  {t("get_ready.vehicle_form.fields.notes")}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateFormData("notes", e.target.value)}
                  placeholder={t("get_ready.vehicle_form.placeholders.notes")}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Action Buttons - Sticky on mobile for better accessibility */}
              <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-2 sm:py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="order-2 sm:order-1 w-full sm:w-auto min-h-[44px]"
                >
                  {t("common.action_buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="order-1 sm:order-2 w-full sm:w-auto min-h-[44px]"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode
                    ? t("common.action_buttons.update")
                    : t("common.action_buttons.create")}
                </Button>
              </div>
            </form>
          )}
        </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
