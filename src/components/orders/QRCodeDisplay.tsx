import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Download, Share2, RefreshCw, BarChart3, Eye, MousePointer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOrderActions } from '@/hooks/useOrderActions';
import { supabase } from '@/integrations/supabase/client';

interface QRCodeDisplayProps {
  orderId: string;
  orderNumber: string;
  dealerId: number;
  qrCodeUrl?: string;
  shortLink?: string;
  onUpdate?: (qrCodeUrl: string, shortLink: string) => void;
}

interface LinkAnalytics {
  linkId: string;
  slug: string;
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt: string | null;
}

export function QRCodeDisplay({ 
  orderId, 
  orderNumber, 
  dealerId, 
  qrCodeUrl, 
  shortLink, 
  onUpdate 
}: QRCodeDisplayProps) {
  const { t } = useTranslation();
  const { generateQR, loading } = useOrderActions();
  const [currentQRUrl, setCurrentQRUrl] = useState(qrCodeUrl);
  const [currentShortLink, setCurrentShortLink] = useState(shortLink);
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load analytics on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!orderId) return;

      try {
        const { data } = await supabase
          .from('sales_order_links')
          .select('id, slug, total_clicks, unique_clicks, last_clicked_at')
          .eq('order_id', orderId)
          .eq('is_active', true)
          .single();

        if (data) {
          setAnalytics({
            linkId: data.id,
            slug: data.slug,
            totalClicks: data.total_clicks,
            uniqueClicks: data.unique_clicks,
            lastClickedAt: data.last_clicked_at,
          });
        }
      } catch (error) {
        console.log('No analytics data found or error loading:', error);
      }
    };

    loadAnalytics();
  }, [orderId]);

  const handleGenerateQR = async (regenerate = false) => {
    const result = await generateQR(orderId, orderNumber, dealerId, regenerate);
    if (result.qrCodeUrl && result.shortLink) {
      setCurrentQRUrl(result.qrCodeUrl);
      setCurrentShortLink(result.shortLink);
      
      // Update analytics if returned
      if (result.analytics) {
        setAnalytics({
          linkId: result.linkId || '',
          slug: result.slug || '',
          totalClicks: result.analytics.totalClicks,
          uniqueClicks: result.analytics.uniqueClicks,
          lastClickedAt: result.analytics.lastClickedAt,
        });
      }
      
      onUpdate?.(result.qrCodeUrl, result.shortLink);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copied_to_clipboard'));
    } catch (error) {
      toast.error(t('common.error_copying'));
    }
  };

  const downloadQR = () => {
    if (!currentQRUrl) return;
    
    const link = document.createElement('a');
    link.href = currentQRUrl;
    link.download = `QR-${orderNumber}.png`;
    link.click();
  };

  const shareQR = async () => {
    if (!currentShortLink) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order ${orderNumber}`,
          text: `View order details`,
          url: currentShortLink,
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      copyToClipboard(currentShortLink);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            <h3 className="font-semibold">{t('orders.qr_code')}</h3>
          </div>
          
          {analytics && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Analytics Panel */}
        {showAnalytics && analytics && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {t('orders.analytics')}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1">
                <MousePointer className="w-3 h-3 text-blue-500" />
                <span className="text-muted-foreground">{t('orders.total_clicks')}:</span>
                <Badge variant="secondary" className="text-xs">
                  {analytics.totalClicks}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-green-500" />
                <span className="text-muted-foreground">{t('orders.unique_clicks')}:</span>
                <Badge variant="secondary" className="text-xs">
                  {analytics.uniqueClicks}
                </Badge>
              </div>
            </div>
            {analytics.lastClickedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('orders.last_clicked')}: {new Date(analytics.lastClickedAt).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('orders.short_code')}: <code className="font-mono">{analytics.slug}</code>
            </p>
          </div>
        )}

        {currentQRUrl ? (
          <div className="space-y-3">
            {/* QR Code Image */}
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img 
                src={currentQRUrl} 
                alt={`QR Code for order ${orderNumber}`}
                className="w-32 h-32"
              />
            </div>

            {/* Short Link */}
            {currentShortLink && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('orders.short_link')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-background px-2 py-1 rounded">
                    {currentShortLink}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(currentShortLink)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadQR}
              >
                <Download className="w-3 h-3 mr-1" />
                {t('common.download')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={shareQR}
              >
                <Share2 className="w-3 h-3 mr-1" />
                {t('common.share')}
              </Button>
            </div>

            {/* Regenerate Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleGenerateQR(true)}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {loading ? t('common.regenerating') : t('orders.regenerate_qr')}
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="p-8 border-2 border-dashed border-muted rounded-lg">
              <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('orders.no_qr_code')}
              </p>
            </div>
            <Button
              onClick={() => handleGenerateQR(false)}
              disabled={loading}
              className="w-full"
            >
              {loading ? t('common.generating') : t('orders.generate_qr')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}