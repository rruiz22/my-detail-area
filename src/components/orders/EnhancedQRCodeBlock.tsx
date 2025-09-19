import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ShortLinkData, shortLinkService } from '@/services/shortLinkService';
import {
  AlertCircle,
  BarChart3,
  Copy,
  ExternalLink,
  Eye,
  QrCode,
  RefreshCw,
  Users
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
  const [qrData, setQrData] = useState<ShortLinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ShortLinkData['analytics']>(null);
  const [error, setError] = useState<string | null>(null);
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

        toast.success(t('order_detail.short_link_created', 'QR code generated successfully'));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to generate QR code');
        toast.error(t('order_detail.qr_generation_failed', 'Failed to generate QR code'));
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

        toast.success(t('order_detail.regenerate_qr', 'QR code regenerated successfully'));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to regenerate QR code');
        toast.error(t('order_detail.qr_regeneration_failed', 'Failed to regenerate QR code'));
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
      toast.success(t('order_detail.copy_link', 'Link copied to clipboard'));
    } else if (isMountedRef.current) {
      toast.error(t('order_detail.copy_failed', 'Failed to copy link'));
    }
  }, [qrData?.shortUrl, shortLink, t]);

  // Memoize QR URL calculation - prioritize shortLink prop
  const qrUrl = useMemo(() => {
    return shortLink || qrData?.shortUrl || '';
  }, [shortLink, qrData?.shortUrl]);

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

  return (
    <div className="bg-muted/30 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-gray-700" />
        <h3 className="font-semibold text-base">{t('orders.qr_code', 'QR Code')} & {t('orders.short_link', 'Short Link')}</h3>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button
            onClick={generateQRCode}
            disabled={loading}
            variant="outline"
            size="sm"
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
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-gray-700 mx-auto mb-3 animate-spin" />
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t('orders.qr_generating', 'Generating QR code...')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('orders.qr_generating_desc', 'Please wait while we create your QR code')}
              </p>
            </div>
          );
        }

        // Case 2: QR generation failed - show retry option
        if (qrGenerationStatus === 'failed') {
          return (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <p className="text-sm text-destructive mb-2">
                {t('orders.qr_generation_failed', 'QR code generation failed')}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
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
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="bg-white p-6 rounded-lg border text-center">
                <div className="w-40 h-40 bg-gray-50 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-lg">
                  {qrUrl ? (
                    <QRCodeCanvas
                      value={qrUrl}
                      size={150}
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
                    <QrCode className="h-20 w-20 text-gray-400" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {t('orders.scan_for_quick_access')}
                </p>
              </div>

              {/* Short Link */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('orders.short_link', 'Short Link')}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded border font-mono truncate">
                    {qrUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className="flex-shrink-0"
                    disabled={!qrUrl}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>


              {/* Actions - Only Regenerate */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateQR}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-2" />
                  )}
                  {t('orders.regenerate_qr', 'Regenerate QR')}
                </Button>
              </div>
            </div>
          );
        }

        // Case 4: No QR code available - show generate option
        return (
          <div className="text-center py-6">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              {t('orders.no_qr_code', 'No QR code available')}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {t('orders.generate_qr_desc', 'Generate a QR code and short link for this order')}
            </p>
            <Button
              onClick={generateQRCode}
              disabled={loading}
              variant="outline"
              className="w-full"
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
