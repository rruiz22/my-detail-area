/**
 * RemoteKioskTokenStats Component
 *
 * Displays remote kiosk token statistics in a clean grid layout
 * Shows: Active tokens, Used today, Expiring soon, Total revoked
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Activity, AlertTriangle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTokenStatistics } from "@/hooks/useRemoteKioskTokens";
import { Loader2 } from "lucide-react";

export function RemoteKioskTokenStats() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useTokenStatistics();

  if (isLoading) {
    return (
      <Card className="card-enhanced">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-enhanced">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('remote_kiosk_management.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Active Tokens */}
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-emerald-700 text-xs mb-1">
              <CheckCircle className="w-3 h-3" />
              <span>{t('remote_kiosk_management.stats.total_active')}</span>
            </div>
            <div className="text-xl font-bold text-emerald-800">
              {stats?.total_active || 0}
            </div>
          </div>

          {/* Used Today */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-blue-700 text-xs mb-1">
              <Activity className="w-3 h-3" />
              <span>{t('remote_kiosk_management.stats.used_today')}</span>
            </div>
            <div className="text-xl font-bold text-blue-800">
              {stats?.used_today || 0}
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-amber-700 text-xs mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{t('remote_kiosk_management.stats.expiring_soon')}</span>
            </div>
            <div className="text-xl font-bold text-amber-800">
              {stats?.expiring_soon || 0}
            </div>
          </div>

          {/* Total Revoked */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
              <XCircle className="w-3 h-3" />
              <span>{t('remote_kiosk_management.stats.total_revoked')}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {stats?.total_revoked || 0}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
