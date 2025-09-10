import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Car, 
  Calendar, 
  DollarSign, 
  FileText, 
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface VinOrderIntegrationProps {
  vin: string;
  className?: string;
}

export function VinOrderIntegration({ vin, className }: VinOrderIntegrationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { decodeVin, loading } = useVinDecoding();
  const [decodingComplete, setDecodingComplete] = useState(false);
  const [decodedVehicle, setDecodedVehicle] = useState<any>(null);

  const handleDecodeVin = async () => {
    try {
      const result = await decodeVin(vin);
      setDecodedVehicle(result);
      setDecodingComplete(true);
    } catch (error) {
      console.error('VIN decoding error:', error);
    }
  };

  const createOrder = (orderType: 'sales' | 'service' | 'recon') => {
    const baseData = {
      vehicle_vin: vin,
      vehicle_year: decodedVehicle?.year,
      vehicle_make: decodedVehicle?.make,
      vehicle_model: decodedVehicle?.model,
      vehicle_info: decodedVehicle ? `${decodedVehicle.year} ${decodedVehicle.make} ${decodedVehicle.model}` : ''
    };

    // Navigate to respective order creation page with pre-filled data
    switch (orderType) {
      case 'sales':
        navigate('/sales', { state: { prefillData: baseData } });
        break;
      case 'service':
        navigate('/service', { state: { prefillData: baseData } });
        break;
      case 'recon':
        navigate('/recon', { state: { prefillData: baseData } });
        break;
    }
  };

  const QuickActionCard = ({ 
    icon, 
    title, 
    description, 
    orderType, 
    color 
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    orderType: 'sales' | 'service' | 'recon';
    color: string;
  }) => {
    const Icon = icon;
    
    return (
      <Card className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]",
        !decodingComplete && "opacity-60 pointer-events-none"
      )}>
        <CardContent 
          className="p-4 text-center"
          onClick={() => createOrder(orderType)}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
            color
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold mb-1 text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
          {decodingComplete && (
            <div className="flex items-center justify-center mt-2">
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* VIN Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {t('vin_integration.vehicle_info')}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {vin}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!decodingComplete ? (
            <div className="text-center py-6">
              <Button 
                onClick={handleDecodeVin}
                disabled={loading}
                className="button-enhanced"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    {t('vin_integration.decoding')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {t('vin_integration.decode_vin')}
                  </div>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t('vin_integration.decode_description')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {decodedVehicle ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{t('vin_integration.year')}</p>
                    <p className="text-lg font-bold text-primary">{decodedVehicle.year}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{t('vin_integration.make')}</p>
                    <p className="text-lg font-bold text-primary">{decodedVehicle.make}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{t('vin_integration.model')}</p>
                    <p className="text-lg font-bold text-primary">{decodedVehicle.model}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('vin_integration.decode_failed')}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {t('vin_integration.create_order')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('vin_integration.create_order_description')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              icon={Car}
              title={t('vin_integration.sales_order')}
              description={t('vin_integration.sales_order_desc')}
              orderType="sales"
              color="bg-primary/10 text-primary"
            />
            <QuickActionCard
              icon={FileText}
              title={t('vin_integration.service_order')}
              description={t('vin_integration.service_order_desc')}
              orderType="service"
              color="bg-secondary/10 text-secondary"
            />
            <QuickActionCard
              icon={Calendar}
              title={t('vin_integration.recon_order')}
              description={t('vin_integration.recon_order_desc')}
              orderType="recon"
              color="bg-accent/10 text-accent"
            />
          </div>
          
          {!decodingComplete && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {t('vin_integration.decode_required')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('vin_integration.decode_required_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}