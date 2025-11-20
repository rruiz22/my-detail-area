/**
 * KioskSetupWizard - First-Run Kiosk Configuration Modal
 *
 * Appears when a PC has not been configured as a kiosk yet.
 * Allows administrators to link this device to an existing kiosk configuration.
 *
 * Features:
 * - Displays device fingerprint (browser-based unique ID)
 * - Shows detected username (OS username or browser identifier)
 * - Dropdown to select from available kiosks
 * - Saves configuration to localStorage (persists across sessions)
 * - Skip option for non-kiosk PCs
 *
 * Storage:
 * - localStorage: 'kiosk_id' - Selected kiosk UUID
 * - localStorage: 'kiosk_device_fingerprint' - Device fingerprint
 * - localStorage: 'kiosk_configured_at' - ISO timestamp
 *
 * Usage:
 * ```tsx
 * const [showWizard, setShowWizard] = useState(!isKioskConfigured());
 *
 * <KioskSetupWizard
 *   open={showWizard}
 *   onClose={() => setShowWizard(false)}
 *   fingerprint={deviceFingerprint}
 *   username={detectedUsername}
 *   onConfigured={(kioskId) => {
 *     // Kiosk configured successfully
 *     refetchKioskData();
 *   }}
 * />
 * ```
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Monitor, User, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDetailHubKiosks } from "@/hooks/useDetailHubKiosks";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

export interface KioskSetupWizardProps {
  /** Controls modal visibility */
  open: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Device fingerprint (first 12 chars displayed) */
  fingerprint: string;
  /** Detected username from OS or browser */
  username: string;
  /** Callback after successful configuration */
  onConfigured: (kioskId: string) => void;
}

export function KioskSetupWizard({
  open,
  onClose,
  fingerprint,
  username,
  onConfigured,
}: KioskSetupWizardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  // State
  const [selectedKioskId, setSelectedKioskId] = useState<string>("");
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Fetch available kiosks
  const { data: kiosks = [], isLoading: loadingKiosks } = useDetailHubKiosks();

  // Filter kiosks for selected dealership (if not 'all')
  const availableKiosks =
    selectedDealerId === "all"
      ? kiosks
      : kiosks.filter((k) => k.dealership_id === selectedDealerId);

  // Handle configuration
  const handleConfigure = async () => {
    if (!selectedKioskId) {
      toast({
        title: t("detail_hub.kiosk_setup.error_title"),
        description: t("detail_hub.kiosk_setup.error_no_kiosk"),
        variant: "destructive",
      });
      return;
    }

    setIsConfiguring(true);

    try {
      // Find selected kiosk
      const selectedKiosk = availableKiosks.find(
        (k) => k.id === selectedKioskId
      );

      if (!selectedKiosk) {
        throw new Error("Selected kiosk not found");
      }

      // Save to localStorage (persists across browser sessions)
      localStorage.setItem("kiosk_id", selectedKioskId);
      localStorage.setItem("kiosk_device_fingerprint", fingerprint);
      localStorage.setItem("kiosk_configured_at", new Date().toISOString());
      localStorage.setItem("kiosk_username", username);

      // Success toast
      toast({
        title: t("detail_hub.kiosk_setup.success_title"),
        description: t("detail_hub.kiosk_setup.success_message", {
          kioskName: selectedKiosk.name,
        }),
      });

      // Call success callback
      onConfigured(selectedKioskId);

      // Close modal
      onClose();
    } catch (error) {
      console.error("[KioskSetup] Configuration failed:", error);
      toast({
        title: t("detail_hub.kiosk_setup.error_title"),
        description: t("detail_hub.kiosk_setup.error_message"),
        variant: "destructive",
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  // Handle skip (just close modal)
  const handleSkip = () => {
    onClose();
  };

  // Display fingerprint (first 12 chars for readability)
  const displayFingerprint = fingerprint.substring(0, 12).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t("detail_hub.kiosk_setup.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {t("detail_hub.kiosk_setup.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Device Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">
              {t("detail_hub.kiosk_setup.device_info")}
            </h3>

            <div className="space-y-2">
              {/* Device Fingerprint */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {t("detail_hub.kiosk_setup.device_fingerprint")}
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {displayFingerprint}
                </Badge>
              </div>

              {/* Username */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {t("detail_hub.kiosk_setup.username")}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {username}
                </Badge>
              </div>
            </div>
          </div>

          {/* Kiosk Selection */}
          <div className="space-y-3">
            <label
              htmlFor="kiosk-select"
              className="text-sm font-medium text-gray-900"
            >
              {t("detail_hub.kiosk_setup.select_kiosk")}
            </label>

            {loadingKiosks ? (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-600">
                  {t("common.loading")}
                </span>
              </div>
            ) : availableKiosks.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t("detail_hub.kiosk_setup.no_kiosks_message")}
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedKioskId}
                onValueChange={setSelectedKioskId}
              >
                <SelectTrigger id="kiosk-select" className="w-full">
                  <SelectValue
                    placeholder={t(
                      "detail_hub.kiosk_setup.select_kiosk_placeholder"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableKiosks.map((kiosk) => (
                    <SelectItem key={kiosk.id} value={kiosk.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{kiosk.name}</span>
                        <Badge
                          variant={
                            kiosk.status === "online" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {kiosk.kiosk_code}
                        </Badge>
                        {kiosk.location && (
                          <span className="text-xs text-gray-500">
                            • {kiosk.location}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Info Message */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t("detail_hub.kiosk_setup.info_message")}
            </AlertDescription>
          </Alert>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isConfiguring}
            className="w-full"
          >
            {t("detail_hub.kiosk_setup.skip_button")}
          </Button>
          <Button
            onClick={handleConfigure}
            disabled={
              !selectedKioskId ||
              isConfiguring ||
              availableKiosks.length === 0
            }
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isConfiguring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("detail_hub.kiosk_setup.configuring")}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("detail_hub.kiosk_setup.configure_button")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Utility: Check if kiosk is configured
 */
export function isKioskConfigured(): boolean {
  const kioskId = localStorage.getItem("kiosk_id");
  return !!kioskId;
}

/**
 * Utility: Get configured kiosk ID
 */
export function getConfiguredKioskId(): string | null {
  return localStorage.getItem("kiosk_id");
}

/**
 * Utility: Clear kiosk configuration
 */
export function clearKioskConfiguration(): void {
  localStorage.removeItem("kiosk_id");
  localStorage.removeItem("kiosk_device_fingerprint");
  localStorage.removeItem("kiosk_configured_at");
  localStorage.removeItem("kiosk_username");
}

/**
 * Utility: Get device fingerprint (browser-based unique ID)
 * Uses a combination of user agent, screen resolution, and timezone
 */
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Collect browser characteristics
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    ctx ? ctx.getContextAttributes()?.alpha : "",
  ].join("###");

  // Simple hash function (not cryptographic, just for fingerprinting)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex string
  return Math.abs(hash).toString(16).padStart(12, "0");
}

/**
 * Utility: Get system username (best effort)
 * Note: Browser security prevents direct OS username access
 * This returns a friendly identifier instead
 */
export function getSystemUsername(): string {
  // Try to get from localStorage (if set by admin)
  const storedUsername = localStorage.getItem("kiosk_username");
  if (storedUsername) return storedUsername;

  // Fallback: Use platform info
  const platform = navigator.platform || "Unknown";
  const vendor = navigator.vendor || "Browser";

  return `${vendor} on ${platform}`;
}
