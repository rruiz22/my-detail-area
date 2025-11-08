import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  QrCode, 
  History, 
  BarChart3, 
  Zap, 
  Settings, 
  Target,
  Camera,
  Upload,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { ModernVinScanner } from './modern/ModernVinScanner';
import { VinScannerHistory } from './analytics/VinScannerHistory';
import { ScannerAnalytics } from './analytics/ScannerAnalytics';
import { VinStatistics } from './enhanced/VinStatistics';
import { VinHistory } from './enhanced/VinHistory';
import { VinAnalyzer } from './enhanced/VinAnalyzer';
import { QuickScanMode } from './QuickScanMode';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { VinOrderIntegration } from './VinOrderIntegration';
import { SmartFocusVinScanner } from './enhanced/SmartFocusVinScanner';
import { BatchVinProcessor } from './enhanced/BatchVinProcessor';
import { VinScannerSettings } from './enhanced/VinScannerSettings';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface VinScannerHubProps {
  className?: string;
  onVinSelected?: (vin: string) => void;
}

export function VinScannerHub({ className, onVinSelected }: VinScannerHubProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedVin, setSelectedVin] = useState('');
  const [activeTab, setActiveTab] = useState('scanner');

  const handleVinDetected = (vin: string, confidence?: number) => {
    setSelectedVin(vin);
    setScannerOpen(false);
    onVinSelected?.(vin);
    
    toast({
      title: t('vin_scanner_hub.vin_detected_success'),
      description: `VIN: ${vin} • ${t('vin_scanner_hub.confidence')}: ${confidence ? (confidence * 100).toFixed(1) : 'N/A'}%`
    });
  };

  const QuickActions = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <CardContent 
          className="p-6 text-center"
          onClick={() => setScannerOpen(true)}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">{t('vin_scanner_hub.scan_camera')}</h3>
          <p className="text-sm text-muted-foreground">{t('vin_scanner_hub.scan_camera_desc')}</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <CardContent 
          className="p-6 text-center"
          onClick={() => setScannerOpen(true)}
        >
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="font-semibold mb-1">{t('vin_scanner_hub.upload_image')}</h3>
          <p className="text-sm text-muted-foreground">{t('vin_scanner_hub.upload_image_desc')}</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <CardContent 
          className="p-6 text-center"
          onClick={() => setActiveTab('quick')}
        >
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <h3 className="font-semibold mb-1">{t('vin_scanner_hub.quick_mode')}</h3>
          <p className="text-sm text-muted-foreground">{t('vin_scanner_hub.quick_mode_desc')}</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <CardContent 
          className="p-6 text-center"
          onClick={() => setActiveTab('analytics')}
        >
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold mb-1">{t('vin_scanner_hub.analytics')}</h3>
          <p className="text-sm text-muted-foreground">{t('vin_scanner_hub.analytics_desc')}</p>
        </CardContent>
      </Card>
    </div>
  );

  const ResponsiveIndicator = () => {
    const getDeviceIcon = () => {
      const width = window.innerWidth;
      if (width < 768) return <Smartphone className="w-4 h-4" />;
      if (width < 1024) return <Tablet className="w-4 h-4" />;
      return <Monitor className="w-4 h-4" />;
    };

    const getDeviceLabel = () => {
      const width = window.innerWidth;
      if (width < 768) return t('vin_scanner_hub.mobile_optimized');
      if (width < 1024) return t('vin_scanner_hub.tablet_optimized');
      return t('vin_scanner_hub.desktop_optimized');
    };

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {getDeviceIcon()}
        <span>{getDeviceLabel()}</span>
      </div>
    );
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">{t('vin_scanner_hub.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('vin_scanner_hub.subtitle')}
                  </p>
                </div>
              </div>
              <ResponsiveIndicator />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {t('vin_scanner_hub.ai_powered')}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {t('vin_scanner_hub.multi_engine')}
              </Badge>
            </div>
          </div>

          {/* VIN Input */}
          <div className="pt-4">
            <label className="text-sm font-medium mb-2 block">
              {t('vin_scanner_hub.manual_input_label')}
            </label>
            <VinInputWithScanner
              value={selectedVin}
              onChange={(e) => setSelectedVin(e.target.value)}
              onVinScanned={handleVinDetected}
              placeholder={t('vin_scanner_hub.manual_input_placeholder')}
              className="max-w-md"
            />
            {selectedVin && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('vin_scanner_hub.current_vin')}: <code className="bg-muted px-1 rounded">{selectedVin}</code>
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <QuickActions />
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vin_scanner_hub.scanner')}</span>
            <span className="sm:hidden">{t('vin_scanner_hub.scan')}</span>
          </TabsTrigger>
          <TabsTrigger value="smart" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vin_scanner_hub.smart_focus')}</span>
            <span className="sm:hidden">{t('vin_scanner_hub.smart')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">NEW</Badge>
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vin_scanner_hub.batch_processing')}</span>
            <span className="sm:hidden">{t('vin_scanner_hub.batch')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">NEW</Badge>
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vin_scanner_hub.quick_mode')}</span>
            <span className="sm:hidden">{t('vin_scanner_hub.quick')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vin_scanner_hub.history')}</span>
            <span className="sm:hidden">{t('vin_scanner_hub.hist')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vin_scanner_hub.settings')}</span>
            <span className="sm:hidden">{t('vin_scanner_hub.config')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">NEW</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    {t('vin_scanner_hub.advanced_scanner')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                      <Camera className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">{t('vin_scanner_hub.ready_to_scan')}</h3>
                    <p className="text-muted-foreground">
                      {t('vin_scanner_hub.scanner_description')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => setScannerOpen(true)} size="lg" className="button-enhanced">
                        <Camera className="w-5 h-5 mr-2" />
                        {t('vin_scanner_hub.start_scanning')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {selectedVin && (
              <div className="xl:col-span-1 space-y-6">
                <VinAnalyzer vin={selectedVin} />
                <VinOrderIntegration vin={selectedVin} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quick" className="space-y-6">
          <div className="flex justify-center">
            <QuickScanMode 
              onVinDetected={handleVinDetected}
              className="w-full max-w-2xl"
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <VinScannerHistory />
        </TabsContent>

        <TabsContent value="smart" className="space-y-6">
          <div className="text-center">
            <Button
              onClick={() => setScannerOpen(true)}
              size="lg"
              className="button-enhanced"
            >
              <Target className="w-5 h-5 mr-2" />
              {t('vin_scanner_hub.start_smart_scan')}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {t('vin_scanner_hub.smart_scan_description')}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          <BatchVinProcessor
            onVinsProcessed={(results) => {
              console.log('Batch processing completed:', results);
              const totalVins = results.reduce((sum, r) => sum + r.validVins.length, 0);
              toast({ description: `${totalVins} VINs processed successfully` });
            }}
          />
        </TabsContent>

        <TabsContent value="quick" className="space-y-6">
          <div className="flex justify-center">
            <QuickScanMode
              onVinDetected={handleVinDetected}
              className="w-full max-w-2xl"
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <VinScannerHistory />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <VinStatistics />
            <VinHistory onVinSelect={setSelectedVin} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <VinScannerSettings />
        </TabsContent>
      </Tabs>

      {/* Smart Focus VIN Scanner Modal */}
      <SmartFocusVinScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onVinDetected={handleVinDetected}
        autoFocus={true}
        showTargetingGuides={true}
      />
    </div>
  );
}