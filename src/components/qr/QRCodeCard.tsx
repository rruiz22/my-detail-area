import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeCardProps {
  value: string;
  size?: number;
  caption?: string;
  showCopy?: boolean;
}

export function QRCodeCard({ value, size = 128, caption = 'QR Code for quick access', showCopy = true }: QRCodeCardProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ description: 'Link copied' });
    } catch (e) {
      toast({ variant: 'destructive', description: 'Failed to copy link' });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border text-center">
      <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
        <QRCodeCanvas value={value} size={size} includeMargin />
      </div>
      <p className="text-xs text-muted-foreground mb-2">{caption}</p>
      {showCopy && (
        <Button variant="outline" size="sm" onClick={handleCopy} className="inline-flex items-center gap-2">
          <Copy className="h-3 w-3" />
          Copy Link
        </Button>
      )}
    </div>
  );
}
