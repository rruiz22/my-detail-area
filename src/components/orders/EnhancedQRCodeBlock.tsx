import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ShortLinkData, shortLinkService } from '@/services/shortLinkService';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertCircle,
    Copy,
    ExternalLink,
    QrCode,
    RefreshCw,
    X
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface EnhancedQRCodeBlockProps {
  orderId: string;
  orderNumber?: string;
  dealerId?: string;
  qrCodeUrl?: string;
  shortLink?: string;
  qrGenerationStatus?: 'pending' | 'generating' | 'completed' | 'failed';
}

// Memoized component to prevent unnecessary re-renders
export const EnhancedQRCodeBlock = React.memo(function EnhancedQRCodeBlock({
  orderId,
  orderNumber,
  dealerId,
  qrCodeUrl,
  shortLink,
  qrGenerationStatus = 'pending'
}: EnhancedQRCodeBlockProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [qrData, setQrData] = useState<ShortLinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ShortLinkData['analytics']>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const isMountedRef = useRef(true);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Simplified analytics loading - just set to zero to avoid console errors
  const loadAnalytics = useCallback(async (slug: string) => {
    if (!isMountedRef.current) return;

    // Set dummy analytics to prevent errors
    setAnalytics({
      totalClicks: 0,
      uniqueVisitors: 0,
      lastClicked: null
    });
    setError(null);
  }, []);

  // Initialize QR data when shortLink changes (no analytics to prevent errors)
  useEffect(() => {
    if (!shortLink) return;

    const slug = shortLink.split('/').pop();
    if (slug && isMountedRef.current) {
      setQrData({ slug, shortUrl: shortLink });
      // Set dummy analytics immediately
      setAnalytics({
        totalClicks: 0,
        uniqueVisitors: 0,
        lastClicked: null
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('📦 QR initialized:', { slug, shortUrl: shortLink });
      }
    }
  }, [shortLink]);

  // Memoize QR code generation function
  const generateQRCode = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const linkData = await shortLinkService.createShortLink(
        orderId,
        orderNumber,
        dealerId ? parseInt(dealerId) : 5
      );

      if (isMountedRef.current) {
        setQrData(linkData);
        if (linkData.slug) {
          loadAnalytics(linkData.slug);
        }

        // Update order record
        const { error } = await supabase
          .from('orders')
          .update({
            short_link: linkData.shortUrl,
            qr_code_url: linkData.qrCodeUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error && process.env.NODE_ENV === 'development') {
          console.error('Failed to update order:', error);
        }

        toast({ description: t('order_detail.short_link_created', 'QR code generated successfully') });
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to generate QR code');
        toast({ variant: 'destructive', description: t('order_detail.qr_generation_failed', 'Failed to generate QR code') });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderId, orderNumber, dealerId, loadAnalytics, t]);

  // Memoize QR regeneration function
  const regenerateQR = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const newLinkData = await shortLinkService.regenerateShortLink(
        orderId,
        qrData?.slug || orderNumber,
        dealerId ? parseInt(dealerId) : 5
      );

      if (isMountedRef.current) {
        setQrData(newLinkData);

        // Update order record
        const { error } = await supabase
          .from('orders')
          .update({
            short_link: newLinkData.shortUrl,
            qr_code_url: newLinkData.qrCodeUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error && process.env.NODE_ENV === 'development') {
          console.error('Failed to update order:', error);
        }

        toast({ description: t('order_detail.regenerate_qr', 'QR code regenerated successfully') });
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to regenerate QR code');
        toast({ variant: 'destructive', description: t('order_detail.qr_regeneration_failed', 'Failed to regenerate QR code') });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderId, qrData?.slug, orderNumber, dealerId, t]);

  // Memoize copy link function
  const copyLink = useCallback(async () => {
    const urlToCopy = qrData?.shortUrl || shortLink;
    if (!urlToCopy) return;

    const success = await shortLinkService.copyToClipboard(urlToCopy);
    if (success && isMountedRef.current) {
      toast({ description: t('order_detail.copy_link', 'Link copied to clipboard') });
    } else if (isMountedRef.current) {
      toast({ variant: 'destructive', description: t('order_detail.copy_failed', 'Failed to copy link') });
    }
  }, [qrData?.shortUrl, shortLink, t]);

  // Memoize QR URL calculation - prioritize local state for regeneration
  const qrUrl = useMemo(() => {
    return qrData?.shortUrl || shortLink || '';
  }, [qrData?.shortUrl, shortLink]);

  // Memoize analytics display formatting (keep for system, don't display)
  const formattedAnalytics = useMemo(() => {
    if (!analytics) return null;

    return {
      totalClicks: analytics.totalClicks || 0,
      uniqueVisitors: analytics.uniqueVisitors || 0,
      lastClickedFormatted: analytics.lastClicked ?
        new Date(analytics.lastClicked).toLocaleDateString() : null
    };
  }, [analytics]);

  // ✅ Check if user can regenerate QR (only system_admin and supermanager)
  const canRegenerateQR = useMemo(() => {
    if (!user?.role) return false;
    const userRole = user.role;
    // Only allow regenerate for system_admin and supermanager
    return userRole === 'system_admin' || userRole === 'supermanager';
  }, [user]);

  return (
    <div className="bg-gradient-to-br from-background to-muted/20 p-4 sm:p-5 rounded-xl border border-border/60 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <QrCode className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-bold text-base">{t('orders.qr_code', 'QR Code')} & {t('orders.short_link', 'Short Link')}</h3>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-4 px-3 rounded-xl bg-red-50 border-2 border-red-200">
          <div className="p-2 rounded-lg bg-red-100 inline-block mb-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-sm font-medium text-red-700 mb-4">{error}</p>
          <Button
            onClick={generateQRCode}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('orders.retrying', 'Retrying...')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('orders.try_again', 'Try Again')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Render based on QR generation status */}
      {!error && (() => {
        // Case 1: QR generation is in progress
        if (qrGenerationStatus === 'generating' || loading) {
          return (
            <div className="text-center py-8 px-4 rounded-xl bg-blue-50 border-2 border-blue-200">
              <div className="p-3 rounded-lg bg-blue-100 inline-block mb-3">
                <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
              <p className="text-sm font-bold text-blue-900 mb-2">
                {t('orders.qr_generating', 'Generating QR code...')}
              </p>
              <p className="text-xs text-blue-700">
                {t('orders.qr_generating_desc', 'Please wait while we create your QR code')}
              </p>
            </div>
          );
        }

        // Case 2: QR generation failed - show retry option
        if (qrGenerationStatus === 'failed') {
          return (
            <div className="text-center py-6 px-4 rounded-xl bg-red-50 border-2 border-red-200">
              <div className="p-3 rounded-lg bg-red-100 inline-block mb-3">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <p className="text-sm font-bold text-red-900 mb-2">
                {t('orders.qr_generation_failed', 'QR code generation failed')}
              </p>
              <p className="text-xs text-red-700 mb-4">
                {t('orders.qr_retry_desc', 'Click below to try generating the QR code again')}
              </p>
              <Button
                onClick={generateQRCode}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('orders.retry_qr_generation', 'Retry Generation')}
              </Button>
            </div>
          );
        }

        // Case 3: QR exists - show QR code and controls
        if (qrUrl) {
          return (
            <>
              <div className="space-y-4">
                {/* QR Code Display - ✅ CLICKABLE */}
                <div className="bg-white p-4 sm:p-6 rounded-xl border-2 border-border/60 text-center shadow-md">
                  <div
                    className="w-36 h-36 sm:w-40 sm:h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg ring-4 ring-primary/10 cursor-pointer hover:ring-primary/20 transition-all hover:scale-105"
                    onClick={() => setShowQRModal(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowQRModal(true);
                      }
                    }}
                    aria-label={t('orders.view_qr_enlarged', 'Click to view QR code enlarged')}
                  >
                    {qrUrl ? (
                      <QRCodeCanvas
                        value={qrUrl}
                        size={140}
                        level="M"
                        includeMargin
                        imageSettings={{
                          src: "/favicon-mda.svg",
                          width: 20,
                          height: 20,
                          excavate: true
                        }}
                      />
                    ) : (
                      <QrCode className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {t('orders.scan_for_quick_access')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('orders.click_to_enlarge', 'Click to enlarge')}
                  </p>
                </div>

              {/* Short Link */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-foreground">{t('orders.short_link', 'Short Link')}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background p-2.5 rounded-lg border border-border/60 font-mono truncate font-medium shadow-sm">
                    {qrUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className="flex-shrink-0 h-9 w-9 p-0 shadow-sm hover:shadow-md transition-shadow"
                    disabled={!qrUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>


              {/* Actions - ✅ ONLY VISIBLE TO NON-USER ROLES */}
              {canRegenerateQR && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateQR}
                    disabled={loading}
                    className="flex-1 font-medium shadow-sm hover:shadow-md transition-shadow"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {t('orders.regenerate_qr', 'Regenerate QR')}
                  </Button>
                </div>
              )}
            </div>

            {/* ✅ QR CODE ENLARGED MODAL */}
            <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
              <DialogContent className="max-w-md p-0 overflow-hidden">
                <div className="relative bg-white p-8">
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQRModal(false)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-center mb-6">
                    {t('orders.qr_code', 'QR Code')}
                  </h2>

                  {/* Enlarged QR Code */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 flex items-center justify-center">
                    <QRCodeCanvas
                      value={qrUrl}
                      size={320}
                      level="M"
                      includeMargin
                      imageSettings={{
                        src: "/favicon-mda.svg",
                        width: 45,
                        height: 45,
                        excavate: true
                      }}
                    />
                  </div>

                  {/* Short Link Display - ✅ CLICKABLE + COPY BUTTON */}
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground text-center">
                      {t('orders.short_link', 'Short Link')}:
                    </p>
                    <div className="flex items-center gap-2">
                      <code
                        className="flex-1 text-xs bg-gray-100 p-3 rounded-lg font-mono text-center break-all cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={copyLink}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            copyLink();
                          }
                        }}
                        title={t('orders.click_to_copy', 'Click to copy')}
                      >
                        {qrUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyLink}
                        className="flex-shrink-0 h-9 w-9 p-0"
                        title={t('orders.copy_link', 'Copy link')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
          );
        }

        // Case 4: No QR code available - show generate option
        return (
          <div className="text-center py-6 px-4 rounded-xl bg-muted/40 border-2 border-dashed border-border">
            <div className="p-3 rounded-lg bg-muted/60 inline-block mb-3">
              <QrCode className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-2">
              {t('orders.no_qr_code', 'No QR code available')}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {t('orders.generate_qr_desc', 'Generate a QR code and short link for this order')}
            </p>
            <Button
              onClick={generateQRCode}
              disabled={loading}
              variant="outline"
              className="w-full font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('orders.generating', 'Generating...')}
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  {t('orders.generate_qr', 'Generate QR Code')}
                </>
              )}
            </Button>
          </div>
        );
      })()}
    </div>
  );
});
