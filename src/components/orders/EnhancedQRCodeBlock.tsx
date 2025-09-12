import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Copy, 
  RefreshCw, 
  BarChart3, 
  ExternalLink,
  CheckCircle,
  Eye,
  Users
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { shortLinkService, ShortLinkData } from '@/services/shortLinkService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedQRCodeBlockProps {
  orderId: string;
  orderNumber?: string;
  dealerId?: string;
  qrCodeUrl?: string;
  shortLink?: string;
}

// Memoized component to prevent unnecessary re-renders
export const EnhancedQRCodeBlock = React.memo(function EnhancedQRCodeBlock({ 
  orderId, 
  orderNumber, 
  dealerId, 
  qrCodeUrl, 
  shortLink 
}: EnhancedQRCodeBlockProps) {
  const { t } = useTranslation();
  const [qrData, setQrData] = useState<ShortLinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ShortLinkData['analytics']>(null);

  
  // Memoize analytics loading function
  const loadAnalytics = useCallback(async (slug: string) => {
    try {
      const analyticsData = await shortLinkService.getAnalytics(slug);
      setAnalytics(analyticsData);
    } catch (error) {
      console.warn('Failed to load analytics:', error);
    }
  }, []);

  useEffect(() => {
    if (qrCodeUrl && shortLink) {
      // Extract slug from qrCodeUrl or shortLink
      const slug = shortLink?.split('/').pop() || qrCodeUrl?.split('/').pop();
      if (slug) {
        setQrData({ slug, shortUrl: shortLink || qrCodeUrl });
        loadAnalytics(slug);
      }
    }
  }, [qrCodeUrl, shortLink, loadAnalytics]);

  // Memoize QR code generation function
  const generateQRCode = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔗 Generating QR code for order:', orderId);
      
      const linkData = await shortLinkService.createShortLink(
        orderId, 
        orderNumber, 
        dealerId ? parseInt(dealerId) : 5
      );
      setQrData(linkData);
      // Load analytics for the new slug
      if (linkData.slug) {
        loadAnalytics(linkData.slug);
      }
      const { error } = await supabase
        .from('orders') 
        .update({
          short_link: linkData.shortUrl,
          qr_code_url: linkData.qrCodeUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(t('order_detail.short_link_created'));
      
    } catch (error) {
      console.error('❌ QR generation failed:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [orderId, orderNumber, dealerId, loadAnalytics, t]);

  // Memoize QR regeneration function
  const regenerateQR = useCallback(async () => {
    if (!qrData?.slug) return;
    
    setLoading(true);
    try {
      const newLinkData = await shortLinkService.regenerateShortLink(orderId, qrData.slug);
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

      if (error) throw error;
      
      toast.success(t('order_detail.regenerate_qr'));
      
    } catch (error) {
      console.error('❌ QR regeneration failed:', error);
      toast.error('Failed to regenerate QR code');
    } finally {
      setLoading(false);
    }
  }, [orderId, qrData?.slug, t]);

  // Memoize copy link function
  const copyLink = useCallback(async () => {
    if (!qrData?.shortUrl) return;
    
    const success = await shortLinkService.copyToClipboard(qrData.shortUrl);
    if (success) {
      toast.success(t('order_detail.copy_link'));
    } else {
      toast.error('Failed to copy link');
    }
  }, [qrData?.shortUrl, t]);

  // Memoize QR URL calculation
  const qrUrl = useMemo(() => {
    return qrData?.shortUrl || (qrData?.slug ? `https://mda.to/${qrData.slug}` : '');
  }, [qrData?.shortUrl, qrData?.slug]);

  // Memoize analytics display formatting
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
        <QrCode className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">{t('orders.qr_code')} & {t('orders.short_link')}</h3>
      </div>

      {qrData ? (
        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="bg-white p-6 rounded-lg border text-center shadow-md">
            <div className="w-40 h-40 bg-gray-50 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-sm">
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
              Scan for Quick Access
            </p>
          </div>

          {/* Short Link */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Short Link:</span>
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
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Analytics */}
          {formattedAnalytics && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('order_detail.qr_analytics')}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-background/50 p-2 rounded">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground">{t('order_detail.total_scans')}</span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formattedAnalytics.totalClicks}
                  </p>
                </div>
                
                <div className="bg-background/50 p-2 rounded">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-3 w-3 text-secondary" />
                    <span className="text-xs text-muted-foreground">{t('order_detail.unique_visitors')}</span>
                  </div>
                  <p className="text-lg font-bold text-secondary">
                    {formattedAnalytics.uniqueVisitors}
                  </p>
                </div>
              </div>
              
              {formattedAnalytics.lastClickedFormatted && (
                <p className="text-xs text-muted-foreground text-center">
                  Last accessed: {formattedAnalytics.lastClickedFormatted}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateQR}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Regenerate
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {t('orders.no_qr_code')}
          </p>
          <Button
            onClick={generateQRCode}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                {t('orders.generate_qr')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});