import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { VehicleSearchInput } from '@/components/ui/vehicle-search-input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Car, Zap, X, Image as ImageIcon } from 'lucide-react';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';

interface VehicleAutoPopulationFieldProps {
  dealerId?: number;
  onVehicleSelect?: (result: VehicleSearchResult) => void;
  onVehicleClear?: () => void;
  selectedVehicle?: VehicleSearchResult | null;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const VehicleAutoPopulationField: React.FC<VehicleAutoPopulationFieldProps> = ({
  dealerId,
  onVehicleSelect,
  onVehicleClear,
  selectedVehicle,
  label,
  placeholder,
  className = ''
}) => {
  const { t } = useTranslation();
  const [resetKey, setResetKey] = React.useState(0);
  const [expandedImage, setExpandedImage] = React.useState<string | null>(null);

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    if (onVehicleSelect) {
      onVehicleSelect(result);
    }
  };

  const handleClear = () => {
    setResetKey(prev => prev + 1); // Force re-render of search input
    if (onVehicleClear) {
      onVehicleClear();
    }
  };

  // Reset search input when vehicle is cleared externally
  React.useEffect(() => {
    if (!selectedVehicle) {
      setResetKey(prev => prev + 1);
    }
  }, [selectedVehicle]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'inventory': return <Car className="h-4 w-4 text-green-600" />;
      case 'vin_api': return <Zap className="h-4 w-4 text-indigo-500" />;
      default: return null;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'inventory': return t('stock.autopop.localInventory');
      case 'vin_api': return t('stock.autopop.vinDecoded');
      default: return '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label !== '' && <Label>{label || t('stock.autopop.searchVehicle')}</Label>}

      <VehicleSearchInput
        key={resetKey}
        dealerId={dealerId}
        onVehicleSelect={handleVehicleSelect}
        placeholder={placeholder}
        className="w-full"
      />

      {selectedVehicle && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Vehicle Thumbnail */}
              {selectedVehicle.data.imageUrl ? (
                <div
                  className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border bg-background cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setExpandedImage(selectedVehicle.data.imageUrl!)}
                >
                  <img
                    src={selectedVehicle.data.imageUrl}
                    alt={selectedVehicle.preview?.title || 'Vehicle'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-muted">
                          <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              {/* Vehicle Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getSourceIcon(selectedVehicle.source)}
                  <span className="font-medium">
                    {selectedVehicle.preview?.title}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {getSourceLabel(selectedVehicle.source)}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-6 w-6 p-0 ml-auto hover:bg-destructive/10"
                    title={t('common.clear', 'Clear')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {selectedVehicle.preview?.subtitle && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedVehicle.preview.subtitle}
                  </p>
                )}

                <div className="text-sm">
                  {selectedVehicle.data.vin && (
                    <div className="mb-2">
                      <span className="font-medium">VIN:</span> <span className="font-mono text-xs">{selectedVehicle.data.vin}</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={selectedVehicle.confidence === 'high' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {t(`stock.autopop.confidence.${selectedVehicle.confidence}`)}
                  </Badge>

                  {selectedVehicle.preview?.badge && (
                    <Badge
                      variant={selectedVehicle.preview.badgeVariant || 'secondary'}
                      className="text-xs"
                    >
                      {selectedVehicle.preview.badge}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Expansion Modal */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0" aria-describedby="vehicle-image-preview">
          <div className="relative">
            <span id="vehicle-image-preview" className="sr-only">
              {t('stock.vehicle_image', 'Vehicle image preview')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </Button>
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Vehicle"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};