import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModernVinScanner } from '@/components/scanner/modern/ModernVinScanner';
import { cn } from '@/lib/utils';
import { normalizeVin, VIN_LENGTH } from '@/utils/vinValidation';

interface VinInputWithScannerProps extends React.ComponentProps<typeof Input> {
  onVinScanned?: (vin: string) => void;
  stickerMode?: boolean;
}

export function VinInputWithScanner({
  onVinScanned,
  className,
  stickerMode = false,
  ...props
}: VinInputWithScannerProps) {
  const { t } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);

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

  return (
    <>
      <div className="space-y-2">
        <div className="relative">
          <Input
            {...props}
            onChange={handleInputChange}
            className={cn('pr-10 font-mono tracking-wide uppercase', className)}
            placeholder={t('vin_input.placeholder', 'Enter 17-character VIN')}
            maxLength={VIN_LENGTH}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setScannerOpen(true)}
              aria-label={t('vin_input.scan_vin', 'Scan VIN with camera')}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
