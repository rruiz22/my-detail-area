import { VinScannerHub } from '@/components/scanner/VinScannerHub';
import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react';

export default function VinScanner() {
  const { t } = useTranslation();

  const handleVinSelected = (vin: string) => {
    console.log('VIN selected:', vin);
    // Here you could navigate to order creation with the VIN pre-filled
    // or trigger any other action needed
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('vin_scanner_hub.title', 'VIN Scanner')}
              </h1>
              <p className="text-muted-foreground">
                {t('vin_scanner_hub.subtitle', 'Advanced VIN scanning and management')}
              </p>
            </div>
          </div>
        </div>

        <VinScannerHub 
          onVinSelected={handleVinSelected}
          className="w-full"
        />
    </div>
  );
}