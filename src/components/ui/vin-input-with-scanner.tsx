import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModernVinScanner } from '@/components/scanner/modern/ModernVinScanner';
import { cn } from '@/lib/utils';

interface VinInputWithScannerProps extends React.ComponentProps<typeof Input> {
  onVinScanned?: (vin: string) => void;
  stickerMode?: boolean;
}

const VIN_LENGTH = 17;

const normalizeVin = (raw: string) =>
  raw
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .replace(/[IOQ]/g, '')
    .slice(0, VIN_LENGTH);

export function VinInputWithScanner({
  onVinScanned,
  className,
  stickerMode = false,
  ...props
}: VinInputWithScannerProps) {
  const { t } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  const triggerChange = (value: string) => {
    props.onChange?.({
      target: {
        value,
        name: props.name ?? 'vehicleVin'
      }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const propagateVin = (vin: string) => {
    const normalized = normalizeVin(vin);
    triggerChange(normalized);
    onVinScanned?.(normalized);
  };

  const handleVinDetected = (vin: string) => {
    propagateVin(vin);
    setScannerOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeVin(event.target.value);
    triggerChange(normalized);
  };

  const handlePasteFromClipboard = async () => {
    setClipboardError(null);

    if (!navigator?.clipboard?.readText) {
      setClipboardError(t('vin_input.clipboard_unsupported', 'Clipboard access is not available in this browser.'));
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const normalized = normalizeVin(text);

      if (normalized.length !== VIN_LENGTH) {
        setClipboardError(t('vin_input.clipboard_no_vin', 'No complete VIN was found in your clipboard.'));
        return;
      }

      propagateVin(normalized);
    } catch (error) {
      console.error('Clipboard error while pasting VIN:', error);
      setClipboardError(t('vin_input.clipboard_error', 'Unable to read from clipboard.'));
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="relative">
          <Input
            {...props}
            onChange={handleInputChange}
            className={cn('pr-24 font-mono tracking-wide uppercase', className)}
            placeholder={t('vin_input.placeholder', 'Enter 17-character VIN')}
            maxLength={VIN_LENGTH}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={handlePasteFromClipboard}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="ml-1 hidden sm:inline">{t('vin_input.paste_button', 'Paste VIN')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setClipboardError(null);
                setScannerOpen(true);
              }}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {clipboardError && (
          <p className="text-xs text-destructive">{clipboardError}</p>
        )}
      </div>

      <ModernVinScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onVinDetected={handleVinDetected}
        stickerMode={stickerMode}
      />
    </>
  );
}
