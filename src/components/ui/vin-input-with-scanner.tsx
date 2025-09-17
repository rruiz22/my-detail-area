import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModernVinScanner } from '@/components/scanner/modern/ModernVinScanner';
import { cn } from '@/lib/utils';

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

  const handleVinDetected = (vin: string) => {
    // Update the input value
    if (props.onChange) {
      const event = {
        target: { value: vin, name: props.name }
      } as React.ChangeEvent<HTMLInputElement>;
      props.onChange(event);
    }
    
    // Call the callback if provided
    onVinScanned?.(vin);
  };

  return (
    <>
      <div className="relative">
        <Input
          {...props}
          className={cn("pr-12", className)}
          placeholder={t('vin_scanner_errors.vin_input_placeholder')}
          maxLength={17}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          onClick={() => setScannerOpen(true)}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </div>

      <ModernVinScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onVinDetected={handleVinDetected}
      />
    </>
  );
}