import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QrCode, Copy, Download, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOrderActions } from '@/hooks/useOrderActions';

interface QRCodeDisplayProps {
  orderId: string;
  orderNumber: string;
  dealerId: number;
  qrCodeUrl?: string;
  shortLink?: string;
  onUpdate?: (qrCodeUrl: string, shortLink: string) => void;
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

  const handleGenerateQR = async () => {
    const result = await generateQR(orderId, orderNumber, dealerId);
    if (result.qrCodeUrl && result.shortLink) {
      setCurrentQRUrl(result.qrCodeUrl);
      setCurrentShortLink(result.shortLink);
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
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          <h3 className="font-semibold">{t('orders.qr_code')}</h3>
        </div>

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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadQR}
                className="flex-1"
              >
                <Download className="w-3 h-3 mr-1" />
                {t('common.download')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={shareQR}
                className="flex-1"
              >
                <Share2 className="w-3 h-3 mr-1" />
                {t('common.share')}
              </Button>
            </div>
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
              onClick={handleGenerateQR}
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