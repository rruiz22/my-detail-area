/**
 * RemoteKioskTokenDetailModal
 *
 * Displays comprehensive information about a remote kiosk token including:
 * - Employee information
 * - Token details (short code, expiration, usage)
 * - Creator information
 * - Revocation information (if applicable)
 * - Quick actions (Copy URL, Revoke, Delete)
 */

import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Link2,
  Calendar,
  Clock,
  Activity,
  Copy,
  XCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Smartphone
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { RemoteKioskToken } from "@/hooks/useRemoteKioskTokens";
import { getGoogleMapsUrl } from "@/utils/geolocation";

interface RemoteKioskTokenDetailModalProps {
  token: RemoteKioskToken | null;
  open: boolean;
  onClose: () => void;
  onRevoke?: (token: RemoteKioskToken) => void;
  onDelete?: (token: RemoteKioskToken) => void;
  onCopyUrl?: (token: RemoteKioskToken) => void;
}

export function RemoteKioskTokenDetailModal({
  token,
  open,
  onClose,
  onRevoke,
  onDelete,
  onCopyUrl
}: RemoteKioskTokenDetailModalProps) {
  const { t } = useTranslation();

  if (!token) return null;

  const isExpired = new Date(token.expires_at) < new Date();
  const isActive = token.status === 'active' && !isExpired;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="token-detail-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            {t('remote_kiosk_management.detail_modal.title')}
          </DialogTitle>
        </DialogHeader>
        <p id="token-detail-description" className="sr-only">
          {t('remote_kiosk_management.detail_modal.title')}
        </p>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {token.status === 'active' && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('remote_kiosk_management.status.active')}
              </Badge>
            )}
            {token.status === 'expired' && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                <Clock className="w-3 h-3 mr-1" />
                {t('remote_kiosk_management.status.expired')}
              </Badge>
            )}
            {token.status === 'revoked' && (
              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="w-3 h-3 mr-1" />
                {t('remote_kiosk_management.status.revoked')}
              </Badge>
            )}
            {token.status === 'used' && (
              <Badge variant="outline">
                {t('remote_kiosk_management.status.used')}
              </Badge>
            )}
          </div>

          {/* Employee Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                {t('remote_kiosk_management.detail_modal.employee_info')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {token.employee?.fallback_photo_url ? (
                    <AvatarImage src={token.employee.fallback_photo_url} />
                  ) : (
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="font-semibold text-gray-900">
                    {token.employee?.first_name} {token.employee?.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    #{token.employee?.employee_number} • {token.employee?.department}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                {t('remote_kiosk_management.detail_modal.token_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {t('remote_kiosk_management.detail_modal.short_code')}
                  </div>
                  <div className="font-mono font-medium">{token.short_code}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {t('remote_kiosk_management.detail_modal.max_uses')}
                  </div>
                  <div className="font-medium">
                    {token.current_uses} / {token.max_uses}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {t('remote_kiosk_management.detail_modal.full_url')}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 px-2 py-1 rounded border text-gray-700 break-all">
                    {token.full_url}
                  </code>
                  {onCopyUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopyUrl(token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {t('remote_kiosk_management.detail_modal.created_at')}
                  </div>
                  <div className="text-sm">{format(new Date(token.created_at), 'MMM d, yyyy HH:mm')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {t('remote_kiosk_management.detail_modal.expires_at')}
                  </div>
                  <div className={`text-sm ${isExpired ? 'text-red-600 font-medium' : ''}`}>
                    {format(new Date(token.expires_at), 'MMM d, yyyy HH:mm')}
                    {!isExpired && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({formatDistanceToNow(new Date(token.expires_at), { addSuffix: true })})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {token.last_used_at && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-1">
                      {t('remote_kiosk_management.detail_modal.last_used_at')}
                    </div>
                    <div className="text-sm">
                      {format(new Date(token.last_used_at), 'MMM d, yyyy HH:mm')}
                      <span className="text-xs text-gray-500 ml-1">
                        ({formatDistanceToNow(new Date(token.last_used_at), { addSuffix: true })})
                      </span>
                    </div>

                    {token.last_used_latitude && token.last_used_longitude && token.last_used_address && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-emerald-900">{token.last_used_address}</div>
                            <div className="text-xs text-emerald-700 mt-1 font-mono">
                              {token.last_used_latitude.toFixed(6)}, {token.last_used_longitude.toFixed(6)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getGoogleMapsUrl(token.last_used_latitude!, token.last_used_longitude!), '_blank')}
                          className="w-full"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {t('remote_kiosk_management.detail_modal.open_in_maps', { defaultValue: 'Open in Google Maps' })}
                        </Button>
                      </div>
                    )}

                    {token.last_used_ip && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span className="font-mono">{token.last_used_ip}</span>
                      </div>
                    )}

                    {token.last_used_user_agent && (
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <Smartphone className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="break-all">{token.last_used_user_agent}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Creator Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                {t('remote_kiosk_management.detail_modal.creator_info')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">
                  {token.creator?.first_name} {token.creator?.last_name}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-500">
                  {format(new Date(token.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Revocation Information (if revoked) */}
          {token.status === 'revoked' && token.revoked_at && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t('remote_kiosk_management.detail_modal.revocation_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-red-600 mb-1">
                      {t('remote_kiosk_management.detail_modal.revoked_at')}
                    </div>
                    <div className="text-red-800 font-medium">
                      {format(new Date(token.revoked_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  {token.revoker && (
                    <div>
                      <div className="text-xs text-red-600 mb-1">
                        {t('remote_kiosk_management.detail_modal.revoked_by')}
                      </div>
                      <div className="text-red-800 font-medium">
                        {token.revoker.first_name} {token.revoker.last_name}
                      </div>
                    </div>
                  )}
                </div>
                {token.revoke_reason && (
                  <>
                    <Separator className="bg-red-200" />
                    <div>
                      <div className="text-xs text-red-600 mb-1">
                        {t('remote_kiosk_management.detail_modal.revoke_reason')}
                      </div>
                      <div className="text-sm text-red-800 italic">
                        "{token.revoke_reason}"
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {onCopyUrl && (
              <Button variant="outline" onClick={() => onCopyUrl(token)}>
                <Copy className="h-4 w-4 mr-2" />
                {t('remote_kiosk_management.actions.copy_url')}
              </Button>
            )}
            {isActive && onRevoke && (
              <Button variant="outline" onClick={() => onRevoke(token)}>
                <XCircle className="h-4 w-4 mr-2" />
                {t('remote_kiosk_management.actions.revoke')}
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" onClick={() => onDelete(token)}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('remote_kiosk_management.actions.delete')}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="ml-auto">
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
